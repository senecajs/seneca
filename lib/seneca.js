/* Copyright (c) 2010-2012 Richard Rodger */

var common  = require('./common')

var util    = common.util
var events  = common.events
var net     = common.net
var repl    = common.repl
var path    = common.path

var assert  = common.assert
var uuid    = common.uuid
var async   = common.async

var _       = common._
var parambulator = common.parambulator

var arrayify = common.arrayify
var noop     = common.noop
var buffer   = common.buffer




var Router = require('./router').Router
var Entity  = require('./entity').Entity
var httprouter  = require('./http-router')


// default plugins
var mem_store = require('./plugin/mem-store')

var msgmap = require('./msgmap')


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



function safe_json_stringify(obj) {
  var jsonstr = ''
  try {
    jsonstr = JSON.stringify(obj)
  }
  catch( e ) {
    jsonstr = ''+obj
  }
  return jsonstr
}



function Seneca($, opts) {
  // $ is a private context

  var self = new events.EventEmitter()
  self.version = '0.4.0'
  self.id = common.idgen(6)


  $.plugins    = {}
  $.services   = []
  $.actrouter = new Router()


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
    {type$:'object',required$:['name','init'],string$:['name'],function$:['init','service']},
    {topname:'plugin',msgprefix:'register(plugin): ',callbackmaker:paramerr('seneca/register_invalid_plugin')}
  )
  self.register = function( plugin, pluginopts, cb ) {
    var origopts   = _.isFunction(pluginopts) ? {} : pluginopts
    var cbfunc = cb || pluginopts

    if( !_.isFunction(cbfunc) ) {
      throw self.fail({code:'seneca/register_no_callback'})      
    }

    paramcheck.register.validate(plugin)

    var fullname = plugin.name+(plugin.tag?'/'+plugin.tag:'')

    // adjust seneca api to be plugin specific
    var sd = self.delegate()
    sd.log = function() {
      var args = ['plugin',fullname]

      args = args.concat(arrayify(arguments))
      self.log.apply(self,args)
    }
    sd.fail = function() {
      var args = arrayify(arguments), cbI = -1
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


    self.act({role:'config',cmd:'get',base:fullname,default$:{}},self.err(cb,function(fullname_config){
      self.act({role:'config',cmd:'get',base:plugin.name,default$:{}},self.err(cb,function(name_config){
        var opts = _.extend({},name_config,fullname_config,origopts)
        do_register(opts)
      }))
    }))


    function do_register(opts) {
      log('register','init',plugin.name,plugin.tag)
      var pluginref = plugin.name+'~'+plugin.tag 
      $.pushready(pluginref)
      opts.tag$ = plugin.tag
      plugin.init(sd,opts,function(err,servicefunc){
        if( err ) {
          console.log(err)
          $.popready(pluginref,err,self)
          return cbfunc(err);
        }

        var key = plugin.name+(plugin.tag?'~'+plugin.tag:'')
        $.plugins[key] = plugin
        
        var service = servicefunc || (plugin.service && plugin.service())
        if( service ) {
          service.log = sd.log
          service.key = key
          $.services.push(service)
        }

        log('register','ready',plugin.name,plugin.tag,{service:!!service})
        $.popready(pluginref)
        cbfunc(null)
      })
    }
  }





  self.log = function(){
    log.apply(self,arrayify(arguments))
  }


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


    err_seneca.when = new Date().toISOString()
    err_seneca.mark = common.idgen(6)
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
      msg = msg + ' (context:'+err_seneca+')'
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
    log('fail',err.seneca.code,err.message,stack )

    self.emit('error',err)

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


  self.service = function( service ) {
    if( _.isFunction( service ) ) {
      service.log = self.log
      service.key = 'anon-'+uuid().substring(0,8)
      $.services.push(service)
    }
    else {
      return function(req,res,next) {
        function next_service(i) {
          if( i < $.services.length ) {
            var service = $.services[i]
          
            service(req,res,function(err){
              if( err ) return next(err);
              next_service(i+1)
            })
          }
          else next();
        }
        next_service(0)
      }
    }
  }


  self.httprouter = function(httproutedef) {
    return httproutedef ? httprouter(httproutedef) : noopservice
  }


  paramcheck.http = parambulator(
    {type$:'object',required$:['pin','map'],string$:['prefix'],object$:['pin','map']},
    {topname:'spec',msgprefix:'http(spec): ',callbackmaker:paramerr('seneca/http_invalid_spec')})

  self.http = function( spec ) {
    paramcheck.http.validate(spec)
    var prefix = spec.prefix || '/api/'

    function makedispatch(act,handler,opts) {
      return function( req, res, next ) {
        var args = _.extend(
          {},
          _.isObject(req.body)?req.body:{},
          _.isObject(req.query)?req.query:{},
          req.params?req.params:{}
        )

        if( spec.args ) {
          for( var argname in spec.args) {
            args[argname] = spec.args[argname](args[argname])
          }
        }


        handler( req, res, args, act, function(err,obj) {
          var objstr = err ? ''+err : safe_json_stringify(obj)
          var code   = err ? 500 : 200;

          res.writeHead(code,{
            'Content-Type': 'application/json',
            'Cache-Control': 'private, max-age=0, no-cache, no-store',
            "Content-Length": buffer.Buffer.byteLength(objstr) 
          })
          res.end( objstr )
        })
      }
    }

    function defaulthandler(req,res,args,act,done) {
      act(args,done)
    }


    var pin = self.pin(spec.pin)

    return httprouter(function(http){
      for( var fname in pin ) {
        var act = pin[fname]
        var url = prefix + fname
        var urlspec = spec.map[fname]
        if( !urlspec ) continue;

        urlspec.suffix = urlspec.suffix || ''

        var mC = 0
        for( var mI = 0; mI < httprouter.methods.length; mI++ ) {
          var m = httprouter.methods[mI]

          var handler = urlspec[m] || urlspec[m.toUpperCase()]
          if( handler ) {
            handler = _.isFunction(handler) ? handler : defaulthandler
            var dispatch = makedispatch(act,handler,{auth:urlspec.auth})
            var fullurl = url+urlspec.suffix
            http[m](fullurl, dispatch)
          }
        }

        if( 0 == mC ) {
          var dispatch = makedispatch(act,defaulthandler,{auth:urlspec.auth})
          var fullurl = url+urlspec.suffix
          //console.log(fullurl)
          http.get(fullurl, dispatch)
        }
      }
    })
  }




  // get plugin instance
  self.plugin = function( pluginname, tag ) {
    var key = pluginname+(tag?'~'+tag:'')
    var plugin = $.plugins[key]

    return plugin
  }



  // get a plugin's api
  self.api = function( pluginname ) {
    var plugin = self.plugin( pluginname )

    if( !plugin.api ) {
      throw self.fail({code:'seneca/api_not_found',pluginname:pluginname})
    }

    return plugin.api(self)
  }


  self.pin = function( pattern, pinopts ) {
    var methodkeys = []
    for( var key in pattern ) {
      if( /[\*\?]/.exec(pattern[key]) ) {
        methodkeys.push(key)
      }
    }

    var methods = $.actrouter.findall(pattern)

    var api = {}

    for( var mI = 0; mI < methods.length; mI++ ) {
      var mpat = methods[mI].match
      
      var methodname = ''
      for(var mkI = 0; mkI < methodkeys.length; mkI++) {
        methodname += ((0<mkI?'_':'')) + mpat[methodkeys[mkI]]
      }

      api[methodname] = (function(mpat) {
        return function(args,cb) {
          var fullargs = _.extend({},args,mpat)
          self.act(fullargs,cb)
        }
      })(mpat)
    }

    if( pinopts ) {
      if( pinopts.include ) {
        for( var i = 0; i < pinopts.include.length; i++ ) {
          var methodname = pinopts.include[i]
          if( self[methodname] ) {
            api[methodname] = common.delegate(self,self[methodname])
          }
        }
      }
    }

    return api
  }




  self.add = function(args,paramspec,actfunc) {
    var pb
    if( _.isFunction(paramspec) ) {
      actfunc = paramspec
    }
    else {
      pb = parambulator(paramspec)
    }

    if( !_.isFunction(actfunc) ) {
      throw self.fail({code:'seneca/actfunc_not_defined',args:args})
    }

    actfunc.parambulator = pb

    log('add',args)
    
    var addroute = true
    var parent = self.findact(args)

    if( parent ) {
      if( parent.handle ) {
        parent.handle(actfunc)
        addroute = false
      }
      else { 
        actfunc.parent = parent 
      }
    }

    actfunc.argpattern = owndesc(args)

    if( addroute ) {
      $.actrouter.add(args,actfunc)
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


  
  self.findact = function(args) {
    var actfunc = $.actrouter.find(args)
    return actfunc
  }


  self.act = function(args,cb) {
    var self = this
    cb = cb || noop

    var actfunc = self.findact(args)

    if( !actfunc ) {
      if( _.isUndefined(args.default$) ) {
        self.fail({code:'seneca/act_not_found',args:args},cb)
      }
      else return cb(null,args.default$);
    }
    else {
      // FIX: make this error nice to handle for calling code - git rid of circular ref
      if( actfunc.parambulator ) {
        actfunc.parambulator.validate(args,function(err){
          if( err ) return self.fail(err,cb)
          perform()
        })
      } else perform();
    }

    function perform() {
      var tag      = common.idgen(6)
      var argsdesc = actfunc.descdata ? actfunc.descdata(args) : descdata(args)
      log('act','in',tag,argsdesc )

      args.parent$ = actfunc.parent
      args.tag$    = tag

      try {
        self.emit('act-in', actfunc.argpattern, tag, args)
        actfunc(args,function(err){
          var args = arrayify(arguments)

          if( err ) {
            log('act','err',tag,err.message,stackfirst(err) )

            if( !err.seneca ) {
              return self.fail(err,cb)
            }
            else {
              cb.apply(null,args) // note: err == args[0]
            }
          }
          else {
            var emitargs = args.slice()
            emitargs.unshift(tag)
            emitargs.unshift(actfunc.argpattern)
            emitargs.unshift('act-out')
            self.emit.apply(self,emitargs)

            args[0] = null
            var resdesc = actfunc.descdata ? actfunc.descdata(args.slice(1)) : descdata(args.slice(1))
            var resout = _.flatten(['act','out',tag,resdesc], true)
            log.apply(null,resout)

            cb.apply(null,args)
          }
        })
      }
      catch( error ) {
        if( error.seneca ) throw error;

        log('act','err',tag, error.message, stackfirst(error) )
        throw self.fail( descerror({code:'seneca/act_error',args:args},error) )
      }
    }
  }







  self.close = function(cb){
    log('close')
    if( $.entity ) {
      $.entity.close$(cb)
    }
  }



  self.ready = function(ready) {
    if( !_.isFunction(ready) ) return;

    $.whenready(ready)

    /*
    $.ready = ready
    if( $.ready_args ) {
      var args = $.ready_args
      delete $.ready_args
      $.ready.apply(self,args)
    }
    */
  }


  // use('pluginname') - built-in, or provide calling code 'require' as seneca opt
  // use( require('pluginname') ) - plugin object, init will be called
  self.use = function( arg0, arg1, arg2 ) {
    var plugin = arg0

    var plugin_opts = _.isObject(arg1) && !_.isFunction(arg1) ? arg1 : {}
    var cb = _.isFunction(arg2) ? arg2 : (_.isFunction(arg1) ? arg1 : null) 

    var use_opts = _.extend({},opts)

    var plugindesc = {opts:plugin_opts}
    if( _.isString(plugin) ) {
      plugindesc.name = plugin
    }
    else if( _.isObject( plugin ) ) {
      plugindesc.plugin = plugin
    }

    use_opts.plugins = [ plugindesc ]

    initplugins(self,use_opts,function(err,seneca){
      if( err ) {
        if( cb ) {
          cb(err,seneca)
        }
        else throw err;
      }
      else {
        cb && cb(err,seneca)
      }
    })

    return self
  }


  self.inrepl = function() {
    self.on('act-out',function(){
      printlogger.apply(null,arrayify(arguments))
    })
    
    self.on('error',function(err){
      var args = arrayify(arguments).slice()
      args.unshift('ERROR: ')
      printlogger.apply(null,arrayify(args))
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


  self.toString = function() {
    return 'Seneca/'+self.version+'/'+self.id
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
      pin: common.delegate(self,self.pin),
      use: common.delegate(self,self.use),
      err: common.delegate(self,self.err),
      http: common.delegate(self,self.http),
      httprouter: common.delegate(self,self.httprouter),
      inrepl: common.delegate(self,self.inrepl),
      startrepl: common.delegate(self,self.startrepl),
      ready: common.delegate(self,self.ready),
      module: common.delegate(self,self.module),
      seneca: common.delegate(self,self.seneca),
      fail: common.delegate(self,self.fail),
      result: common.delegate(self,self.result),
      compose: common.delegate(self,self.compose),

      toString: common.delegate(self,self.toString),
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




function owndesc(obj,depth){
  if( 4 < depth ) { return ''+obj }

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
          sb.push(owndesc(obj[p],depth+1))
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


function printlogger() {

  var args = arrayify(arguments)

  var argstrs = []
  args.forEach(function(a){
    argstrs.push(
      null==a?a:
        'string'==typeof(a)?a:
        _.isDate(a)?(a.getTime()%1000000):
        _.isObject(a)?owndesc(a,0):a
    )
  })

  console.log( argstrs.join('\t') )
}







function init(opts,extcb) {
  opts = opts || {}


  opts.log = opts.log || opts.logger || opts.logging || noop

  if( 'print' == opts.log ) {
    opts.log = printlogger
  }

  // private context
  var $ = {}


  //function newseneca(entity) {
  var seneca = new Seneca($,opts)
  seneca.log('init','start')
  
  $.pushready('init')

  function call_extcb(err) {
    try {
      seneca.log('init','end')

      $.whenready(function(){
        seneca.emit('ready',err,seneca)
      })

      $.popready('init')

      if( extcb ) {
        extcb(err,seneca)
      }
    }
    catch( e ) {
      seneca.log('callback','err',e.message, stackfirst(e) )

      if( e.seneca ) {
        throw e
      }
      else {
        throw seneca.fail( descerror({code:'seneca/callback_exception'},e))
      }
    }
  }


  initplugins(seneca,opts,function(err){
    if( err ) return call_extcb(err);

    // set default plugins
    var connect_plugin = require('./plugin/connect')
    seneca.register( connect_plugin, {}, function(err) {
      if( err ) return call_extcb(err);
      
      if( !seneca.findact({role:'entity',cmd:'save'}) ) {
        var mem = mem_store.plugin()
        seneca.register(mem, {}, finish)
      }
      else {
        finish()
      }
    })


    // set default commands
    var closehandler_functions = []
    var closehandler = function(args,cb){
      var errs = []
      var outs = []
      function next(i) {
        if( i < closehandler_functions.length ) {
          closehandler_functions[i](args,function(err,out){
            if( err ) errs.push(err);
            outs.push(out)
            next(i+1)
          })
        }
        else {
          var lasterr = 0 < errs.length ? errs[errs.length-1] : null
          var lastout = 0 < outs.length ? outs[outs.length-1] : null
          cb(lasterr,lastout)
        }
      }
      next(0,null,[])
    }
    closehandler.handle = function(f) {
      closehandler_functions.push(f)
    }
    seneca.add({role:'seneca',cmd:'close'},closehandler)


    function finish() {
      var sd = seneca.delegate()
      sd.log = function() {
        var args = ['entity']
        seneca.log.apply(seneca,args.concat(arrayify(arguments)))
      }

      $.entity = new Entity({},sd)

      call_extcb(null)
    }
  })

  return seneca
}


function initplugins(seneca,opts,done) {
  var log = common.delegate(seneca,seneca.log,'init','plugin')

  var plugins = opts.plugins || []

  if( !_.isArray(plugins) ) {
    var pa = []
    for( var pn in plugins ) {
      var po = plugins[pn]
      var m = /^(.*?)`.*$/.exec(pn)
      pn = m ? m[1] : pn
      pa.push(_.extend({},po,{
        name:pn,
      }))
    }
    plugins = pa
  }


  //require('eyes').inspect(plugins, "found plugins:")


  function initplugin(pluginname,plugin,pluginopts,cb) {
    log('init',pluginname,pluginopts)
    seneca.register(plugin,pluginopts,cb)
  }


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
          var use_require = opts.require || module.parent.require || require

          // try to load as a seneca repo module
          log('require',pluginname,tag)

          var plugin_names = [pluginname,'seneca-'+pluginname]
          var parent_filename = (module.parent||{}).filename
          var paths = parent_filename ? [ path.dirname(parent_filename) ] : [] 
          paths = _.compact(paths.concat((module.parent||{}).paths||[]))

          var plugin_paths = plugin_names.slice()
          paths.forEach(function(path){
            plugin_names.forEach(function(name){
              plugin_paths.push(path+'/'+name)
            })
          })

          var first_err
          while( _.isUndefined(plugin_module = try_require(plugin_paths.shift())) );
          if( first_err ) throw first_err;

          function try_require(name) {
            if( !name ) return null;
            try {
              var found = use_require(name)
              first_err = null
              return found
            }
            catch(e) {
              first_err = first_err || e
              return undefined;
            }
          }
        }
        else throw e;
      }

      if( plugin_module ) {
        log('create',pluginname,tag)

        plugin = _.isFunction(plugin_module.plugin) ? plugin_module.plugin() : plugin_module

        
        if( !plugin.init ) {
          var initfunc = plugin
          plugin = {
            name:initfunc.name || initfunc.seneca_name || 'anon-'+uuid().substring(0,8),
            init:initfunc
          }
        }


        if( tag ) {
          plugin.tag = tag
        }
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
        var plugin

        if( _.isObject(pluginname) ) {
          var plugindesc = pluginname
          plugin     = plugindesc.plugin

          if( _.isFunction( plugin ) ){
            var initfunc = plugin
            plugin = {
              name:initfunc.name || initfunc.seneca_name || 'anon-'+uuid().substring(0,8),
              init:initfunc
            }
            pluginname = plugin.name
          }
          else {
            pluginname = plugindesc.name
          }

          pluginopts = plugindesc.options || plugindesc.opts || plugindesc.opt || {}
        }

        if( !plugin ) {
          plugin = resolveplugin( pluginname, pluginopts.tag )
        }

        if( plugin ) {
          initplugin( pluginname, plugin, pluginopts, function(err) {
            if( err ) {
              return seneca.fail({code:'seneca/init_plugin',pluginname:pluginname,pluginopts:pluginopts},done)//call_extcb)
            }
            else {
              eachplugin(pI+1)
            }
          })
        }
        else {
          return seneca.fail({code:'seneca/unknown_plugin',pluginname:pluginname},done)//call_extcb)
        }
      }
      catch( e ) {
        // bubble out exceptions from external callback
        if( e.seneca ) {
          throw e
        }
        else {
          return seneca.fail( descerror({code:'seneca/plugin_exception',pluginname:pluginname},e),done)//call_extcb)
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


init.Store = require('./plugin/store.js').Store



init.module = function( plugin_func, pin ) {
  var fn = function() {
    var args = arrayify(arguments)

    // plugin registration, args are actually si,opts,cb
    if( args[0] && args[0].seneca ) {
      return plugin_func.apply(this,args)
    }
    else {
      // call require('pluginname')(pluginopts,senecaopts)
      var si = init(args[1]||{})
      si.use(plugin_func,args[0]||{})
      return si.pin(pin,{include:['seneca']})
    }
  }
  fn.seneca_name = plugin_func.name
  return fn
}



module.exports = init

