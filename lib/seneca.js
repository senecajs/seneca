/* Copyright (c) 2010-2012 Richard Rodger */

var common  = require('./common')

var util    = common.util
var assert  = common.assert
var uuid    = common.uuid
var _       = common._
var parambulator = common.parambulator


var eyes    = common.eyes


var PropMap = require('./propmap').PropMap
var Entity  = require('./entity').Entity


// default plugins
var mem_plugin  = require('./plugin/mem')





function noopservice( req, res, next ) {
  next && next()
}


function Seneca($, opts) {
  // $ is a private context

  var self = {
    version: '0.4.0'
  }


  $.plugins    = {}
  $.rolemap    = {}
  $.actpropmap = new PropMap()


  // TODO: parambulator validation of opts



  var log = function(type) {
    var args = Array.prototype.slice.call(arguments,1)
    args.unshift(type)
    args.unshift(new Date())
    opts.log.apply(self,args)
  }


  function paramerr(code){
    return function(cb){
      return function(err){ 
        if(err){
          throw self.fail(err.message,code)
        }
        else if( cb ) { 
          return cb();
        }
      }
    }
  }

  var paramcheck = {
    register: parambulator(
      {type$:'object',required$:['name','init'],string$:['name','role'],function$:['init','service']},
      {topname:'plugin',msgprefix:'register(plugin): ',callback:paramerr('register')}
    )
  }

  self.register = function( plugin ) {
    return paramcheck.register.validate(plugin,function(){
      $.plugins[plugin.name] = plugin

      if( plugin.role ) {
        $.rolemap[plugin.role] = plugin
      }
    })
  }





  self.log = function(){
    var args = Array.prototype.slice.call(arguments)
    log.apply(self,args)
  }


  // full args: msg, meta, cb, cb-args
  // all optional
  self.fail = function( msg, meta, cb ) {
    var argI = 3, isfn = function(x){return _.isFunction(x)&&x} 
    
    var spec = {}
    spec.cb   = isfn(cb) || (argI=2,isfn(meta)) || (argI=1,isfn(msg)) || (argI=Number.MAX_VALUE,null)
    spec.meta = 1==argI || _.isFunction(meta) ? null : meta
    spec.msg  = 'Seneca: ' + (1<argI && msg && !_.isFunction(msg) ? (_.isObject(msg)?JSON.stringify(msg):''+msg) : 'unknown error.')

    //console.log(JSON.stringify(spec)+' '+argI)

    var err = new Error(spec.msg)
    
    // remove self.fail calls from stack history
    err.stack = err.stack.replace(/\s+at Object\..*?\.fail \([^\r\n]*/g,'')


    err.seneca = {}

    if( _.isString(spec.meta) ) {
      err.seneca.code = spec.meta
    }
    else {
      err.seneca = spec.meta || {}
      err.seneca.code = err.seneca.code || 'unknown'
    }

    if( _.isFunction(spec.cb) ) {
      var args = [err].concat(Array.prototype.slice.call(arguments,argI))
      //console.log('cb args '+argI+' '+args+' | '+JSON.stringify(arguments))
      spec.cb.apply(null,args)
    }
    else return err;
  }



  // all optional
  self.make = function() {
    return $.entity.make$.apply(self,arguments)
  }
  self.make$ = self.make



  // allow plugins to inject connect middleware
  // pluginname, opts, callback(err,{req:,res:,next:,...})
  self.service = function( pluginname ) {
    var plugin = $.plugins[pluginname]
    if( !plugin ) {

      // TODO: use proper Error objects
      throw {a:1,err:'plugin_unknown',name:pluginname}
    }
    var args = Array.prototype.slice.call(arguments,1)
    var service = plugin.service.apply(plugin,args) || noopservice
    return service
  }



  // get plugin instance
  // name can be plugin name (checked first) or role name
  self.plugin = function( name ) {

    var plugin = $.plugins[name]
    if( !plugin ) {
      plugin = $.rolemap[name]

      if( !plugin ) {
        throw new Error({a:2,err:'plugin_unknown',name:name})
      }
    }

    return plugin
  }



  // get a plugin's api
  // pluginname can also be a rolename
  self.api = function( name ) {
    var plugin = self.plugin( name )

    // TODO: check for api func
    return plugin.api(self)
  }



  self.add = function(args,actfunc) {
    log&&log('add',args)
    // FIX: should be called previous
    var parent = self.findact(args)
    actfunc.parent = parent
    $.actpropmap.add(args,actfunc);
  }
  

  
  self.findact = function(args) {
    var actfunc = $.actpropmap.find(args)
    return actfunc
  }


  self.act = function(args,cb) {
    var self = this

    var actfunc = self.findact(args)
    if( !actfunc ) {
      cb && cb({err:'act_unknown',args:args})
    }
    else {
      // TODO: not exactly efficient
      //var tag      = uuid().substring(0,6);
      var tag      = common.idgen(6)
      var argsdesc = actfunc.descdata ? actfunc.descdata(args) : descdata(args)
      log('act','in',tag, argsdesc )

      // FIX: this should be called previous$
      args.parent$ = actfunc.parent
      args.tag$    = tag

      try {
        actfunc(args,function(err){
          if( err ) {
            log('act','err',tag,err.message,err,err.stack&&(err.stack+' \n ').split('\n')[1] )
          }
          else {
            var res     = Array.prototype.slice.call(arguments,1)
            var resdesc = actfunc.descdata ? actfunc.descdata(res) : descdata(res)
            //console.log('res='+JSON.stringify(res)+' resdesc='+JSON.stringify(resdesc))
            var resout = _.flatten(['act','out',tag,resdesc], true)
            log.apply(null,resout)
            //console.log('resout='+resout)
          }

          cb.apply(null,arguments)
        })
      }
      catch( ex ) {
        var err = {err:'act_exception',ex:ex,args:args}
        log('act','out',tag,argsdesc,err )
        cb(err)
      }

    }
  }


  self.close = function(cb){
    log('close')
    if( $.entity ) {
      $.entity.close$(cb)
    }
  }



  self.delegate = function() {
    return {
      version: self.version,

      register: common.delegate(self,self.register),
      log: common.delegate(self,self.log),
      make: common.delegate(self,self.make),
      service: common.delegate(self,self.service),
      plugin: common.delegate(self,self.plugin),
      api: common.delegate(self,self.api),
      add: common.delegate(self,self.add),
      act: common.delegate(self,self.act),
      findact: common.delegate(self,self.findact),
      close: common.delegate(self,self.close),
    }
  }


  function descdata(data) {
    if( !_.isObject(data) ) {
      return ''+data
    }
    else if( _.isArray(data) ) {
      var cleandata = []
      for( var i = 0; i < data.length && i < 3; i++ ) {
        cleandata.push(descdata(data[i]))
      }

      if( i < data.length ) {
        cleandata.push(' ...(len='+data.length+')')
      }

      return cleandata
    }
    else {
      var cleandata = {}
      for( var p in data ) {
        if( data.hasOwnProperty(p) && !~p.indexOf('$') && !_.isFunction(data[p]) ) {
          cleandata[p] = descdata(data[p])
        }
      }

      return cleandata
    }
  }


  return self
}




// TODO: support arrays better
function printlogger() {
  function own(obj){
    //console.log('own:'+JSON.stringify(obj))

    if( obj ) {
      var isarr = _.isArray(obj)
      var sb = [ isarr?'[':'{' ]
      for( var p in obj ) {
        if( obj.hasOwnProperty(p) && !~p.indexOf('$') && !_.isFunction(obj[p]) ) {
          
          if( !isarr ) {
            sb.push(p)
            sb.push('=')
          }

          if( _.isObject(obj[p]) ) {
            sb.push(own(obj[p]))
          }
          else {
            sb.push(obj[p])
          }

          sb.push(',')
        }
      }

      if( 1 < sb.length ) {
        sb.pop()
      }

      sb.push( isarr?']':'}' )
      return sb.join('')
    }
    else {
      return null
    }
  }

  var args = Array.prototype.slice.call(arguments)

  var argstrs = []
  args.forEach(function(a){
    //console.log('arga:'+JSON.stringify(a))
    argstrs.push(
      null==a?a:
        'string'==typeof(a)?a:
        _.isDate(a)?(a.getTime()%1000000):
        _.isObject(a)?own(a):a
    )
  })
  console.log( argstrs.join('\t') )
}



// FIX: better error handling - should all go through callback
// TODO: move into Seneca object

/*
opts.logger: logger function
opts.entity: entity object
opts.plugins: plugins list
opts.options: {logger:,entity:,plugins:{<name>:,...}}
*/
module.exports = init


function init(opts,cb) {
  if( 'function' != typeof(cb) ) {
    throw {err:'no_callback'}
  }

  opts.log = opts.log || printlogger

  // private context
  var $ = {}


  //function newseneca(entity) {
  var seneca = new Seneca($,opts)
  seneca.log('init','start')




  initplugins(seneca,function(err){

    // set default plugins
    if( !$.rolemap.entity ) {
      seneca.register( mem_plugin.plugin() )
    }


    var sd = seneca.delegate()
    sd.log = function() {
      var args = ['entity']
      seneca.log.apply(seneca,args.concat(Array.prototype.slice.call(arguments)))
    }

    var entity = $.entity = new Entity(seneca)

    seneca.log('init','end')
    cb(err,seneca)
  })


  function initplugins(seneca,cb) {
    var plugins = opts.plugins || []

    var log = common.delegate(seneca,seneca.log,'init','plugin')

    function loadplugin( pluginname ) {
      log('load',pluginname)
      var plugin = $.plugins[pluginname]

      if( plugin ) {
        log('exists',pluginname)
      }
      else {
        var plugin_module
        var builtin_path = './plugin/'+pluginname

        // try to load as a built-in module
        try {
          log('require',builtin_path)
          plugin_module = require(builtin_path)
        }

        catch(e) {
          console.log(e)

          if( e.message && -1 != e.message.indexOf("'"+builtin_path+"'") ) {

            // try to load as a normal module
            log('require',pluginname)
            plugin_module = require(pluginname)
          }
          else throw e;
        }

        if( plugin_module ) {
          log('create',pluginname)
          plugin = plugin_module.plugin()
        }
        else {
          log('notfound',pluginname)
        }


      }

      return plugin
    }

    function eachplugin(pI) {
      if( pI < plugins.length ) {
        try {
          var pluginname = plugins[pI]
          var pluginopts = {}

          if( 'object' == typeof(pluginname) ) {
            var plugindesc = pluginname
            pluginname = plugindesc.name
            pluginopts = plugindesc.options
          }

          var plugin     = loadplugin( pluginname )
          var pluginrole = plugin.role

          if( plugin ) {
            log('init',pluginname,pluginrole)

            // adjust seneca api to be plugin specific
            var sd = seneca.delegate()
            sd.log = function() {
              var args = ['plugin',pluginname+(pluginrole?'/'+pluginrole:'')]
              args = args.concat(Array.prototype.slice.call(arguments))
              seneca.log.apply(seneca,args)
            }
            sd.fail = function() {
              var args = Array.prototype.slice.call(arguments), cbI = -1
              var cb = _.find(args,function(x){cbI++;return _.isFunction(x)})
              if( cb ) {
                args[cbI] = function(){
                  var errarg = arguments[0]
                  if( errarg && errarg.seneca ) {
                    errarg.seneca.plugin = {name:pluginname,role:pluginrole}
                    errarg.seneca.code = (errarg.seneca.code&&'unknown'!=errarg.seneca.code) || 'plugin'
                  }
                  cb.apply(null,arguments)
                }
              }
              return seneca.fail.apply(seneca,args)
            }


            plugin.init(sd,pluginopts,function(err){
              if( err ) return cb(err);

              log('register',pluginname,pluginrole)
              seneca.register(plugin)

              eachplugin(pI+1)
            })
          }
          else {
            // FIX: proper Error
            cb({a:3,err:'unknown_plugin',pluginname:pluginname})
          }
        }
        catch( e ) {
          console.log(e)
          cb(e)
        }
      }
      else if( pI == plugins.length ) {
        cb(null)
      }
    }
    eachplugin(0)
  }

}



