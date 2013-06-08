/* Copyright (c) 2010-2013 Richard Rodger */
"use strict";


var VERSION = '0.5.8'

var common  = require('./common')

var util    = common.util
var events  = common.events
var net     = common.net
var repl    = common.repl
var path    = common.path

var assert   = common.assert
var nid      = common.nid
var async    = common.async
var optimist = common.optimist

var _       = common._
var parambulator = common.parambulator

var arrayify = common.arrayify
var noop     = common.noop
var buffer   = common.buffer




var Router = require('./router').Router
var Entity  = require('./entity').Entity

var store      = require('./store')
var httprouter = require('./http-router')

var argsparser  = require('./argsparser')


// default plugins
var connect_plugin   = require('../plugin/connect')
var mem_store_plugin = require('../plugin/mem-store')

var msgmap  = require('./msgmap')
var logging = require('./logging')


var COUNT = 0



function noopservice( req, res, next ) {
  next && next()
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

      var infostr = ''
      try {
        infostr = (info?' '+JSON.stringify(info):'')
      }
      catch( e ) {
        infostr = (info?' '+info:'')
      }

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
  //else throw new Error('no error')
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

  function try_require(name) {
    if( !name ) return null;
    try {
      plugindesc.searched_paths.push(name)
      var found = use_require(name)
      first_err = null
      return found
    }
    catch(e) {
      first_err = first_err || e
      return undefined;
    }
  }


  if( !plugindesc.name ) {
    throw seneca.fail({code:'seneca/plugin_no_name',desc:plugindesc})
  }

  var m = /^(.+):(.+)$/.exec(plugindesc.name)
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
        var use_require = opts.require || plugindesc.parentmodule.require || require

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

        var first_err
        while( _.isUndefined(initfunc = try_require(plugin_paths.shift())) );
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
    }
  }
}




function Seneca($, opts) {
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
    status_interval: 60000
  },opts)


  // legacy api
  if( 'print'==opts.log ) {
    opts.log = {map:[{level:'all',handler:'print'}]}
  }

  // TODO: parambulator validation of opts

  var argv = optimist.argv

  if( process.env['SENECA_LOG'] ) {
    opts.log.map = opts.log.map || []
    var loggingconf = process.env['SENECA_LOG']
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
      {level:'info',type:'hello,status',handler:'print'},
      {level:'error',handler:'print'}
    ]
  }

  
  $.logrouter = logging.makelogrouter(opts.log)

  self.log = logging.makelog($.logrouter)

    

  $.plugins    = {}
  $.services   = []
  $.actrouter = new Router()

  $.plugin_order = {
    byname:[],
    byref:[],
  }

  $.ready_waitfor = {}
  $.ready_calls = []
  $.pushready = function(pluginref){
    $.ready_waitfor[pluginref]=1
  }
  $.popready = function(pluginref,err){
    delete $.ready_waitfor[pluginref]
    if( 0 < $.ready_calls.length && 0 == _.keys($.ready_waitfor).length ) {
      var readycalls = $.ready_calls
      $.ready_calls = []
      _.each(readycalls,function(readycall){
        readycall(err||null)
      })
    }
  }
  
  $.whenready = function(cb) {
    var args = common.arrayify(arguments)
    $.ready_calls.push(function(err){
      cb && cb(err||null,self)
    })
    $.popready()
  }


  self.on('error',noop) // prevent process exit




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
    cbfunc = _.isFunction(cbfunc) ? cbfunc : noop
    paramcheck.register.validate(plugin)

    var fullname = plugin.name+(plugin.tag?'/'+plugin.tag:'')
    var nameref = [plugin.name,plugin.tag||'-']

    // adjust seneca api to be plugin specific
    var sd = self.delegate()
    sd.log = function(level) {
      var args = arrayify(arguments)

      args.splice(1,0,'plugin',plugin.name,plugin.tag||'-')
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

    sd.add = function(args,paramspec,actfunc,actmeta) {
      if( _.isFunction(paramspec) ) {
        actmeta = actfunc || {}
        actfunc = paramspec
        paramspec = null
      }
      else {
        actmeta = actmeta || {}
      }
      actmeta.plugin_nameref = nameref
      actmeta.log = sd.log

      self.add.call(sd,args,paramspec,actfunc,actmeta)
    }

    sd.context = {
      module: plugin.parentmodule || module
    }


    self.act({role:'config',cmd:'get',base:fullname,default$:{}},self.err(cbfunc,function(fullname_config){
      var shortname = fullname != plugin.name ? plugin.name : null
      if( !shortname && 0 == fullname.indexOf('seneca-') ) {
        shortname = fullname.substring('seneca-'.length)
      }

      if( shortname ) {
        self.act({role:'config',cmd:'get',base:shortname,default$:{}},self.err(cbfunc,function(name_config){
          var opts = _.extend({},name_config,fullname_config,plugin.opts||{})
          do_register(opts)
        }))
      }
      else return do_register( _.extend({},fullname_config,plugin.opts||{}) )
    }))


    function do_register(opts) {
      self.log.info('register','init',fullname)
      $.pushready(fullname)

      var args = [opts,function(err,meta){
        if( err ) {
          $.popready(fullname,err,self)
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

        var service = plugin.service
        if( service ) {
          service.log = sd.log
          service.key = pluginref
          $.services.push(service)
        }

        self.log.info('register','ready',pluginref,{service:!!service},fullname!=pluginref?fullname:undefined)
        $.popready(fullname)
        cbfunc(null)
      }]

      if( 3 == plugin.init.length ){
        args.unshift(sd)
      }

      plugin.init.apply(sd,args)
    }
  }



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



  // FIX: probably does not work
  self.result = function(cb,win){
    if( !_.isFunction(cb) ) throw self.fail({code:'seneca/result_handler_no_callback_function'})
    return function(){
      var args = arrayify(arguments)
      if( args[0] ) {
        self.fail(args[0],cb)
      }
      else {
        if( _.isFunction(win) ) {
          win.apply(null,args.slice(1))
        }
        else cb.apply(null,args);
      }
    }
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

    if( _.isError(meta) ) {
      if( out = checkrethrow(meta) ) return out;
      err = meta
    }

    var argI = 1
    var code = 'unknown'
    var msg  = 'unknown error.'
    var error
    var err_seneca = {}
    var cbfunc = cb

    if( _.isString(meta) ) {
      code = ''+meta
      msg = resolvemsg({code:code},meta)
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
      if( meta.error && _.isError(meta.error) ) {
        if( out = checkrethrow(meta) ) return out;
        err = meta.error
      }

      code = meta.code || 'unknown'
      msg = resolvemsg(meta,meta)
      err_seneca = _.extend({},meta)
      argI = 2
    }
    else if( void 0 === cb && _.isBoolean(meta) ) {
      cbfunc = meta
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
      err.stack = err.stack.replace(/\s+at Object\..*?\.fail \([^\r\n]*/g,'')
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
    //console.log('make: '+si)
    return $.entity.make$.apply(si,arguments)
  }
  self.make$ = self.make


  self.service = function( service ) {
    if( _.isFunction( service ) ) {
      service.log = self.log
      service.key = 'anon-'+uuid().substring(0,8)
      $.services.push(service)
    }
    else {
      return function(req,res,next) {
        function next_service(i) {
          var instance = req.instance || self

          if( i < $.services.length ) {
            var service = $.services[i]

            // TODO need some sort of logging here to trace failures to call next()
            
            service.call(instance,req,res,function(err){
              if( err ) return next(err);
              next_service(i+1)
            })
          }
          else {
            next && next()
          }
        }
        next_service(0)
      }
    }
  }


  self.httprouter = function(httproutedeffunc) {
    return httproutedeffunc ? httprouter(httproutedeffunc) : noopservice
  }


  // TODO: move to separate file, document!!!

  paramcheck.http = parambulator(
    {type$:'object',required$:['pin','map'],string$:['prefix'],object$:['pin','map']},
    {topname:'spec',msgprefix:'http(spec): ',callbackmaker:paramerr('seneca/http_invalid_spec')})

  self.http = function( spec ) {
    paramcheck.http.validate(spec)
    var prefix = spec.prefix || '/api/'

    if( !prefix.match(/\/+$/) ) {
      prefix += '/'
    }

    var instance = this
    var pin = instance.pin(spec.pin)


    function makedispatch(act,handlerspec) {
      return function( req, res, next ) {

        var data = _.extend(
          {},
          _.isObject(req.body)?req.body:{},
          _.isObject(req.query)?req.query:{}
        )

        var args = handlerspec.data ? 
          _.extend({data:data},req.params||{}) :
          _.extend(data,req.params||{})

        // modify args
        for( var argname in spec.args) {
          args[argname] = spec.args[argname](args[argname])
        }


        if( handlerspec.redirect && 'application/x-www-form-urlencoded' == req.headers['content-type']) {

          handlerspec.responder = function(req,res,handlerspec,err,obj) {
            // TODO: put obj into engagement if present
            var url = handlerspec.redirect
            if( err ) {
              url+='?ec='+(err.seneca?err.seneca.code:err.message)
            }
            res.writeHead(302,{
              'Location': url
            })
            res.end()
          }
        }

        var handler   = handlerspec.handler   || defaulthandler
        var responder = handlerspec.responder || defaultresponder

        
        var si = req.seneca || instance
        var respond = function(err,obj){
          responder.call(si,req,res,handlerspec,err,obj)
        }
        

        var act_si = function(args,done){
          act.call(si,args,done)
        }

        handler( req, res, args, act_si, respond, handlerspec)
      }
    }


    function defaulthandler(req,res,args,act,respond) {
      act(args,respond)
    }


    function defaultresponder(req,res,handlerspec,err,obj) {
      var outobj;

      if( _.isObject(obj) ) {
        outobj = _.clone(obj)

        // TODO: test filtering

        var remove_dollar = false
        if( !_.isUndefined(handlerspec.filter) ) {
          if( _.isFunction( handlerspec.filter ) ) {
            outobj = handlerspec.filter(outobj)
          }
          else if( _.isArray( handlerspec.filter ) ) {
            _.each(handlerspec.filter,function(p){
              delete outobj[p]
              remove_dollar = remove_dollar || '$'==p
            })
          }
        }

        // default filter
        // removes $ from entity objects
        else {
          remove_dollar = true
        }

        if( remove_dollar ) {
          _.keys(outobj,function(k){
            if(~k.indexOf('$')){
              delete outobj[k]
            }
          })
        }
      }
      else if( _.isUndefined(obj) ) {
        outobj = ''
      }
      else {
        outobj = obj;
      }


      var objstr = err ? JSON.stringify({error:''+err}) : safe_json_stringify(outobj)
      var code   = err ? 500 : 200;

      res.writeHead(code,{
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=0, no-cache, no-store',
        "Content-Length": buffer.Buffer.byteLength(objstr) 
      })
      res.end( objstr )
    }



    var maprouter = httprouter(function(http){
      for( var fname in pin ) {
        var act = pin[fname]
        var url = prefix + fname
        
        var urlspec = spec.map.hasOwnProperty(fname) ? spec.map[fname] : null
        if( !urlspec ) continue;

        if( urlspec.alias ) {
          url = prefix + urlspec.alias
        }

        urlspec.suffix = urlspec.suffix || ''

        var mC = 0
        for( var mI = 0; mI < httprouter.methods.length; mI++ ) {
          var m = httprouter.methods[mI]

          var handler = urlspec[m] || urlspec[m.toUpperCase()]
          if( handler ) {
            var handlerspec = _.isObject(handler) ? handler : {}
            handlerspec.handler = handlerspec.handler || (_.isFunction(handler) ? handler : defaulthandler)
            var dispatch = makedispatch(act,handlerspec)
            var fullurl = url+urlspec.suffix
            self.log.debug('http',m,fullurl)
            http[m](fullurl, dispatch)
            mC++
          }
        }

        if( 0 == mC ) {
          var dispatch = makedispatch(act,defaulthandler)
          var fullurl = url+urlspec.suffix
          self.log.debug('http','get',fullurl)
          http.get(fullurl, dispatch)
        }
      }
    })

    
    return function(req,res,next) {
      var si = req.seneca || instance

      if( spec.preware ) {
        spec.preware.call(si,req,res,do_maprouter)
      }
      else do_maprouter()

      function do_maprouter(err) {
        if(err ) return next(err);

        maprouter(req,res,function(err){
          if(err ) return next(err);

          if( spec.postware ) {
            spec.postware.call(si,req,res,next)
          }
          else next()
        })
      }
    }
  }




  // get plugin instance
  self.findplugin = function(plugindesc,tag) {
    var name = plugindesc.name || plugindesc
    var tag  = plugindesc.tag  || tag

    var key = name+(tag?'/'+tag:'')
    var plugin = $.plugins[key]

    return plugin
  }



  // DELETE
  // get a plugin's api
  self.api = function( pluginname ) {
    var plugin = self.plugin( pluginname )

    if( !plugin.api ) {
      throw self.fail({code:'seneca/api_not_found',pluginname:pluginname})
    }

    return plugin.api(self)
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

    //for( var mI = 0; mI < methods.length; mI++ ) {
    //  var mpat = methods[mI].match
      
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



  self.add = function(args,paramspec,actfunc,actmeta) {
    var pb
    if( _.isFunction(paramspec) ) {
      actmeta = actfunc || {}
      actfunc = paramspec
    }
    else {
      actmeta = actmeta || {}
      if( _.isObject(paramspec) ) {
        actmeta.parambulator = parambulator(paramspec)
      }
    }

    if( !_.isFunction(actfunc) ) {
      throw self.fail({code:'seneca/actfunc_not_defined',args:args})
    }

    if( !_.isObject(actmeta) || _.isFunction(actmeta) ) {
      throw self.fail({code:'seneca/actmeta_not_object',args:args})
    }

    
    var addroute = true
    var parentmeta = findact(args)

    if( parentmeta ) {
      if( _.isFunction(parentmeta.handle) ) {
        parentmeta.handle(actfunc)
        addroute = false
      }
      else { 
        actmeta.parentmeta = parentmeta 
      }
    }

    actmeta.argpattern = common.owndesc(args)
    actmeta.id = nid()

    actmeta.func = actfunc

    // FIX: need a much better way to support layered actions
    // this ".handle" hack is just to make seneca.close work
    if( _.isFunction(actfunc.handle) ) {
      actmeta.handle = actfunc.handle
    }

    if( addroute ) {
      var plugin_name = (actmeta.plugin_nameref && actmeta.plugin_nameref[0]) || '-' 
      var plugin_tag  = (actmeta.plugin_nameref && actmeta.plugin_nameref[1]) || '-' 
      self.log.info('add',plugin_name,plugin_tag,args,actmeta.id)
      $.actrouter.add(args,actmeta)
    }
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


  
  function findact(args) {
    var actmeta = $.actrouter.find(args)
    return actmeta
  }


  self.hasact = function(args) {
    return !!$.actrouter.find(args)
  }

  self.pinact = function(pattern) {
    return _.map( $.actrouter.findall(pattern), function(desc) {return desc.match} )
  }


  self.actroutes = function(){
    return $.actrouter.toString(function(d){
      var s = 'F='+d.id
      while( d.parentmeta ) {
        d = d.parentmeta
        s+=';'+d.id
      }
      return s
    })
  }


  function do_act(instance,actmeta,isparent,origargs,cb){
    var act_start = new Date().getTime()

    if( !_.isFunction(cb) ) {
      throw self.fail({code:'seneca/act_no_callback',args:origargs})
    }

    if( !_.isObject(origargs) ) {
      throw self.fail({code:'seneca/act_no_args'})
    }

    var args = _.clone(origargs)
    
    // FIX: make this error nice to handle for calling code - git rid of circular ref
    if( actmeta.parambulator ) {
      actmeta.parambulator.validate(args,function(err){
        // FIX: should have an error code
        if( err ) return instance.fail(err,cb)
        return perform(actmeta)
      })
    } else return perform(actmeta);


    function perform(actmeta) {

      // TODO: doesn't really work, as requires all sub actions to use 'this'
      var actid = ((instance.fixedargs&&instance.fixedargs.actid)?instance.fixedargs.actid+'/':'')+nid()

      var plugin_nameref = actmeta.plugin_nameref||['-','-']

      self.log.debug('act',plugin_nameref[0]||'-',plugin_nameref[1]||'-',actid,'IN',function(){
        return [actmeta.descdata ? actmeta.descdata(args) : descdata(args), actmeta.id]
      })
      
      //args.actid$  = actid

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


        if( actmeta.parentmeta ) {
          delegate.parent = function(args,cb) {
            do_act(delegate,actmeta.parentmeta,true,args,cb)
          }
        }


        var callargs = args

        if( delegate.fixedargs ) {
          callargs = _.extend({},args,delegate.fixedargs)
        }

        $.stats.act.called++
        actmeta.func.call(delegate,callargs,function(err){
          var args = arrayify(arguments)

          if( err ) {
            $.stats.act.failed++
            instance.log.error('act','err',actid,err.message,stackfirst(err) )

            if( !err.seneca ) {
              return instance.fail(err,cb)
            }
            else {
              cb.apply(null,args) // note: err == args[0]
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

            $.stats.act.completed++
            cb.apply(isparent?instance:delegate,args)
          }
        })
      }
      catch( error ) {
        if( error.seneca ) throw error;

        $.stats.act.failed++
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
        args = _.extend({},argsobj,argsparser.parse(orig[0]))
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


  self.act = function() {
    var argscb = handle_act_args(arrayify(arguments))
    var args = argscb[0]
    var cb   = argscb[1]

    var instance = this && this.seneca ? this : self
    var actmeta = findact(args)

    if( !actmeta ) {
      if( _.isUndefined(args.default$) ) {
        instance.fail({code:'seneca/act_not_found',args:args},cb)
      }
      else {
        self.log.debug('act','-','-','-','DEFAULT',args)
        return cb.call(instance,null,args.default$);
      }
    }
    else do_act(instance,actmeta,false,args,cb)
  }




  self.wrap = function(pin,wrapper){
    var pinthis = this || self
    _.each( pinthis.pinact(pin), function(actpattern){
      pinthis.add(actpattern,function(args,done){
        wrapper.call(this,args,done)
      })
    })
  }



  self.close = function(done){
    self.log.info('close','start')
    self.act('role:seneca,cmd:close',function(err){

      // FIX: needs to a close action
      if( $.entity ) {
        $.entity.close$(function(enterr){
          self.log.info('close','end',err,enterr)
          done && done(err||enterr||null)
        })
      }
    })
  }



  self.ready = function(ready) {
    if( !_.isFunction(ready) ) return;

    $.whenready(ready)
  }


  // use('pluginname') - built-in, or provide calling code 'require' as seneca opt
  // use( require('pluginname') ) - plugin object, init will be called
  // if first arg has property senecaplugin 
  self.use = function( arg0, arg1, arg2 ) {
    var parentmodule = module.parent
    var plugin = arg0 ? (arg0.senecaplugin || arg0) : null

    var plugin_opts = _.isObject(arg1) && !_.isFunction(arg1) ? arg1 : {}
    var cb = _.isFunction(arg2) ? arg2 : (_.isFunction(arg1) ? arg1 : null) 

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
    self.register( plugindesc, cb )

    return self
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
        prompt: 'seneca '+socket.remoteAddress+':'+socket.remotePort+'> '
        , input: socket
        , output: socket
        , terminal: true
        , useGlobal: false
      })
      
        r.on('exit', function () {
          self.removeListener('act-out',actout)
          socket.end()
        })
      
      //r.context.socket = socket
      r.context.seneca = self.delegate()
      
      var orig_act = r.context.seneca.act
      r.context.seneca.act = function() {
        var args = arrayify(arguments)
        args.repl$=true
          orig_act.apply(self,args)
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


  function deepextend(tar) {
    _.each(Array.prototype.slice.call(arguments, 1), function(src) {
      for (var p in src) {
        var v = src[p]
        if( void 0 !== v ) {

          if( _.isString(v) || _.isNumber(v) || _.isBoolean(v) || _.isDate(v) || _.isFunction(v) || _.isRegExp(v) ) {
            tar[p] = v
          }

          // this also works for arrays - allows index-specific overides if object used - see test/common-test.js
          else if( _.isObject(v) ) {
            tar[p] = tar[p] || (_.isArray(v) ? [] : {})
            deepextend(tar[p],src[p])
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
    if( obj ) {
      for( var p in obj ) {
        if( ~p.indexOf('$') ) {
          delete obj[p]
        }
      }
    }
    return obj
  }


  self.util = {
    deepextend: deepextend,
    recurse: recurse,
    clean: clean,
    copydata: common.copydata,
    router: function(){ return new Router() }
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

      return act.call(this,args,cb)
    }

    delegate.toString = function(){
      return self.toString()+(fixedargs?'/'+common.owndesc(fixedargs,0,true):'')
    }
    
    delegate.delegate = function(further_fixedargs) {
      var args = _.extend({},further_fixedargs||{},fixedargs)
      return self.delegate(args)
    }

    delegate.fixedargs = fixedargs

    return delegate
  }


  function descdata(data,depth) {
    depth = depth || 0
    if( 3 < depth ) return _.isArray(data) ? '[-]' : _.isObject(data) ? '{-}' : ''+data;

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
    else if( _.isDate(data) ) {
      return data.toISOString()
    }
    else if( _.isObject(data) && data.entity$ ) {
      return data.toString()
    }
    else {
      if( data.seneca && data.seneca.nodesc ) return '<SENECA>';
      var cleandata = {}
      var i = 0
      for( var p in data ) {
        if( 16 < i++ ) {
          continue;
        }
        if( data.hasOwnProperty(p) && !~p.indexOf('$') && !_.isFunction(data[p]) ) {
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











function init(opts,extcb) {
  opts = opts || {}


  // private context
  var $ = {
    stats:{
      start:new Date().getTime(),
      act:{called:0,completed:0,failed:0}
    }
  }


  //function newseneca(entity) {
  var seneca = new Seneca($,opts)

  seneca.log.info('init','start')
  $.pushready('init')

  function call_extcb(err) {
    try {
      seneca.log.info('init','wait')

      $.whenready(function(){
        // opts.status_log has precendence
        // if not defined, run status log if there are services
        var status_log = !_.isUndefined(opts.status_log) ? opts.status_log : 0 < $.services.length

        if( status_log && 0 < opts.status_interval ) {
          setInterval(function(){
            var stats = {alive:(new Date().getTime()-$.stats.start),act:$.stats.act}
            self.log.info('status',stats)
          },opts.status_interval)
        }

        seneca.log.info('init','end')
        seneca.log.info('hello',seneca.toString())
        seneca.emit('ready',err,seneca)
      })

      $.popready('init')

      if( extcb ) {
        extcb(err,seneca)
      }
    }
    catch( e ) {
      seneca.log.error('callback','err',e.message, stackfirst(e) )

      if( e.seneca ) {
        throw e
      }
      else {
        throw seneca.fail( descerror({code:'seneca/callback_exception'},e))
      }
    }
  }


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


  // set default plugins
  seneca.use('util')
  seneca.use('connect')
  seneca.use('mem-store')



  initplugins(seneca,opts,function(err){
    if( err ) return call_extcb(err);


    // setup entity
    var sd = seneca.delegate()
    sd.log = function() {
      var args = ['entity']
      seneca.log.apply(seneca,args.concat(arrayify(arguments)))
    }
    logging.makelogfuncs(sd)

    $.entity = new Entity({},sd)


    call_extcb(null)
  })

  return seneca
}


function initplugins(seneca,opts,done) {
  var plugins = opts.plugins || []

  plugins.forEach( function(plugindesc){
    seneca.use(plugindesc)
  })

  done()
}


init.module = function( plugin_func, pin ) {
  var fn = function() {
    var args = arrayify(arguments)

    // plugin registration, args are actually opts,cb, and this==seneca instance
    if( this && this.seneca ) {
      return plugin_func.apply(this,args)
    }
    else {
      // call require('pluginname')(pluginopts,senecaopts)
      var si = init(args[1]||{log:{map:[]},status_interval:0})
      si.use(plugin_func,args[0]||{})
      return si.pin(pin,{include:['seneca']})
    }
  }
  fn.seneca_name = plugin_func.name
  return fn
}


init.loghandler = logging.handlers


init.test = {
  store: {
    shared: require('../test/store/shared.js')
  }
}

module.exports = init

