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
//var User    = require('./seneca-user').User


var core = {}


function Seneca(opts) {
  var self = this

  self.options = (opts && opts.options) || {}


  var logger = opts && opts.logger

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


  var entity = (opts && opts.entity) || Entity.init$('mem')

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
  /*
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
  */

  self.add = function(args,actfunc) {
    log&&log('add',args)
    var parent = self.findact(args)
    actfunc.parent = parent
    actionpropmap.add(args,actfunc);
  }
  
  
  self.findact = function(args) {
    args.zone = args.zone || 'action';
    var actfunc = actionpropmap.find(args)
    //util.debug('findact:'+JSON.stringify(args)+' -> '+(actfunc && actfunc.toString()))
    return actfunc
  }

  self.act = function(args,cb) {
    var actfunc = self.findact(args)
    if( !actfunc ) {
      cb({err:'act_unknown',args:args})
    }
    else {
      var tag; 
      log && (tag = uuid().substring(0,4)) && log('act','in',args.zone,tag,args)

      args.parent$ = actfunc.parent
      actfunc(args,self,function(){
        var err = arguments[0]
        log&&log.apply(self,_.flatten(['act','out',args.zone,tag,err,Array.prototype.slice.call(arguments,1)]))
        cb & cb.apply(self,arguments)
      })
    }
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


  /*
  var zone = {
    //entity: function(args) {
    //  return method[args.method]
    //},
    action: function(args,cb) {
      return actionpropmap.find(args)
    }
  }



    belongs in entity
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
  */
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
//module.exports.User   = User


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


// FIX: better error handling - should all go through callback
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
      options:opts.options
    })

    initplugins(seneca,function(err){
      cb(err,err?null:seneca)
    })
  }


  function initplugins(seneca,cb) {
    var plugins = opts.plugins || []

    function initplugin(pI) {
      if( pI < plugins.length ) {
        try {
          var plugin = plugins[pI]
          if( 'string' == typeof(plugin) ) {
            var pluginname = plugin
            plugin = core.plugins[pluginname]

            if( !plugin ) {
              plugin = require('./seneca-'+pluginname)
              core.plugins[pluginname] = plugin
            }
          }
        }
        catch( e ) {
          cb(e)
        }

        plugin.init(seneca,function(err){
          err ? cb(err) : initplugin(pI+1)
        })
      }
      else {
        cb(null)
      }
    }
    initplugin(0)
  }

}


core.plugins = {}

module.exports.register = function(spec) {
  var name = spec.name
  var impl = spec.impl

  core.plugins[name] = impl
}



