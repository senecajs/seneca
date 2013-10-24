/* Copyright (c) 2010-2013 Richard Rodger, MIT License */
/* jshint node:true, asi:true, eqnull:true */
"use strict";


var VERSION = '0.5.13'


var util    = require('util')
var events  = require('events')
var net     = require('net')
var repl    = require('repl')
var path    = require('path')
var buffer   = require('buffer')


var _        = require('underscore')
var async    = require('async')
var optimist = require('optimist')
var connect  = require('connect')
var request  = require('request')


var nid          = require('nid')
var jsonic       = require('jsonic')
var patrun       = require('patrun')
var parambulator = require('parambulator')


var common   = require('./common')
var arrayify = common.arrayify
var noop     = common.noop


var Entity     = require('./entity').Entity
var store      = require('./store')
var msgmap     = require('./msgmap')
var logging    = require('./logging')
var stats      = require('./stats')






function noopservice( req, res, next ) {
  if( next ) return next();
}


function resolvemsg(meta,info) {
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

      var infostr = (info?' '+common.owndesc(info,3):'')
      var codeinfo = code + infostr
      msg = first ? (_.isString(first) ? first : (first[ parts[1] ] || codeinfo ) ) : codeinfo
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
  return meta
}

function stackfirst( error ) {
  return ( error && error.stack && (error.stack+' \n ').split('\n')[1] ) || ''
}



function safe_json_stringify(obj,depth) {
  depth = depth || 0
  var jsonstr = ''
  try {
    jsonstr = JSON.stringify(obj)
  }
  catch( e ) {
    if( 0<depth && ~e.message.indexOf("circular structure") ) {
      jsonstr = "[Circular...]"
    }
    else {
      var sb = []
      for( var k in obj ) {
        sb.push(k+'='+safe_json_stringify(obj[k],depth+1))
      }
      jsonstr = '<'+sb.join(',')+'>'
    }
  }
  return jsonstr
}



// finds the plugin module using require
// the module must be a function
// sets plugindesc.init to be the function exposed by the module
function resolve_plugin( plugindesc, seneca, opts ) {
  seneca.log.debug('register','resolve',common.owndesc(plugindesc,1))

  var use_require = opts.require || plugindesc.parentmodule.require || require


  function try_require(name) {
    var first_err = null
    var found = undefined

    if( !name ) return found;

    try {
      plugindesc.searched_paths.push(name)
      var found = use_require(name)
      return found
    }
    catch(e) {
      first_err = first_err || e

      // also try seneca module dependencies, e.g. seneca-web
      try {
        found = require(name)
      }
      catch(ee) {
        first_err = first_err || ee
      }

      return found;
    }
  }


  if( !plugindesc.name ) {
    throw seneca.fail({code:'seneca/plugin_no_name',desc:plugindesc})
  }

  var m = /^(.+)|(.+)$/.exec(plugindesc.name)
  if( m ) {
    plugindesc.name = m[1]
    plugindesc.tag  = m[2]
  }

  if( !plugindesc.init) {
    plugindesc.searched_paths = []
    var name = plugindesc.name
    var tag  = plugindesc.tag
    var fullname = name+(tag?'/'+tag:'')
    var initfunc

    // try to load as a built-in module
    try {
      if( ~name.indexOf('..') || ~name.indexOf('/') ) {
        // yes, control flow. I will burn in Hell.
        throw new Error("not a built-in: '"+name+"', [SKIP]")
      }

      var builtin_path = '../plugin/'+name
      plugindesc.searched_paths.push(builtin_path)
      seneca.log.debug('register','require',builtin_path,fullname)
      initfunc = require(builtin_path)
    }

    catch(e) {
      if( e.message && ( -1 != e.message.indexOf("'"+builtin_path+"'") || ~e.message.indexOf('[SKIP]')) ) {

        // try to load as a seneca repo module
        seneca.log.debug('register','require',fullname)

        var plugin_names = [name,'seneca-'+name,'./'+name]
        var parent_filename = (plugindesc.parentmodule||{}).filename
        var paths = parent_filename ? [ path.dirname(parent_filename) ] : [] 
        paths = _.compact(paths.concat((plugindesc.parentmodule||{}).paths||[]))

        var plugin_paths = plugin_names.slice()
        paths.forEach(function(path){
          plugin_names.forEach(function(name){
            plugin_paths.push(path+'/'+name)
          })
        })

        //console.dir(plugin_paths)

        var first_err
        do {
          var plugin_path = plugin_paths.shift()
          initfunc = try_require(plugin_path)
        }
        while( _.isUndefined(initfunc) && 0 < plugin_paths.length )
        if( first_err ) throw first_err;

      }
      else throw e;
    }


    if( initfunc ) {
      if( !_.isFunction(initfunc) ) {
        throw seneca.fail({code:'seneca/plugin_no_init_function',plugin:plugindesc})
      }

      plugindesc.init = initfunc
    }
    else {
      seneca.log.debug('plugin','notfound',plugindesc)
      throw seneca.fail({code:'seneca/plugin_not_found',plugin:plugindesc})
    }
  }
}




function make_seneca($, opts) {
  // $ is a private context

  function Seneca(){
    events.EventEmitter.call(this)
  }
  util.inherits(Seneca, events.EventEmitter)

  var self = new Seneca()

  self.version = VERSION
  self.id = nid()

  opts.log = opts.log || opts.logger || opts.logging || {}

  opts = deepextend({
    status_interval: 60000,
    stats: {
      size:1024,
      duration:60000,
      running:false
    },
    listen: {
      host: 'localhost',
      port: 10101,
      path: '/act',
      limit: '11mb',
      timeout: '22222'
    },
    debug:{
      allargs:false
    }
  },opts)


  // legacy api
  if( 'print'==opts.log ) {
    opts.log = {map:[{level:'all',handler:'print'}]}
  }

  // TODO: parambulator validation of opts

  var argv = optimist.argv


  if( process.env.SENECA_LOG ) {
    opts.log.map = opts.log.map || []
    var loggingconf = process.env.SENECA_LOG
    logging.parse_command_line( loggingconf, opts.log.map )
  }

  if( argv.seneca ) {
    if( argv.seneca.log ) {
      opts.log.map = opts.log.map || []
      logging.parse_command_line( argv.seneca.log, opts.log.map )
    }
  }


  if( !opts.log.map ) {
    opts.log.map = [
      {level:'info',handler:'print'},
      {level:'error',handler:'print'}
    ]
  }

  
  $.logrouter = logging.makelogrouter(opts.log)

  self.log = logging.makelog($.logrouter)

    

  // setup status log

  if( 0 < opts.status_interval && opts.status_log ) {
    setInterval(function(){
      var stats = {alive:(new Date().getTime()-$.stats.start),act:$.stats.act}
      self.log.info('status',stats)
    },opts.status_interval)
  }

  $.timestats = new stats.NamedStats( opts.stats.size, opts.stats.duration )

  if( opts.stats.running ) {
    setInterval(function(){
      $.timestats.calculate()
    }, opts.stats.duration )
  }

  $.plugins    = {}
  $.exports    = {}
  //$.services   = []
  $.actrouter = patrun()

  $.plugin_order = {
    byname:[],
    byref:[],
  }


  $.ready_err = null
  $.ready_queue = async.queue(function(task,done){
    if( task.cb ) {
      task.cb.call(self,function(err){
        if( err ) {
          if( $.ready_err ) {
            $.ready_err.list = $.ready_err.list || []
            $.ready_err.list.push(err)
          }
          else $.ready_err = err;
        }

        done()
      })
    }
    else if( task.ready ) {
      var err = $.ready_err
      $.ready_err = null
      self.log.debug('ready',err)
      task.ready.call(self,err,self)
      self.emit('ready',err,self)
      done()
    }
  },1)




  self.on('error',noop) // prevent process exit


  // TODO: if no args, return printout
  self.logroute = function(entry,handler){
    entry.handler = handler || entry.handler
    logging.makelogroute(entry,$.logrouter)
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

  var paramcheck = {}


  // errfn = required, function; winfn = required, function or boolean, if false, no call
  self.err = function( errfn, winfn ) {
    if( !_.isFunction(errfn) ) throw self.fail({code:'seneca/error_handler_no_err_function'})
    if( !_.isFunction(winfn) && !_.isBoolean(winfn)) throw self.fail({code:'seneca/error_handler_no_win_function'})
    return function(err) {
      if( err  ) {
        return errfn(err)
      }
      else {
        if( _.isFunction(winfn) ) {
          winfn.apply(null,arrayify(arguments,1))
        }
      }
    }
  }






  paramcheck.register = parambulator(
    {type$:'object',required$:['name','init'],string$:['name'],function$:['init','service'],object$:['opts']},
    {topname:'plugin',msgprefix:'register(plugin): ',callbackmaker:paramerr('seneca/register_invalid_plugin')}
  )
  self.register = function( plugin, cbfunc ) {
    var self = this

    cbfunc = _.isFunction(cbfunc) ? cbfunc : noop
    paramcheck.register.validate(plugin)

    var fullname = plugin.name+(plugin.tag?'/'+plugin.tag:'')
    var tag      = plugin.tag||'-'
    var nameref  = [plugin.name,tag]


    // adjust seneca api to be plugin specific
    var sd = self.delegate()
    sd.log = function(level) {
      var args = arrayify(arguments)

      args.splice(1,0,'plugin',plugin.name,tag)
      self.log.apply(self,args)
    }
    logging.makelogfuncs(sd)

    sd.fail = function() {
      var args = arrayify(arguments), cbI = -1

      if( _.isObject(args[0]) ) {
        args[0].plugin = fullname
      }

      var cb = _.find(args,function(x){cbI++;return _.isFunction(x)})
      if( cb ) {
        args[cbI] = function(){
          var errarg = arguments[0]
          if( errarg && errarg.seneca ) {
            errarg.seneca.plugin = {name:fullname}
            errarg.seneca.code   = 'unknown'!=errarg.seneca.code ? errarg.seneca.code : 'plugin'
          }
          cb.apply(null,arguments)
        }
      }
      return self.fail.apply(self,args)
    }

    sd.add = function() {
      var args = arrayify(arguments)

      var actmeta = args[args.length-1]
      
      if( _.isFunction(actmeta) ) {
        actmeta = {}
        args.push(actmeta)
      }

      actmeta.plugin_nameref  = nameref
      actmeta.plugin_fullname = fullname
      actmeta.plugin_tag      = tag
      actmeta.log = sd.log

      return self.add.apply(sd,args)
    }

    sd.context = {
      module: plugin.parentmodule || module,
      name:plugin.name,
      tag:plugin.tag,
      full:fullname
    }


    return do_register( plugin.opts )


    function do_register(opts) {
      self.log.debug('register','init',fullname)

      // get options
      if( 'options' != plugin.name ) {
        self.act({role:'options',cmd:'get',base:fullname,default$:{}},self.err(cbfunc,function(fullname_options){
          var shortname = fullname != plugin.name ? plugin.name : null
          if( !shortname && 0 === fullname.indexOf('seneca-') ) {
            shortname = fullname.substring('seneca-'.length)
          }
        
          if( shortname ) {
            self.act({role:'options',cmd:'get',base:shortname,default$:{}},self.err(cbfunc,function(name_options){
              var opts = _.extend({},name_options,fullname_options,plugin.opts||{})
              do_init(opts)
            }))
          }
          else do_init( _.extend({},fullname_options,plugin.opts||{}) )
        }))
      }
      else return do_init(plugin.opts)


      function do_init( options ) {
        var args = [options,install_plugin]

        // legacy plugins with function(seneca,opts,cb)
        if( 3 == plugin.init.length ){
          args.unshift(sd)
        }


        // single action convenience
        if( void 0 != plugin.init.pattern ) {
          var action = plugin.init
          plugin.init = function(){
            this.add(action.pattern,action)
          }
        }
        

        var meta = plugin.init.apply(sd,args)

        meta = (plugin.init.length <= 1 && void 0 == meta) ? {} : ( meta || {} )
        meta = _.isString( meta ) ? {name:meta} : meta

        return install_plugin(null,meta)
      }


      function install_plugin(err,meta){
        if( err ) {
          return cbfunc(err);
        }

        meta = meta || {}

        // legacy api for service function
        if( _.isFunction(meta) ) {
          meta = {service:meta}
        }

        plugin.name    = meta.name    || plugin.name
        plugin.tag     = meta.tag     || plugin.tag || opts.tag$
        plugin.service = meta.service || plugin.service

        nameref[0]=plugin.name
        nameref[1]=plugin.tag

        // name may have been changed by return value from plugin init

        var pluginref = plugin.name+(plugin.tag?'/'+plugin.tag:'')
        $.plugins[pluginref] = plugin

        $.plugin_order.byname.push(plugin.name)
        $.plugin_order.byname = _.uniq($.plugin_order.byname)

        $.plugin_order.byref.push(pluginref)

        // LEGACY
        var service = plugin.service
        if( service ) {
          service.log = sd.log
          service.key = pluginref
          //$.services.push(service)
          self.act('role:web',{use:service})
        }


        $.ready_queue.push({cb:function(done){
          self.act({init:plugin.name,tag:plugin.tag,default$:{},proxy$:false},function(err,out){
            if( !err ) {
              self.log.debug('register','ready',pluginref,out)
            }
            done(err)
          })
        }})

        var exports = []
        
        if( void 0 != meta.export ) {
          $.exports[plugin.name] = meta.export
          exports.push(plugin.name)

          $.exports[pluginref] = meta.export
          exports.push(pluginref)
        }

        if( _.isObject(meta.exportmap) ) {
          _.each(meta.exportmap,function(v,k){
            if( void 0 != v ) {
              var exportname = plugin.name+'/'+k
              $.exports[exportname] = v
              exports.push(exportname)
            }
          })
        }

        self.log.debug('register','install',pluginref,{exports:exports},fullname!=pluginref?fullname:undefined)


        cbfunc(null)
      }
    }
  }



  // TODO: deps can be remaining args
  self.depends = function() {
    var plugin = arguments[0]
    var deps   = arguments[1]

    _.each(deps, function(depname){
      if( !_.contains($.plugin_order.byname,depname) &&
          !_.contains($.plugin_order.byname,'seneca-'+depname) ) {
        self.fail({code:'seneca/plugin_required',plugin:plugin,dependency:depname})
      }
    })
  }



  self.export = function( key ) {
    // transitional hack - FIX: create web plugin to handle HTTP end points
    if( 'web' == key ) {
      return self.service()
    }
    else return $.exports[key];
  }



  // attempts to provide the deepest (i.e. original) exception, with details sub object in seneca property
  // meta: error description, optional
  // cb: callback or flag, optional. flag:true => throw err, flag:false=> return err unthrown
  self.fail = function( meta, cb ) {
    var out, err

    function checkrethrow(e) {
      if( e.seneca ) {
        if( _.isFunction(cb) ) {
          cb(e)
        }
        else return e;
      }
    }

    if( common.isError(meta) ) {
      if( (out = checkrethrow(meta)) ) return out;
      err = meta
    }

    var argI = 1
    var code = 'unknown'
    var msg  = 'unknown error.'
    var error
    var err_seneca = {}
    var cbfunc = cb

    var why = ''

    if( _.isString(meta) ) {
      code = ''+meta
      msg = resolvemsg({code:code},meta)
      argI = 2
      why = 'string'
    }
    else if( common.isError(meta) ) {
      code = meta.code || 'unknown'
      msg = meta.message
      error = meta
      argI = 2
      why = 'error'
    }
    else if( _.isFunction(meta) ) {
      cbfunc = meta
      why = 'function'
    }
    else if( _.isObject(meta) ) {
      if( meta.error && common.isError(meta.error) ) {
        if( (out = checkrethrow(meta)) ) return out;
        err = meta.error
      }

      code = meta.code || 'unknown'
      msg = resolvemsg(meta,meta)
      err_seneca = _.extend({},meta)
      argI = 2
      why = 'object'
    }
    else if( void 0 === cb && _.isBoolean(meta) ) {
      cbfunc = meta
      why = 'void'
    }


    err_seneca.when = new Date().toISOString()
    err_seneca.tag  = nid()
    err_seneca.code = code
    if( error ) {
      descerror(err_seneca,error)
    }

    delete err_seneca.msg
    delete err_seneca.message

    try {
      msg = _.template( msg, _.extend({json$:safe_json_stringify},err_seneca) )
    }
    catch( e ) {
      msg = msg + ' (context:'+common.owndesc(err_seneca,3)+')'
    }

    var prefix = "Seneca: "

    msg = ~msg.indexOf(prefix) ? msg : prefix + msg

    if( err ) {
      err.message = msg
    }
    else {
      err = new Error(msg)
    }
    err.seneca = err_seneca

    // remove self.fail calls from stack history
    if( err.stack ) {
      err.stack = err.stack.replace(/\s+at .*?parambulator.js:[^\r\n]*/g,'')
      err.stack = err.stack.replace(/\s+at .*?\/seneca\/[^\r\n]*/g,'')
    }

    var stack = stackfirst(err.seneca.error)
    self.log.error('fail',err.seneca.code,err.message,stack )

    self.emit('error',err)

    if( _.isFunction(cbfunc) ) {
      err.seneca.callback = true
      var cbargs = arrayify(arguments,argI)
      var args = [err].concat(cbargs)
      cbfunc.apply(null,args)
      return err
    }
    else {
      err.seneca.callback = false
      if( void 0 == cbfunc || true === cbfunc ) {
        throw err
      }
      else {
        return err
      }
    }
  }


  // all optional
  self.make = function() {
    var si = (this && this.seneca) ? this : self
    return $.entity.make$.apply(si,arguments)
  }
  self.make$ = self.make





  self.listen = function() {
    var self = this
    var config = arrayify(arguments)

    if( !self.hasplugin('transport' ) ) {
      self.use( 'transport' )
    }

    self.ready(function(err){
      if( err ) throw err;

      self.act('role:transport,cmd:listen',{config:config},function(err){
        if(err) throw err;
      })
    })

    return self
  }




  self.client = function() {
    var self = this
    var config = arrayify(arguments)

    var send
    var actq = []
    var client_act = function(args,done){
      actq.push({args:args,done:done})
      process();
    }

    function process() {
      if( send ) {
        var q = actq.slice()
        actq = []
        async.mapLimit(q,1,function(entry,next){
          send(entry.args,entry.done)
          next()
        },function(){})
      }
    }

    if( !self.hasplugin('transport' ) ) {
      self.use( 'transport' )
    }

    self.ready(function(err){
      if( err ) throw err;

      self.act('role:transport,cmd:client',{config:config},function(err,out){
        if(err) throw err;

        send = out
        process();
      })
    })


    var findact = self.findact
    var client = self.delegate()
    client.findact = function( args ) {
      var actmeta = findact.call( self, args )
      if( actmeta ) { actmeta.proxy = true }

      if( false === args.proxy$ ) {
        return actmeta
      }
      else {
        actmeta = {
          func: client_act,
          plugin_nameref:'-',
          log:client.log,
          argpattern:common.owndesc(args),
          id:'CLIENT'
        }
        return actmeta
      }
    }

    return client
  }


  self.proxy = function() {
    var self = this
    var args = arrayify(arguments)
    $.proxy = self.client.apply(self,args)
    return self
  }


  self.cluster = function() {
    var cluster = require('cluster')

    if( cluster.isMaster ) {
      require('os').cpus().forEach(function(){
        cluster.fork()
      })

      cluster.on('disconnect', function(worker) {
        cluster.fork()
      })

      var noopinstance = self.delegate()
      for( var fn in noopinstance ) {
        if( _.isFunction(noopinstance[fn]) ) {
          noopinstance[fn] = function(){ return noopinstance; }
        }
      }

      return noopinstance;
    }
    else return self;
  }



  // DEPRECATED
  self.service = function( service ) {
    if( _.isFunction( service ) ) {
      service.log = self.log
      service.key = 'anon-'+nid().substring(0,8)
      //$.services.push(service)
      self.act('role:web',{use:service})
    }
    else {
      return $.exports.web
    }
  }


  // DEPRECATED
  self.httprouter = function(httproutedeffunc) {
    return httproutedeffunc ? $.exports['web/httprouter'](httproutedeffunc) : noopservice
  }



  // DEPRECATED
  self.http = function( spec ) {
    self.act('role:web',{use:spec})
  }




  self.hasplugin = function(plugindesc,tag) {
    return !!self.findplugin(plugindesc,tag)
  }


  // get plugin instance
  self.findplugin = function(plugindesc,tag) {
    var name = plugindesc.name || plugindesc
    tag = plugindesc.tag || tag

    var key = name+(tag?'/'+tag:'')
    var plugin = $.plugins[key]

    return plugin
  }


  self.pin = function( pattern, pinopts ) {
    var thispin = this

    var methodkeys = []
    for( var key in pattern ) {
      if( /[\*\?]/.exec(pattern[key]) ) {
        methodkeys.push(key)
      }
    }


    var methods = $.actrouter.findall(pattern)


    var api = {toString:function(){return 'pin:'+descdata(pattern,1)+'/'+thispin}}

    methods.forEach(function(method){
      var mpat = method.match

      var methodname = ''
      for(var mkI = 0; mkI < methodkeys.length; mkI++) {
        methodname += ((0<mkI?'_':'')) + mpat[methodkeys[mkI]]
      }

      api[methodname] = function(args,cb) {
        var si = this && this.seneca ? this : thispin
        var fullargs = _.extend({},args,mpat)
        si.act.call(si,fullargs,cb)
      }
    })

    if( pinopts ) {
      if( pinopts.include ) {
        for( var i = 0; i < pinopts.include.length; i++ ) {
          var methodname = pinopts.include[i]
          if( thispin[methodname] ) {
            api[methodname] = common.delegate(thispin,thispin[methodname])
          }
        }
      }
    }

    return api
  }



  // params: argstr,argobj,paramspec,actfunc,actmeta
  self.add = function() {
    var inargs = arrayify(arguments)
    var args = inargs.shift()

    if( _.isString( args) ) {
      var strargsobj
      try {
        strargsobj = jsonic(args)
      }
      catch( e ) {
        throw self.fail({code:'seneca/string-args-syntax-error',argstr:args,inargs:inargs})
      }

      // NOTE: second args is always interpreted as args object!
      // to have a paramspec with string args, you need to say add("a:1",{b:2}, {a:"required$"}, ...
      var argsobj = inargs.shift()
      if( _.isFunction(argsobj) ) {
        inargs.unshift(argsobj)
        args = strargsobj
      }
      else if( _.isObject(argsobj) ) {
        args = _.extend( {}, argsobj, strargsobj )
      }
      else throw self.fail({code:'seneca/args-must-be-object',args:argsobj,inargs:inargs})
    }
    else if( !_.isObject(args) ) {
      throw self.fail({code:'seneca/args-must-be-object',inargs:inargs})
    }
    


    var paramspec = inargs.shift()
    var actfunc
    var pm

    if( _.isFunction(paramspec) ) {
      pm = null
      actfunc = paramspec
    }
    else if( _.isObject(paramspec) ) {
      pm = parambulator(paramspec)
      actfunc = inargs.shift()
    }


    if( !_.isFunction(actfunc) ) {
      throw self.fail({code:'seneca/action-function-required',actfunc:actfunc,inargs:inargs})
    }


    var actmeta = inargs.shift()
    if( void 0 == actmeta ) {
      actmeta = {}
    }
    else if( !_.isObject(actmeta) ) {
      throw self.fail({code:'seneca/action-metadata-not-an-object',actmeta:actmeta,inargs:inargs})
    }

    
    if( paramspec ) {
      actmeta.parambulator = pm
    }

    var instance = this && this.seneca ? this : self
    
    var addroute = true
    var priormeta = instance.findact(args)

    actmeta.argpattern = common.owndesc(args)
    actmeta.id = nid()

    actmeta.func = actfunc

    if( priormeta ) {
      if( _.isFunction(priormeta.handle) ) {
        priormeta.handle(actfunc)
        addroute = false
      }
      else { 
        actmeta.priormeta = priormeta 
      }
      actmeta.priorpath = priormeta.id+';'+priormeta.priorpath
    }
    else {
      actmeta.priorpath = ''
    }


    // FIX: need a much better way to support layered actions
    // this ".handle" hack is just to make seneca.close work
    if( actfunc && actmeta && _.isFunction(actfunc.handle) ) {
      actmeta.handle = actfunc.handle
    }


    $.stats.actmap[actmeta.argpattern] = 
      $.stats.actmap[actmeta.argpattern] || 
      {id:actmeta.id,
       plugin:{full:actmeta.plugin_fullname,name:actmeta.plugin_nameref,tag:actmeta.plugin_tag},
       prior:actmeta.priorpath,calls:0,done:0,fails:0,time:{}}
    
    if( addroute ) {
      var plugin_name = (actmeta.plugin_nameref && actmeta.plugin_nameref[0]) || '-' 
      var plugin_tag  = (actmeta.plugin_nameref && actmeta.plugin_nameref[1]) || '-' 
      self.log.debug('add',plugin_name,plugin_tag,args,actmeta.id)
      $.actrouter.add(args,actmeta)
    }

    return self
  }
  


  self.compose = function(args,acts) {
    self.add(args,function(call_args,cb){
      function call_act(i,cur_args) {
        if( i < acts.length ) {
          cur_args = _.omit(cur_args,_.keys(acts[i-1]||args))
          cur_args = _.extend(cur_args,acts[i])

          self.act(cur_args,function(err,next_args){
            if( err ) return cb(err);
            next_args = acts[i].modify$ ? (acts[i].modify$(next_args,call_args)||next_args) : next_args
            call_act(i+1,next_args)
          })
        }
        else cb(null,cur_args)
      }
      call_act(0,call_args)
    })
  }


  
  self.findact = function(args) {
    var actmeta = $.actrouter.find(args)
    return actmeta
  }


  self.hasact = function(args) {
    return !!$.actrouter.find(args)
  }

  self.pinact = function(pattern) {
    pattern = _.isString(pattern) ? jsonic(pattern) : pattern
    return _.map( $.actrouter.findall(pattern), function(desc) {return desc.match} )
  }


  self.actroutes = function(){
    return $.actrouter.toString(function(d){
      var s = 'F='+d.id
      while( d.priormeta ) {
        d = d.priormeta
        s+=';'+d.id
      }
      return s
    })
  }


  function do_act(instance,actmeta,isprior,origargs,cb){
    var act_start = new Date().getTime()

    if( !_.isFunction(cb) ) {
      throw self.fail({code:'seneca/act_no_callback',args:origargs})
    }

    if( !_.isObject(origargs) ) {
      throw self.fail({code:'seneca/act_no_args'})
    }

    var args = _.clone(origargs)

    // TODO: doesn't really work, as requires all sub actions to use 'this'
    var actid = ((instance.fixedargs&&instance.fixedargs.actid)?instance.fixedargs.actid+'/':'')+nid()

    
    // FIX: make this error nice to handle for calling code - git rid of circular ref
    if( actmeta.parambulator ) {
      actmeta.parambulator.validate(args,function(err){

        // FIX: should have an error code
        if( err ) {
          self.log.error('act','err',actid, 'bad-args', err.message, actmeta.id )
          return instance.fail({code:'seneca/invalid-act-args',message:err.message,args:args},cb)
        }

        return perform(actmeta)
      })
    } else return perform(actmeta);


    function perform(actmeta) {
      var actstats = ($.stats.actmap[actmeta.argpattern] = $.stats.actmap[actmeta.argpattern] || {})

      var plugin_nameref = actmeta.plugin_nameref||['-','-']

      self.log.debug('act',plugin_nameref[0]||'-',plugin_nameref[1]||'-',actid,'IN',function(){
        return [actmeta.descdata ? actmeta.descdata(args) : descdata(args), actmeta.id]
      })
      
      var delegate = instance.delegate({actid$:actid})


      try {
        instance.emit('act-in', actmeta.argpattern, actid, args)


        // automate actid log insertion
        delegate.log = function() {
          var args = arrayify(arguments)
          if( _.isFunction(actmeta.log) ) {
            var entries = [args[0]].concat(actid).concat(args.slice(1))
            actmeta.log.apply(instance,entries)
          }
          else {
            instance.log.apply(instance,[args[0]].concat(['single','-','-',actid]).concat(args.slice(1)))
          }
        }
        logging.makelogfuncs(delegate)


        if( actmeta.priormeta ) {
          // TODO: deprecate parent
          delegate.prior = delegate.parent = function(args,cb) {
            do_act(delegate,actmeta.priormeta,true,args,cb)
          }
        }
        else delegate.prior = nil



        var callargs = args

        if( delegate.fixedargs ) {
          callargs = _.extend({},args,delegate.fixedargs)
        }
        
        $.stats.act.calls++
        actstats.calls++
        var actstart = new Date().getTime()

        // FIX: needs a timeout!!!
        actmeta.func.call(delegate,callargs,function(err){
          var actend = new Date().getTime()
          $.timestats.point( actend-actstart, actmeta.argpattern )

          var args = arrayify(arguments)

          if( err ) {
            $.stats.act.fails++
            actstats.fails++
            instance.log.error('act','err',actid,err.message,stackfirst(err) )
            
            if( !err.seneca ) {
              return instance.fail(err,cb)
            }
            else {
              cb.apply(delegate,args) // note: err == args[0]
            }
            }
          else {
            var emitargs = args.slice()
            emitargs.unshift(actid)
            emitargs.unshift(actmeta.argpattern)
            emitargs.unshift('act-out')
            instance.emit.apply(instance,emitargs)
            
            args[0] = null

            self.log.debug('act',plugin_nameref[0]||'-',plugin_nameref[1]||'-',actid,'OUT',function(){
              return _.flatten( [ _.flatten([ actmeta.descdata ? actmeta.descdata(args.slice(1)) : descdata(args.slice(1)) ], true), actmeta.id ] )
            })

            $.stats.act.done++
            actstats.done++
            cb.apply(isprior?instance:delegate,args)
          }
        })
      }
      catch( error ) {
        if( error.seneca ) throw error;
        var actend = new Date().getTime()

        $.stats.act.fails++
        actstats.fails++

        self.log.error('act','err',actid, error.message, actmeta.id, stackfirst(error) )
        throw instance.fail( descerror({code:'seneca/act_error',args:args},error) )
      }
    }
  }



  function handle_act_args(orig) {
    var args,cb

    if( _.isString(orig[0]) ) {
      try {
        cb = _.isFunction(orig[2]) ? orig[2] : _.isFunction(orig[1]) ? orig[1] : noop
        var argsobj = _.isObject(orig[1]) ? orig[1] : {}
        args = _.extend({},argsobj,jsonic(orig[0]))
      }
      catch( e ) {
        throw self.fail({code:'seneca/string-args-syntax-error',argstr:orig[0],args:orig[1]})
      }
    }
    else {
      cb = _.isFunction(orig[1]) ? orig[1] : _.isFunction(orig[0]) ? orig[0] : noop
      args = _.extend({},_.isObject(orig[0])) ? orig[0] : {}
    }
    
    return [args,cb]
  }


  self.act_if = function() {
    if( _.isBoolean( arguments[0] ) ) {
      if( !arguments[0] ) return;
      return this.act.apply(this,arrayify(arguments).slice(1))
    }
    else throw this.fail({code:'act-if-no-boolean'}) 
  }

  self.act = function() {
    var self = this

    var argscb = handle_act_args(arrayify(arguments))
    var args = argscb[0]
    var cb   = argscb[1]

    var instance = this && this.seneca ? this : self
    var actmeta = instance.findact(args)

    function provide_default() {
      self.log.debug('act','-','-','-','DEFAULT',args)
      cb.call(instance,null,args.default$);
    }

    if( !actmeta ) {
      if( $.proxy && false !== args.proxy$ && ((actmeta && false !== actmeta.proxy)||true) ) {
        return $.proxy.act(args,function(err,out){
          if( err && err.seneca && 'ECONNREFUSED' == err.seneca.code && !_.isUndefined(args.default$) ) {
            provide_default()
          }
          else cb(err,out)
        })
      }
      else if( _.isUndefined(args.default$) ) {
        instance.fail({code:'seneca/act_not_found',args:args},cb)
      }
      else provide_default()
    }
    else do_act(instance,actmeta,false,args,cb)

    return self
  }




  self.wrap = function(pin,wrapper){
    var pinthis = this || self

    if( _.isArray(pin) ) {
      _.each(pin, function(p){
        do_wrap(p)
      })
    }
    else return do_wrap(pin);

    function do_wrap( pin ) {
      _.each( pinthis.pinact(pin), function(actpattern){
       pinthis.add(actpattern,function(args,done){
          wrapper.call(this,args,done)
        })
      })
    }
  }



  self.close = function(done){
    self.log.debug('close','start')
    self.act('role:seneca,cmd:close',function(err){

      // FIX: needs to be a close action
      if( $.entity ) {
        $.entity.close$(function(enterr){
          self.log.debug('close','end',err,enterr)
          if( done ) return done(err||enterr||null);
        })
      }
    })
  }



  self.ready = function(ready) {
    if( !_.isFunction(ready) ) return;
    $.ready_queue.push({
      ready:ready
    })
  }


  // use('pluginname') - built-in, or provide calling code 'require' as seneca opt
  // use( require('pluginname') ) - plugin object, init will be called
  // if first arg has property senecaplugin 
  self.use = function( arg0, arg1, arg2 ) {
    var self = this

    var parentmodule = module.parent
    var plugin = arg0 ? (arg0.senecaplugin || arg0) : null

    var plugin_opts = (_.isObject(arg1) || _.isString(arg1) || _.isNumber(arg1) || _.isBoolean(arg1) ) && 
          !_.isFunction(arg1) ? arg1 : {}
    var cb = _.isFunction(arg2) ? arg2 : (_.isFunction(arg1) ? arg1 : null) 

    plugin_opts = _.isString(arg1) || _.isNumber(arg1) || _.isBoolean(arg1) ? {value$:plugin_opts} : plugin_opts

    var plugindesc = {opts:plugin_opts}
    if( _.isString(plugin) ) {
      plugindesc.name = plugin
    }
    else if( _.isFunction( plugin ) ) {
      plugindesc.name = plugin.name || plugin.seneca_name || 'anon-'+nid()
      plugindesc.init = plugin
    }
    else if( _.isObject( plugin ) ) {
      plugindesc = plugin
    }

    plugindesc.opts = _.extend(plugindesc.opts||{},plugin_opts||{})

    plugindesc.parentmodule = parentmodule

    resolve_plugin(plugindesc,self,opts)
    var out = self.register( plugindesc, cb )

    // options are a special case
    if( void 0 != out ) {
      return out
    }
    else return self;
  }


  self.inrepl = function() {
    self.on('act-out',function(){
      logging.handlers.print.apply(null,arrayify(arguments))
    })
    
    self.on('error',function(err){
      var args = arrayify(arguments).slice()
      args.unshift('ERROR: ')
      logging.handlers.print.apply(null,arrayify(args))
    })
  }


  self.startrepl = function(in_opts) {
    var repl_opts = _.extend({repl:{listen:10170}},opts,in_opts)
    
    net.createServer(function (socket) {
      var actout =  function(){
        socket.write(''+arrayify(arguments)+'\n')
      }
      
      var r = repl.start({
        prompt: 'seneca '+socket.remoteAddress+':'+socket.remotePort+'> ', 
        input: socket, output: socket, terminal: true, useGlobal: false
      })
      
      r.on('exit', function () {
        self.removeListener('act-out',actout)
        socket.end()
      })
      
      r.context.seneca = self.delegate()
      
      var orig_act = r.context.seneca.act
      r.context.seneca.act = function() {
        var args = arrayify(arguments)
        args.repl$=true
          orig_act.apply(self,args)
        return r.context.seneca
      }

      self.on('act-out',actout)
      
    }).listen(repl_opts.repl.listen)
  }

  
  self.seneca = function() {
    return self
  }


  self.toString = function(){
    return 'Seneca/'+self.version+'/'+self.id
  }



  // loop over a list of items recursively
  // list can be an integer - number of times to recurse
  function recurse(list,work,done) {
    /* jshint validthis:true */

    var ctxt = this

    if( _.isNumber(list) ) {
      var size = list
      list = new Array(size)
      for(var i = 0; i < size; i++){
        list[i]=i
      }
    }
    else {
      list = _.clone(list)
    }

    function next(err,out){
      if( err ) return done(err,out);

      var item = list.shift()

      if( void 0 !== item ) {
        work.call(ctxt,item,next)
      }
      else {
        done.call(ctxt,err,out)
      }
    }
    next.call(ctxt)
  }


  function deepextend() {
    var args = arrayify(arguments)
    args.unshift([])
    return deepextend_impl.apply( null, args )
  }


  // TODO: can still fail if objects are too deeply complex - need a finite bound on recursion
  function deepextend_impl(seen, tar) {
    tar = _.clone(tar)
    _.each(Array.prototype.slice.call(arguments, 2), function(src) {
      for (var p in src) {
        var v = src[p]
        if( void 0 !== v ) {

          if( _.isString(v) || _.isNumber(v) || _.isBoolean(v) || _.isDate(v) || _.isFunction(v) || _.isRegExp(v) ) {
            tar[p] = v
          }

          // this also works for arrays - allows index-specific overrides if object used - see test/common-test.js
          else if( _.isObject(v) ) {

            // don't descend into..

            // entities
            if( v.entity$ ) {
              tar[p] = v
            }

            // circulars
            else if( _.contains( seen, v ) ) {
              tar[p] = v
            }

            // objects with methods
            else if( _.find(v,function(f){return _.isFunction(f)}) ) {
              tar[p] = v
            }

            // else it's just a pure data object
            else {
              seen.push(v)
              tar[p] = _.isObject( tar[p] ) ? tar[p] : (_.isArray(v) ? [] : {}) 

              // for array/object mismatch, override completely
              if( (_.isArray(v) && !_.isArray( tar[p] ) ) || (!_.isArray(v) && _.isArray( tar[p] ) ) ) {
                tar[p] = src[p]
              }
            
              tar[p] = deepextend_impl( seen, tar[p], src[p] )
            }
          }
          else {
            tar[p] = v
          }
        }
      }
    })
    return tar
  }


  // remove any props containing $
  function clean(obj) {
    if( null == obj ) return obj;

    var out = {}
    if( obj ) {
      for( var p in obj ) {
        if( !~p.indexOf('$') ) {
          out[p] = obj[p]
        }
      }
    }
    return out
  }


  // noop for callbacks
  function nil(){
    _.each(arguments,function(arg){
      if( _.isFunction(arg) ) {
        return arg()
      }
    })
  }


  // use args properties as fields
  // defaults: map of default values
  // args: args object
  // fixed: map of fixed values - cannot be overriden
  // omits: array of prop names to exclude
  // defaults, args, and fixed are deepextended together in that order
  function argprops( defaults, args, fixed, omits){
    omits = _.isArray(omits) ? omits : _.isObject(omits) ? _.keys(omits) : _.isString(omits) ? omits.split(/\s*,\s*/) : ''+omits

    // a little pre omit to avoid entities named in omits
    var usedargs = _.omit( args, omits )

    // don't support $ args
    usedargs = clean(usedargs)

    return _.omit( deepextend( defaults, usedargs, fixed ), omits )
  }


  self.util = {
    deepextend: deepextend,
    recurse: recurse,
    clean: clean,
    copydata: common.copydata,
    router: function(){ return patrun() },
    parsecanon: Entity.parsecanon,
    nil: nil,
    argprops: argprops
  }


  self.store = {
    init: store.init
  }


  self.delegate = function(fixedargs) {
    var self = this

    var delegate = Object.create(self)
    var act = delegate.act

    delegate.act = function(){
      var argscb = handle_act_args(arrayify(arguments))

      // can't override fixedargs
      var args = _.extend({},argscb[0],fixedargs)

      var cb   = argscb[1]

      act.call(this,args,cb)

      return delegate
    }

    delegate.toString = function(){
      return self.toString()+(fixedargs?'/'+common.owndesc(fixedargs,0,true):'')
    }
    
    delegate.delegate = function(further_fixedargs) {
      var args = _.extend({},further_fixedargs||{},fixedargs)
      return self.delegate.call(this,args)
    }

    delegate.fixedargs = fixedargs

    return delegate
  }


  // for use with async
  self.next_act = function(){
    var si   = this || self
    var args = arrayify(arguments)
    
    return function(next){
      args.push(next)
      si.act.apply(si,args)
    }
  }



  function descdata(data,depth) {
    var i = 0, cleandata

    depth = depth || 0
    if( 3 < depth ) return _.isArray(data) ? '[-]' : _.isObject(data) ? '{-}' : ''+data;

    if( !_.isObject(data) ) {
      return ''+data
    }
    else if( _.isArray(data) ) {
      cleandata = []
      for( i = 0; i < data.length && i < 3; i++ ) {
        cleandata.push(descdata(data[i]))
      }

      if( i < data.length ) {
        cleandata.push(' ...(len='+data.length+')')
      }

      return cleandata
    }
    else if( _.isDate(data) ) {
      return data.toISOString()
    }
    else if( _.isObject(data) && data.entity$ ) {
      return data.toString()
    }
    else {
      if( data.seneca && data.seneca.nodesc ) return '<SENECA>';
      cleandata = {}
      for( var p in data ) {
        if( 16 < i++ ) {
          continue;
        }

        if( data.hasOwnProperty(p) && 
            (!~p.indexOf('$') || opts.debug.allargs ) && 
            !_.isFunction(data[p]) ) {
          cleandata[p] = descdata(data[p],1+depth)
        }
      }
      if( 16 < i ) {
        cleandata['<LEN>']=i
      }

      return cleandata
    }
  }



  return self
}







function init(opts) {
  opts = opts || {}


  // private context
  var $ = {
    stats:{
      start:new Date().getTime(),
      act:{calls:0,done:0,fails:0},
      actmap:{}
    }
  }


  // create instance
  var seneca = make_seneca($,opts)
  seneca.log.info('hello',seneca.toString())


  // set default commands

  // FIX: such a hack!
  var closehandler_functions = []
  var closehandler = function(args,cb){
    var instance = this

    var errs = []
    var outs = []
    function next(i) {
      if( i < closehandler_functions.length ) {
        closehandler_functions[i].call(instance,args,function(err,out){
          if( err ) errs.push(err);
          outs.push(out)
          next(i+1)
        })
      }
      else {
        var lasterr = 0 < errs.length ? errs[errs.length-1] : null
        var lastout = 0 < outs.length ? outs[outs.length-1] : null
        cb.call(instance,lasterr,lastout)
      }
    }
    next(0,null,[])
  }

  closehandler.handle = function(f) {
    closehandler_functions.push(f)
  }

  seneca.add({role:'seneca',cmd:'close'},closehandler)


  seneca.add({role:'seneca',stats:true}, function( args, done ) {
    var stats
    if( args.pattern && $.stats.actmap[args.pattern] ) {
      stats = $.stats.actmap[args.pattern]
      stats.time = $.timestats.calculate(args.pattern)
    }
    else {
      stats = _.clone($.stats)
      stats.now    = new Date()
      stats.uptime = stats.now - stats.start

      stats.now   = new Date(stats.now).toISOString()
      stats.start = new Date(stats.start).toISOString()

      var summary = (null == args.summary && false) || (/^false$/i.exec(args.summary) ? false : new Boolean(args.summary) )
      if( summary ) {
        stats.actmap = void 0
      }
      else {
        //_.each( $.timestats.calculate(), function(t,p) { 
        //  $.stats.actmap[p].time = t
        //})
        _.each( $.stats.actmap, function(a,p){ $.stats.actmap[p].time = $.timestats.calculate(p) })
      }
    }

    done(null,stats)
  })



  // register default plugins
  seneca.use('util')
  seneca.use('web')
  seneca.use('mem-store')


  // register options plugins
  _.each(opts.plugins, function(plugindesc){
    seneca.use(plugindesc)
  })


  // setup entity
  var sd = seneca.delegate()
  sd.log = function() {
    var args = ['entity']
    seneca.log.apply(seneca,args.concat(arrayify(arguments)))
  }
  logging.makelogfuncs(sd)
  
  $.entity = new Entity({},sd)




  return seneca
}




init.loghandler = logging.handlers


init.test = {
  store: {
    shared: require('../test/store/shared.js')
  }
}



module.exports = init

