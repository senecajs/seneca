/* Copyright (c) 2010 Ricebridge */

var common  = require('./common');
var E = common.E;

var sys     = common.sys;
var eyes    = common.eyes;
var assert  = common.assert;

var PropMap = require('./propmap').PropMap;
var Context = require('./context').Context;


function Seneca() {
  var self = this;

  self.init = function(entity) {
    self.entity = entity;
  }
  

  self.context = function(props) {
    var ctxt = new Context(props);
    // set propmap - loaded/cached by seneca
    return ctxt;
  }

  // FIX: include the tenant hostname
  self.router = function(app) {
    app.get('/seneca/1.0/:zone/:tenant/:base/:name/id/:id', function(req,res,next){
      self.act({
        method:'GET',
        tenant:req.params.tenant,
        zone:req.params.zone,
        base:req.params.base,
        name:req.params.name,
        id:req.params.id,
      },
      function( out ) {
        var body = JSON.stringify(out);
        res.writeHead(200, {
          "Content-Type": 'text/json',
          "Content-Length": body.length,
        });
        res.end(body);
      });
    });
  }

  self.add = function(args,actfunc) {
    actionpropmap.add(args,actfunc);
    sys.puts(actionpropmap);
  }
  

  self.act = function(args,cb) {
    args.zone = args.zone || 'action';
    zone[args.zone](args,cb);
  }

  // should allow same args as self.context
  self.actcontext = function(context) {
    var fn = function(args,cb) {
      args = args || {};
      args.context = context;
      self.act(args,cb);
    }
    fn.seneca$ = self;
    return fn;
  }


  var actionpropmap = new PropMap();

  var zone = {
    entity: function(args) {
      method[args.method](args);
    },
    action: function(args,cb) {
      var actfunc = actionpropmap.find(args);
      if( actfunc ) {
        args.seneca$ = self;
        args.entity$ = self.entity;
        actfunc(args,cb);
      }
    }
  };

  var method = {
    'GET': function(args) {
      //eyes.inspect(args,'args');
      var ent = self.entity.make$( {base$:args.base, name$:args.name, tenant$:args.tenant} );
      ent.find$(args.id,function(err,ent){
        var res = {};
        if( err ) { res.err = err; }
        else if( ent ) {
          ent.fields$(function(field,fI){
            res[field] = ent[field];
          });
        }
        args.result( res );
      });
    }
  }

}

Seneca.init = function( entity ) {
  var seneca = new Seneca();
  seneca.init(entity);
  return seneca;
}





exports.Seneca = Seneca;