/* Copyright (c) 2010-2011 Ricebridge */

var common  = require('./common')

var util    = common.util
var assert  = common.assert
var uuid    = common.uuid
var _       = common._
var eyes    = common.eyes


//FIX: needs more design work
//var Context = require('./context').Context

var PropMap = require('./propmap').PropMap
var Entity  = require('./entity').Entity
var User    = require('./seneca-user').User


function Seneca(options) {
  var self = this

  var logger = options && options.logger

  var log = function(type) {
    if( logger ) {
      var args = Array.prototype.slice.call(arguments,1)
      args.unshift(new Date())
      args.unshift(type)
      logger.apply(self,args)
    }
  }

  self.log = function(){
    var args = Array.prototype.slice.call(arguments)
    args.unshift('custom')
    log.apply(self,args)
  }

  log('start')


  var entity = (options && options.entity) || Entity.init$('mem')

  entity.logger$(function(){
    var args = Array.prototype.slice.call(arguments)
    args.unshift(entity.$.store$().name)
    args.unshift('entity')
    log.apply(self,args)
  })

  // all optional
  self.make = function(tenant,base,name,props) {
    return entity.make$(tenant,base,name,props)
  }
  self.make$ = self.make


  // FIX: should return a Seneca instance bound to a Context
  // removes need for actcontext function
  /*
  self.context = function(props) {
    var ctxt = new Context(props);
    // set propmap - loaded/cached by seneca
    return ctxt;
  }
  */

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
    log&&log('add',args)
    actionpropmap.add(args,actfunc);
  }
  

  self.act = function(args,cb) {
    args.zone = args.zone || 'action';
    var tag; 
    log && (tag = uuid()) && log('act','in',args.zone,tag,args)
    zone[args.zone](args,function(){
      var err = arguments[0]
      log&&log.apply(self,_.flatten(['act','out',args.zone,tag,err,Array.prototype.slice.call(arguments,1)]))
      cb & cb.apply(self,arguments)
    });
  }

  
  /*
  // should allow same args as self.context
  self.actcontext = function(context) {
    var fn = function(args,cb) {
      args = args || {};
      args.context$ = context;
      self.act(args,cb);
    }
    fn.seneca$ = self;
    return fn;
  }
  */


  self.close = function(cb){
    log('close')
    if( entity ) {
      entity.close$(cb)
    }
  }


  var actionpropmap = new PropMap();

  var zone = {
    entity: function(args) {
      method[args.method](args);
    },
    action: function(args,cb) {
      var actfunc = actionpropmap.find(args);
      //util.debug('actfunc:'+actfunc)
      if( actfunc ) {
        args.seneca$ = self;
        args.entity$ = entity;
        // args.context$ = self. bound context
        actfunc(args,cb);
      }
      else {
        cb(null,{err:'unknown_action'})
      }
    }
  };

  var method = {
    'GET': function(args) {
      var ent = entity.make$( {base$:args.base, name$:args.name, tenant$:args.tenant} );
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


// entity can be null
Seneca.init = function( entity ) {
  var seneca = new Seneca();
  seneca.init(entity);
  return seneca;
}




module.exports = function(entity) {  return new Seneca(entity) }
module.exports.Seneca = Seneca
module.exports.Entity = Entity
module.exports.User   = User


function printlogger() {
  function own(obj){
    if( obj ) {
      var sb = ['{']
      for( var p in obj ) {
        if( obj.hasOwnProperty(p) ) {
          sb.push(p)
          sb.push('=')
          sb.push(obj[p])
          sb.push(',')
        }
      }
      sb.push('}')
      return sb.join('')
    }
    else {
      return null
    }
  }

  var args = Array.prototype.slice.call(arguments)

  var argstrs = []
  args.forEach(function(a){
    argstrs.push(
      null==a?a:
        'string'==typeof(a)?a:
        _.isDate(a)?(a.getTime()%1000000):
        a.hasOwnProperty('toString')?''+a:own(a)
    )
  })
  util.debug( argstrs.join('\t') )
}



/*
opts.logger: logger function
opts.entity: entity object
opts.plugins: plugins list
opts.options: {logger:,entity:,plugins:{<name>:,...}}
*/
module.exports.init = function(opts,cb) {
  if( 'function' != typeof(cb) ) {
    throw 'Seneca.init: no callback'
  }

  var logger = opts.logger
  if( 'print' == logger ) {
    logger = printlogger
  }

  var entity = opts.entity
  if( 'string' == typeof(entity) ) {
    Entity.init$(entity,function(err,entity) {
      if( err ) {
        logger && logger('error',err)
        cb(err)
      }
      else {
        newseneca(entity)
      }
    })
  }
  else {
    newseneca(entity)
  }

  function newseneca(entity) {
    var seneca = new Seneca({
      logger:logger,
      entity:entity,
      plugins:opts.plugins
    })
    
    cb(null,seneca)
  }


}