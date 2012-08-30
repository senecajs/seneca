/* Copyright (c) 2010-2012 Richard Rodger */

var common  = require('./common')

var util    = common.util
var assert  = common.assert
var uuid    = common.uuid
var _       = common._
var parambulator = common.parambulator

var arrayify = common.arrayify


var eyes    = common.eyes




var PropMap = require('./propmap').PropMap
var Entity  = require('./entity').Entity


// default plugins
var mem_plugin = require('./plugin/mem')



var msgmap = require('./msgmap')



function noopservice( req, res, next ) {
  next && next()
}


function resolvemsg(meta) {
  var msg = 'unknown error.'

  if( meta.msg ) {
    msg = meta.msg
  }

  else if( meta.message ) {
    msg = meta.message
  }

  else {
    var code = meta.code

    if( code ) {
      var parts = code.split('/')
      var first = msgmap[parts[0]]
      var msg = first ? (_.isString(first) ? first : (first[ parts[1] ] || code ) ) : code
    }
  }

  return msg
}


function descerror( meta, error ) {
  if( error ) {
    meta.error   = error
    meta.message = error.message
    meta.where   = stackfirst(error)
  }
  //else throw new Error('no error')
  return meta
}

function stackfirst( error ) {
  return ( error && error.stack && (error.stack+' \n ').split('\n')[1] ) || ''
}



function Seneca($, opts) {
  // $ is a private context

  var self = {
    version: '0.4.0'
  }


  $.plugins    = {}
  //$.rolemap    = {}
  $.actpropmap = new PropMap()


  // TODO: parambulator validation of opts



  var log = function(type) {
    var args = arrayify(arguments,1)
    args.unshift(type)
    args.unshift(new Date())
    opts.log.apply(self,args)
  }


  function paramerr(code){
    return function(cb){
      return function(err){ 
        if(err){
          throw self.fail({code:code,msg:err.message})
        }
        else if( cb ) { 
          return cb();
        }
      }
    }
  }

  var paramcheck = {
    register: parambulator(
      {type$:'object',required$:['name','init'],string$:['name'/*,'role'*/],function$:['init','service']},
      {topname:'plugin',msgprefix:'register(plugin): ',callbackmaker:paramerr('register')}
    )
  }


  self.register = function( plugin ) {
    return paramcheck.register.validate(plugin,function(){
      $.plugins[plugin.name] = plugin

//      if( plugin.role ) {
//        $.rolemap[plugin.role] = plugin
//      }
    })
  }





  self.log = function(){
    log.apply(self,arrayify(arguments))
  }


  self.fail = function( meta, cb ) {
    var argI = 1
    var code = 'unknown'
    var msg  = 'unknown error.'
    var error
    var err_seneca = {}
    var cbfunc = cb

    if( _.isString(meta) ) {
      code = ''+meta
      msg = resolvemsg({code:code})
      argI = 2
    }
    else if( _.isError(meta) ) {
      code = meta.code || 'unknown'
      msg = meta.message
      error = meta
      argI = 2
    }
    else if( _.isFunction(meta) ) {
      cbfunc = meta
    }
    else if( _.isObject(meta) ) {
      code = meta.code || 'unknown'
      msg = resolvemsg(meta)
      err_seneca = _.extend({},meta)
      argI = 2
    }


    err_seneca.when = new Date().toISOString()
    err_seneca.mark = Math.random()
    err_seneca.code = code
    if( error ) {
      descerror(err_seneca,error)
    }

    delete err_seneca.msg
    delete err_seneca.message

    msg = _.template( msg, _.extend({json$:JSON.stringify},err_seneca) )
    var prefix = "Seneca: "

    msg = ~msg.indexOf(prefix) ? msg : prefix + msg


    var err = new Error(msg)
    err.seneca = err_seneca

    // remove self.fail calls from stack history
    err.stack = err.stack.replace(/\s+at Object\..*?\.fail \([^\r\n]*/g,'')

    var stack = stackfirst(err.seneca.error)
    log('fail',err.seneca.code,err.message,stack )

    if( _.isFunction(cbfunc) ) {
      err.seneca.callback = true
      var cbargs = arrayify(arguments,argI)
      var args = [err].concat(cbargs)
      cbfunc.apply(null,args)
    }
    else {
      err.seneca.callback = false
      return err
    }
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
      throw self.fail({code:'seneca/service_unknown_plugin',pluginname:pluginname})
    }
    var args = arrayify(arguments,1)
    var service = plugin.service.apply(plugin,args) || noopservice
    return service
  }



  // get plugin instance
  self.plugin = function( pluginname, tag ) {
    var key = pluginname+(tag?'~'+tag:'')
    var plugin = $.plugins[key]

    return plugin
  }



  // get a plugin's api
  // // pluginname can also be a rolename
  self.api = function( pluginname ) {
    var plugin = self.plugin( pluginname )

    if( !plugin.api ) {
      throw self.fail({code:'seneca/api_not_found',pluginname:pluginname})
    }

    return plugin.api(self)
  }



  self.add = function(args,actfunc) {
    log('add',args)

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
      self.fail({code:'seneca/act_not_found',args:args},cb)
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
          var args = arrayify(arguments)

          if( err ) {
            log('act','err',tag,err.message,stackfirst(err) )

            if( !err.seneca ) {
              return self.fail(err,cb)
              //err.message = 'Seneca: '+err.message
            }
            else {
              cb.apply(null,args)
            }
          }
          else {
            args[0] = null
            var resdesc = actfunc.descdata ? actfunc.descdata(args.slice(1)) : descdata(args.slice(1))
            var resout = _.flatten(['act','out',tag,resdesc], true)
            log.apply(null,resout)
            //console.log(args)
            cb.apply(null,args)
          }
        })
      }
      catch( error ) {
        //eyes.inspect(error)

        log('act','err',tag, error.message, stackfirst(error) )
        throw self.fail( descerror({code:'seneca/act_error',args:args},error))
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




function printlogger() {
  function own(obj){

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

  var args = arrayify(arguments)

  var argstrs = []
  args.forEach(function(a){
    argstrs.push(
      null==a?a:
        'string'==typeof(a)?a:
        _.isDate(a)?(a.getTime()%1000000):
        _.isObject(a)?own(a):a
    )
  })

  console.log( argstrs.join('\t') )
}



module.exports = init



function init(opts,extcb) {
  if( !_.isObject(opts) ) {
    throw new Error('Seneca: no options for init(opts,cb).')
  }
  if( !_.isFunction(extcb) ) {
    throw new Error('Seneca: no callback for init(opts,cb).')
  }

  opts.log = opts.log || printlogger

  // private context
  var $ = {}


  //function newseneca(entity) {
  var seneca = new Seneca($,opts)
  seneca.log('init','start')


  var log = common.delegate(seneca,seneca.log,'init','plugin')

  initplugins(seneca,function(err){
    if( err ) return cb(err);

    // set default plugins
    //if( !$.rolemap.entity ) {
    if( !seneca.findact({on:'entity',cmd:'save'}) ) {
      var mem = mem_plugin.plugin()
      initplugin( mem.name, mem, {}, finish )
    }
    else {
      finish()
    }

    function finish() {
      var sd = seneca.delegate()
      sd.log = function() {
        var args = ['entity']
        seneca.log.apply(seneca,args.concat(arrayify(arguments)))
      }

      var entity = $.entity = new Entity(sd)

      //console.dir($.plugins)

      try {
        extcb(null,seneca)
        seneca.log('init','end')
      }
      catch( e ) {
        seneca.log('init','err',e.message, stackfirst(e) )
        throw e
      }
    }
  })


  function initplugin(pluginname,plugin,pluginopts,cb) {
    log('init',pluginname,pluginopts)

    // adjust seneca api to be plugin specific
    var sd = seneca.delegate()
    sd.log = function() {
      var args = ['plugin',pluginname+(plugin.tag?'/'+plugin.tag:'')]

      args = args.concat(arrayify(arguments))
      seneca.log.apply(seneca,args)
    }
    sd.fail = function() {
      var args = arrayify(arguments), cbI = -1
      var cb = _.find(args,function(x){cbI++;return _.isFunction(x)})
      if( cb ) {
        args[cbI] = function(){
          var errarg = arguments[0]
          if( errarg && errarg.seneca ) {
            errarg.seneca.plugin = {name:pluginname}//,role:pluginrole}
            errarg.seneca.code   = 'unknown'!=errarg.seneca.code ? errarg.seneca.code : 'plugin'
          }
          cb.apply(null,arguments)
        }
      }
      return seneca.fail.apply(seneca,args)
    }

    plugin.init(sd,pluginopts,function(err){
      if( err ) return cb(err);

      log('register',pluginname,plugin.tag)
      seneca.register(plugin)

      cb()
    })
  }


  function initplugins(seneca,done) {
    var plugins = opts.plugins || []

    function resolveplugin( pluginname, tag ) {
      log('load',pluginname,tag)

      var plugin = seneca.plugin(pluginname,tag)

      if( plugin ) {
        log('exists',pluginname,tag)
      }
      else {
        var plugin_module
        var builtin_path = './plugin/'+pluginname

        // try to load as a built-in module
        try {
          log('require',builtin_path,pluginname,tag)
          plugin_module = require(builtin_path)
        }

        catch(e) {
          if( e.message && -1 != e.message.indexOf("'"+builtin_path+"'") ) {

            // try to load as a normal module
            log('require',pluginname,tag)
            plugin_module = require(pluginname)
          }
          else throw e;
        }

        if( plugin_module ) {
          log('create',pluginname,tag)

          plugin = plugin_module.plugin()
          if( tag ) {
            plugin.tag = tag
          }

          var key = pluginname+(tag?'~'+tag:'')
          $.plugins[key] = plugin
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
            pluginopts = plugindesc.options || plugindesc.opts || plugindesc.opt
          }

          var plugin = resolveplugin( pluginname, pluginopts.tag )
          //var pluginrole = plugin.role

          if( plugin ) {
            initplugin( pluginname, plugin, pluginopts, function(){
              eachplugin(pI+1)
            })
          }
          else {
            seneca.fail({code:'seneca/unknown_plugin',pluginname:pluginname},extcb)
          }
        }
        catch( e ) {
          // bubble out exceptions from external callback
          if( e.seneca && e.seneca.external ) {
            throw e
          }
          else {
            //console.log('PINIT')
            //eyes.inspect(e)
            seneca.fail( descerror({code:'seneca/plugin_exception',pluginname:pluginname},e),extcb)
          }
        }
      }
      else if( pI == plugins.length ) {
        try {
          done(null)
        }
        catch( e ) {
          if( e.seneca ) {
            e.seneca.external = true
            throw e
          }
          else {
            throw seneca.fail(descerror({code:'seneca/callback_exception',pluginname:pluginname,external:true},e))
          }
        }
      }
    }
    eachplugin(0)
  }

}



