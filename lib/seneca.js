/* Copyright (c) 2010-2014 Richard Rodger, MIT License */
/* jshint node:true, asi:true, eqnull:true */
"use strict";



// Current version, access using _seneca.version_ property
var VERSION = '0.5.17'


// Node API modules
var util     = require('util')
var events   = require('events')
var net      = require('net')
var repl     = require('repl')
var path     = require('path')
var buffer   = require('buffer')


// External modules
var _            = require('underscore')
var async        = require('async')
var optimist     = require('optimist')
var nid          = require('nid')
var jsonic       = require('jsonic')
var patrun       = require('patrun')
var parambulator = require('parambulator')
var norma        = require('norma')
var stats        = require('rolling-stats')


// Internal modules
var Entity     = require('./entity').Entity
var store      = require('./store')
var logging    = require('./logging')


// Utility functions
var common   = require('./common')
var arrayify = common.arrayify
var noop     = common.noop




// Create a new Seneca instance.
//
//    * $     &rarr;  private context
//    * opts  &rarr;  options
function make_seneca($, opts) {

  // Seneca is an EventEmitter.
  function Seneca(){
    events.EventEmitter.call(this)
  }
  util.inherits(Seneca, events.EventEmitter)

  var self = new Seneca()


  // Expose the current version of Seneca
  self.version = VERSION


  // Create a unique identifer for this instance.
  self.id = nid()



  // ### seneca.add
  // Add an message pattern and action function.
  //
  // `seneca.add( pattern, action )`  
  //
  //    * _pattern_ (object or string)  &rarr;  pattern definition
  //    * _action_ (function)           &rarr;  function executed when input to `seneca.act` matches pattern
  //
  // `seneca.add( pattern_string, pattern_object, action )`  
  //
  //    * _pattern_string_ (string)  &rarr;  pattern definition as jsonic string  
  //    * _pattern_object_ (object)  &rarr;  pattern definition as object  
  //    * _action_ (function)        &rarr;  function executed when input to `seneca.act` matches pattern.  
  //
  // The pattern is defined by the top level properties of the _pattern_ parameter.
  // In the case where the pattern is a string, it is first parsed by [jsonic](https://github.com/rjrodger/jsonic)
  //
  // If the value of a pattern property is a sub-object, this is interpreted as a 
  // [parambulator](https://github.com/rjrodger/parambulator) validation check. In this case, the property
  // is not considered part of the pattern, but rather an argument to validate when _seneca.act_ is called.
  self.add = api_add



  self.logroute   = api_logroute
  self.err        = api_err
  self.register   = api_register
  self.depends    = api_depends
  self.export     = api_export

  self.make       = api_make
  self.make$      = api_make
  self.listen     = api_listen
  self.client     = api_client
  self.cluster    = api_cluster
  self.hasplugin  = api_hasplugin
  self.findplugin = api_findplugin
  self.pin        = api_pin
  self.declare    = api_declare

  self.findact    = api_findact
  self.hasact     = api_hasact
  self.actroutes  = api_actroutes
  self.list       = api_list
  self.act        = api_act
  self.act_if     = api_act_if
  self.wrap       = api_wrap
  self.close      = api_close
  self.ready      = api_ready
  self.use        = api_use
  self.seneca     = api_seneca
  self.fix        = api_fix
  self.delegate   = api_delegate



  // Legacy aliases for log option.
  opts.log = opts.log || opts.logger || opts.logging || {}


  // Option defaults.
  // _deepextend_ is like underscore.extend, but also traverses sub-objects
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
    },
    deathdelay:33333,
    message:MSGMAP,
    test:{
      silent:false,
      stayalive:false
    }
  },opts)


  // legacy api
  if( 'print'==opts.log ) {
    opts.log = {map:[{level:'all',handler:'print'}]}
  }



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
      {level:'info+',handler:'print'}
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



  self.toString   = api_toString


  self.fail = makefail.call(self,{type:'sys',plugin:'seneca',tag:self.version,id:self.id})


  // say hello, printing identifier to log
  if( !opts.test.silent ) {
    self.log.info('hello',self.toString())
  }





  // TODO: if no args, return printout
  function api_logroute(entry,handler){
    entry.handler = handler || entry.handler
    logging.makelogroute(entry,$.logrouter)
  }




  function paramerr(code){
    return function(cb){
      return function(err){ 
        if(err){
          throw self.fail(code,{message:err.message})
        }
        else if( cb ) { 
          return cb();
        }
      }
    }
  }



  // errfn = required, function; winfn = required, function or boolean, if false, no call
  function api_err( errfn, winfn ) {
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





  var paramcheck = {}

  paramcheck.register = parambulator({
    type$:     'object',
    required$: ['name','init'],
    string$:   ['name'],
    function$: ['init','service'],
    object$:   ['opts']
  },{
    topname:'plugin',
    msgprefix:'register(plugin): ',
    callbackmaker:paramerr('seneca/register_invalid_plugin')
  })


  paramcheck.register = parambulator(
    {type$:'object',required$:['name','init'],string$:['name'],function$:['init','service'],object$:['opts']},
    {topname:'plugin',msgprefix:'register(plugin): ',callbackmaker:paramerr('seneca/register_invalid_plugin')}
  )
  function api_register( plugin, cbfunc ) {
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

    sd.die  = makedie.call(  sd,{type:'plugin',plugin:plugin.name})
    sd.fail = makefail.call( sd,{type:'plugin',plugin:plugin.name})


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

      opts = opts || {}

      // get options
      if( 'options' != plugin.name ) {
        self.act({role:'options',cmd:'get',base:fullname,default$:{}},function(err,fullname_options){
          if(err) return cbfunc(err);

          var shortname = fullname != plugin.name ? plugin.name : null
          if( !shortname && 0 === fullname.indexOf('seneca-') ) {
            shortname = fullname.substring('seneca-'.length)
          }
        
          if( shortname ) {
            self.act({role:'options',cmd:'get',base:shortname,default$:{}},function(err,name_options){
              if(err) return cbfunc(err);

              var opts = _.extend({},name_options,fullname_options,plugin.opts||{})
              do_init(opts)
            })
          }
          else do_init( _.extend({},fullname_options,plugin.opts||{}) )
        })
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


        if( !plugin.declare ) {
          $.ready_queue.push({cb:function(done){
            self.act({init:plugin.name,tag:plugin.tag,default$:{},proxy$:false},function(err,out){
              if( !err ) {
                self.log.debug('register','ready',pluginref,out)
              }
              done(err)
            })
          }})
        }

        var exports = []
        
        if( void 0 != meta.export ) {
          $.exports[plugin.name] = meta.export
          exports.push(plugin.name)

          $.exports[pluginref] = meta.export
          exports.push(pluginref)
        }

        if( _.isObject(meta.exportmap) || _.isObject(meta.exports) ) {
          meta.exportmap = meta.exportmap || meta.exports
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



  
  function api_depends() {
    var args = norma('{pluginname:s deps:a? moredeps:s*}',arguments)
    
    var deps = args.deps || args.moredeps

    _.every(deps, function(depname){
      if( !_.contains($.plugin_order.byname,depname) &&
          !_.contains($.plugin_order.byname,'seneca-'+depname) ) {
        self.die('plugin_required',{name:args.pluginname,dependency:depname})
        return false
      }
      else return true;
    })
  }



  function api_export( key ) {
    // transitional hack - FIX: create web plugin to handle HTTP end points
    if( 'web' == key ) {
      return self.service()
    }
    else return $.exports[key];
  }



  // die
  // args: code, value*
  // context: key
  // - calls fail:prepare
  // - construct log entry, and issue error log
  // - print user friendly to stderr
  // - calls close
  //   - new actions fail
  //   - waits for in-process actions to complete, under timeout
  // - kills process


  // Error arguments:
  // code
  // code, values
  // code, Error, values
  // Error (optional code,message properties), values
  // values (optional code,message properties)
  function handle_error_args( args, ctxt ) {
    args = arrayify(args)

    var first = args[0]
    var valstart = 1

    var code = 'unknown'
    code = _.isString(first) ? first : code 
    code = util.isError(first) && _.isString(first.code) ? first.code : code
    code = _.isObject(first) && _.isString(first.code) ? first.code : code 


    if( _.isObject(first) && !util.isError(first) ) {
      valstart = 0
    }

    var error = util.isError(first) ? first : util.isError(args[1]) ? (valstart=2,first) : null

    var valmap = _.isObject(args[valstart]) ? args[valstart] : {}

    var message = (opts.message[ctxt.plugin] && opts.message[ctxt.plugin][code])
    message = _.isString(message) ? message : (_.isString(valmap.message) && valmap.message)
    message = _.isString(message) ? message : (error && _.isString(error.message) && error.message)
    message = _.isString(message) ? message : code


    // workaround to prevent underscore blowing up if properties are not found
    // reserved words and undefined need to be suffixed with $ in the template interpolates

    var valstrmap = {}
    _.each(valmap,function(val,key){
      /* jshint evil:true */
      try { eval('var '+key+';') } catch(e) { key = key+'$' }
      if( {'undefined':1,'NaN':1}[key] ) { key = key+'$' }
      valstrmap[key] = (_.isObject(val) ? common.owndesc(val,1) : ''+val)
    })

    var done = false
    while( !done ) {
      try {
        message = _.template( message, valstrmap )
        done = true
      }
      catch(e) {
        if(e instanceof ReferenceError) {
          var m = /ReferenceError:\s+(.*?)\s+/.exec(e.toString())
          if( m && m[1] ) {
            valstrmap[m[1]]="["+m[1]+"?]"
          }
          else done = true
        }
        else {
          done = true
          message = message+' VALUES:'+common.owndesc(valmap,2)
        }
      }
    }

    return {
      code:code,
      error:error,
      message:message,
      remaining:args.slice(valstart),
      valmap:valmap
    }
  }


  function makedie( ctxt ) {
    var instance = this
    ctxt = _.extend(ctxt,instance.die?instance.die.context:{})

    var die = function() {
      var self = this

      var args = handle_error_args(arguments,ctxt)

      var code    = args.code
      var error   = args.error
      var message = args.message

      // stayalive is only for testing, do not use in production
      var stayalive = opts.test.stayalive || (error && error.stayalive)

      if( !error ) {
        error = new Error(code)
      }

      var logargs  = [ctxt.type, ctxt.plugin, ctxt.tag, ctxt.id, code]
            .concat( message && message != code ? message : void 0 )
            .concat( args.remaining )

      // TODO: should use self.log here
      if( !opts.test.silent ) {
        instance.log.fatal.apply( self, logargs )
      }

      var stack = error.stack
      stack = stack.replace(/^.*?\n/,'\n')

      var procdesc = process.pid // + more

      var stderrmsg =
            "\n\n"+
            "Seneca Fatal Error\n"+
            "==================\n\n"+
            "Message: "+message+"\n\n"+
            "Code: "+code+"\n\n"+
            "Stack: "+stack+"\n\n"+
            "Instance: "+self.toString()+"\n\n"+
            "When: "+new Date().toISOString()+"\n\n"+
            "Log: "+common.owndesc(logargs,3)+"\n\n"+
            "Node: "+util.inspect(process.versions).replace(/\s+/g,' ')+"\n\n"+
            "Process: pid="+procdesc+", path="+process.execPath+", args="+util.inspect(process.argv)+"\n\n"

      if( stayalive ) {
        error = new Error(stderrmsg)
        error.seneca = {
          code:code,
          when:new Date().toISOString(),
          valmap:args.valmap
        }
        throw error
      }


      // this blocks, but that's ok, we want to be sure the error description is printed to STDERR
      if( !opts.test.silent ) {
        console.error( stderrmsg )
      }

      // terminate process, err (if defined) is from seneca.close
      function die( err ) {
        if( !stayalive ) {
          process.nextTick(function(){
            if( err ) console.error( err );
            console.error("Terminated at "+(new Date().toISOString())+".\n\n")
            process.exit(1)
          })
        }
      }

      self.close( die )

      // make sure we close down within options.deathdelay seconds
      if( !stayalive ) {
        var killtimer = setTimeout(function() {
          console.error("Terminated (on timeout) at "+(new Date().toISOString())+".\n\n")
          process.exit(2);
        }, opts.deathdelay);
        killtimer.unref();
      }
    }

    die.context = ctxt
    
    return die
  }
  

  self.die = makedie.call(self,{type:'sys',plugin:'seneca',tag:self.version,id:self.id})




  function makefail( ctxt ) {
    var instance = this
    ctxt = _.extend(ctxt,instance.fail?instance.fail.context:{})

    var fail = function() {
      var self = this

      var args = handle_error_args(arguments,ctxt)

      var code    = args.code
      var error   = args.error
      var message = args.message


      message = self.toString()+': '+message
      message = message.replace(/[\r\n]/g,' ')

      if( error ) {
        error.message = message
      }
      else {
        error = new Error(message)
      }

      error.seneca = {
        code:code,
        when:new Date().toISOString(),
        valmap:args.valmap
      }

      /*
      var logargs  = [ctxt.type, ctxt.plugin, ctxt.tag, ctxt.id, code]
            .concat( message && message != code ? message : void 0 )
            .concat( args.remaining )

      if( !opts.test.silent ) {
        // TODO: should use self.log here
        instance.log.error.apply( self, logargs )
        instance.emit('error',error)
      }
       */

      return error;
    }

    fail.context = ctxt

    return fail
  }








  // all optional
  function api_make() {
    var args = arrayify(arguments)
    var si = (this && this.seneca) ? this : self
    args.unshift(si)
    return $.entity.make$.apply($.entity,args)
  }
  self.make$ = self.make





  function api_listen() {
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




  function api_client() {
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

    $.ready_queue.push({cb:function(done){
      self.act('role:transport,cmd:client',{config:config},function(err,out){
        if(err) throw err;

        send = out
        done()

        process()
      })
    }})


    var findact = _.bind(self.findact,self)
    var client = self.delegate()
    client.findact = function( args ) {
      var actmeta = findact( args )
      if( actmeta && !args.proxy$ ) return actmeta;

      actmeta = {
        func: client_act,
        plugin_nameref:'-',
        log:client.log,
        argpattern:common.owndesc(args),
        id:'CLIENT'
      }

      return actmeta
    }

    self.proxy$ = client

    return client
  }



  function api_cluster() {
    /* jshint loopfunc:true */
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




  function api_hasplugin(plugindesc,tag) {
    return !!self.findplugin(plugindesc,tag)
  }


  // get plugin instance
  function api_findplugin(plugindesc,tag) {
    var name = plugindesc.name || plugindesc
    tag = plugindesc.tag || tag

    var key = name+(tag?'/'+tag:'')
    var plugin = $.plugins[key]

    return plugin
  }



  function api_pin( pattern, pinopts ) {
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


  var pm_custom_args = {
    rules: {
      entity$: function(ctxt,cb) {
        var val = ctxt.point
        if( val.entity$ ) {
          if( val.canon$({isa:ctxt.rule.spec}) ) {
            return cb();
          }
          else return ctxt.util.fail(ctxt,cb);
        }
        else return ctxt.util.fail(ctxt,cb);
      }
    },
    msgs: {
      entity$: 'The value <%=value%> is not a data entity of kind <%=rule.spec%> (property <%=parentpath%>).'
    }
  }


  // params: argstr,argobj,actfunc,actmeta
  function api_add() {
    var self = this
    var args = parse_pattern(self,arguments,'action:f actmeta:o?')

    var pattern   = args.pattern
    //var paramspec = args.paramspec
    var action    = args.action
    var actmeta   = args.actmeta || {}


    if( 0 === _.keys( pattern ) ) {
      throw self.fail({code:'seneca/no-action-pattern',args:args})
    }


    //var pm = args.paramspec ? parambulator(args.paramspec) : null
    //console.dir(pattern)
    var pattern_rules = {}
    _.each( pattern, function(v,k){ 
      if( _.isObject(v) ) {
        pattern_rules[k] = v
        delete pattern[k]
      }
    })
    
    if( 0 < _.keys(pattern_rules).length ) {
      actmeta.parambulator = parambulator(pattern_rules, pm_custom_args)
    }

    var addroute  = true
    var priormeta = self.findact( pattern )

    actmeta.args = _.clone( pattern )
    actmeta.argpattern = common.owndesc( pattern )
    actmeta.id = nid()

    actmeta.func = action

    if( priormeta ) {
      if( _.isFunction(priormeta.handle) ) {
        priormeta.handle(action)
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
    if( action && actmeta && _.isFunction(action.handle) ) {
      actmeta.handle = action.handle
    }


    $.stats.actmap[actmeta.argpattern] = 
      $.stats.actmap[actmeta.argpattern] || 
      {id:actmeta.id,
       plugin:{full:actmeta.plugin_fullname,name:actmeta.plugin_nameref,tag:actmeta.plugin_tag},
       prior:actmeta.priorpath,calls:0,done:0,fails:0,time:{}}
    
    if( addroute ) {
      var plugin_name = (actmeta.plugin_nameref && actmeta.plugin_nameref[0]) || '-' 
      var plugin_tag  = (actmeta.plugin_nameref && actmeta.plugin_nameref[1]) || '-' 
      self.log.debug('add',plugin_name,plugin_tag,pattern,actmeta.id)
      $.actrouter.add(pattern,actmeta)
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


  
  function api_findact(args) {
    var actmeta = $.actrouter.find(args)
    return actmeta
  }



  function api_hasact(args) {
    return !!$.actrouter.find(args)
  }



  self.findpins = self.pinact = function() {
    var pins = []
    var patterns = _.flatten(arrayify(arguments))
    _.each( patterns, function(pattern){
      pattern = _.isString(pattern) ? jsonic(pattern) : pattern
      pins = pins.concat( _.map( $.actrouter.findall(pattern), function(desc) {return desc.match} ) )
    })
    return pins
  }



  function api_actroutes() {
    return $.actrouter.toString(function(d){
      var s = 'F='

      if( d.plugin_fullname ) {
        s+=d.plugin_fullname+'/'
      }

      s+=d.id

      while( d.priormeta ) {
        d = d.priormeta
        s+=';'

        if( d.plugin_fullname ) {
          s+=d.plugin_fullname+'/'
        }

        s+=d.id

      }
      return s
    })
  }



  function api_list( args ) {
    var found = $.actrouter.findall( args )
    
    found = _.map( found, function(entry){
      return entry.match
    })
    return found
  }



  function handle_act_args(self,orig) {
    var args = parse_pattern( self, orig, 'done:f?' )
    var done = args.done ? args.done : noop

    return [args.pattern,done]
  }



  function api_act_if() {
    var self = this
    var args = norma('{execute:b actargs:.*}',arguments)

    if( args.execute ) {
      return self.act.apply( self, args.actargs )
    }
    else return self;
  }



  // Perform an action. The propeties of the first argument are matched against known patterns, and the most specific one wins.
  function api_act() {
    var self = this

    var argscb = handle_act_args(self,arrayify(arguments))
    var args = argscb[0]
    var cb   = argscb[1]

    var actmeta = self.findact(args)

    function provide_default() {
      self.log.debug('act','-','-','-','DEFAULT',args)
      cb.call(self,null,args.default$);
    }

    if( !actmeta ) {
      //if( self.proxy$ && false !== args.proxy$ && ((actmeta && false !== actmeta.proxy)||true) ) {
      if( self.proxy$ && false !== args.proxy$ ) {
        return self.proxy$.act(args,function(err,out){
          if( err && err.seneca && 'ECONNREFUSED' == err.seneca.code && !_.isUndefined(args.default$) ) {
            provide_default()
          }
          else cb(err,out)
        })
      }
      else if( _.isUndefined(args.default$) ) {
        throw self.fail('act_not_found',{args:args})
      }
      else provide_default()
    }
    else do_act(self,actmeta,false,args,cb)

    return self
  }



  function api_wrap(pin,wrapper) {
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



  function api_close(done) {
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



  function api_ready(ready) {
    if( !_.isFunction(ready) ) return;
    $.ready_queue.push({
      ready:ready
    })
  }



  // use('pluginname') - built-in, or provide calling code 'require' as seneca opt
  // use( require('pluginname') ) - plugin object, init will be called
  // if first arg has property senecaplugin 
  function api_use( arg0, arg1, arg2 ) {
    var self = this

    var plugindesc = build_plugindesc( arg0, arg1, arg2 )

    resolve_plugin(plugindesc,self,opts)
    self.register( plugindesc, plugindesc.callback )

    return self
  }



  function api_declare( arg0, arg1, arg2 ) {
    var self = this

    var plugindesc = build_plugindesc( arg0, arg1, arg2 )
    plugindesc.declare = true

    resolve_plugin(plugindesc,self,opts)
    self.register( plugindesc, plugindesc.callback )

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

  
  /// Return self. Mostly useful as a check that this is a Seneca instance.
  function api_seneca() {
    return self
  }



  // Describe this instance using the form: Seneca/VERSION/ID
  function api_toString() {
    return 'Seneca/'+self.version+'/'+self.id
  }



  function do_act(instance,actmeta,isprior,origargs,cb){
    var act_start = new Date().getTime()

    var args = _.clone(origargs)

    // TODO: doesn't really work, as requires all sub actions to use 'this'
    var actid = ((instance.fixedargs&&instance.fixedargs.actid)?instance.fixedargs.actid+'/':'')+nid()

    
    // FIX: make this error nice to handle for calling code - get rid of circular ref
    if( actmeta.parambulator ) {
      actmeta.parambulator.validate(args,function(err){

        if( err ) {
          throw instance.fail('invalid-act-args',{message:err.message})
        }

        return perform(actmeta)
      })
    } 
    else return perform(actmeta);


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

        // fixed args are not used for finding actions!!!
        if( delegate.fixedargs ) {
          callargs = _.extend({},args,delegate.fixedargs)
        }
        
        $.stats.act.calls++
        actstats.calls++
        var actstart = Date.now()



        delegate.good = function(out) {
          act_done(null,out)
        }

        delegate.bad = function(err) {
          act_done(err)
        }



        var act_done = function(err) {
          var actend = Date.now()
          $.timestats.point( actend-actstart, actmeta.argpattern )

          var args = arrayify(arguments)

          if( err ) {
            $.stats.act.fails++
            actstats.fails++
            instance.log.error('act','err',actid,err.message,stackfirst(err) )
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
          }
          
          try {
            cb.apply(delegate,args) // note: err == args[0]
          }
          // for errors thrown inside the callback
          catch( er ) {
            var error = er
            if( error.seneca ) {
              error.seneca.callback = true
              throw error;
            }

            // handle throws of non-Error values
            if( !util.isError(error) ) {
              if( _.isObject(error) ) {
                error = new Error(common.owndesc(error,1))
              }
              else {
                error = new Error(''+error)
              }
            }

            var err = instance.fail( error, {args:args} )

            if( !opts.test.silent) {
              self.log.error('act','err',actid, 'callback', err.message, actmeta.id, stackfirst(error) )
            }

            // mark this as an exception from a callback
            // to be rethrown by seneca.act - not much point sending it back to the callback that created it! 
            err.seneca.callback = true
            throw err;
          }
        }


        // FIX: needs a timeout!!!
        actmeta.func.call(delegate,callargs,act_done)
      }

      // for errors inside the action
      catch( er ) {
        var ex = er

        if( ex.seneca && ex.seneca.callback ) {
          throw ex
        }

        // handle throws of non-Error values
        if( !util.isError(ex) ) {
          if( _.isObject(ex) ) {
            ex = new Error(common.owndesc(ex,1))
          }
          else {
            ex = new Error(''+ex)
          }
        }

        var err = ex
        if( !ex.seneca ) {

          // FIX: use new error code format
          // sent to callback as inside action
          //err = instance.fail( descerror({code:'seneca/act_error',args:args},ex))
          err = instance.fail( ex, {args:args} )
        }

        var actend = new Date().getTime()

        $.stats.act.fails++
        actstats.fails++

        if( !opts.test.silent) {
          self.log.error('act','err',actid, ex.message, actmeta.id, stackfirst(ex) )
        }

        cb.call( delegate, err )
      }
    }
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
    /* jshint loopfunc:true */

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
    argprops: argprops,

    print: function(err,out){
      if(err) throw err;

      console.log(util.inspect(out,{depth:null}))
      for(var i = 2; 2 < arguments.length; i++) {
        console.dir(arguments[i])
      }
    }
  }


  self.store = {
    init: store.init,
    cmds: store.cmds
  }



  // string args override object args
  function parse_pattern(instance,args,normaspec,fixed) {
    args = norma('{strargs:s? objargs:o? '+(normaspec||'')+'}', args)

    try {
      return _.extend(
        args,
        { pattern: _.extend(
          args.objargs ? args.objargs : {},
          args.strargs ? jsonic( args.strargs ) : {},
          fixed || {} )
        })
    }
    catch( e ) {
      var col = 1==e.line?e.column-1:e.column
      throw instance.fail('add_string_pattern_syntax',{argstr:args,syntax:e.message,line:e.line,col:col})
      //throw instance.fail({code:'seneca/string-pattern-syntax-error',args:args})
    }
  }



  function api_fix() {
    var self = this

    var defargs = parse_pattern(self,arguments)

    var fix = self.delegate( defargs.pattern )

    fix.add = function() {
      var args    = parse_pattern(fix,arguments,'rest:.*',defargs.pattern)
      var addargs = [args.pattern].concat(args.rest)
      return self.add.apply(fix,addargs)
    }
    
    return fix
  }



  function api_delegate(fixedargs) {
    var self = this

    var delegate = Object.create(self)
    var act = delegate.act

    delegate.act = function(){
      var argscb = handle_act_args(this,arrayify(arguments))

      // can't override fixedargs
      var args = _.extend({},argscb[0],fixedargs)

      var cb = argscb[1]

      act.call(this,args,cb)

      return delegate
    }

    var strdesc
    delegate.toString = function(){
      if( strdesc ) return strdesc;
      var vfa = {}
      _.each(fixedargs,function(v,k){
        if( ~k.indexOf('$') ) return;
        vfa[k]=v
      })

      strdesc = self.toString()+(_.keys(vfa).length?'/'+common.owndesc(vfa,0,false):'')

      return strdesc
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

      var summary = (null == args.summary && false) || (/^false$/i.exec(args.summary) ? false : !!(args.summary) )
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


  // setup delegate
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



// makes require('seneca').use( ... ) work by creating an on-the-fly instance
init.use = function() {
  var instance = init()
  return instance.use.apply(instance,arrayify(arguments))
}


module.exports = init



// A middleware service that does nothing. 
function noopservice( req, res, next ) {
  if( next ) return next();
}


function stackfirst( error ) {
  //return ( error && error.stack && (error.stack+' \n ').split('\n')[1] ) || ''

  var out = ''
  if( error && error.stack ) {
    var lines = error.stack.split('\n')
    var done = false
    for( var i = 1; i < lines.length; i++ ) {
      var line = lines[i]

      done = (
        !line.match(/\/seneca.js/) &&
        !line.match(/\/norma.js/)
      )

      if( done ) {
        return line;
      }
    }
  }

  return out
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


function build_plugindesc( arg0, arg1, arg2 ) {
  var parentmodule = module.parent
  var plugin = arg0 ? (arg0.senecaplugin || arg0) : null

  var plugin_opts = (_.isObject(arg1) || _.isString(arg1) || _.isNumber(arg1) || _.isBoolean(arg1) ) && 
        !_.isFunction(arg1) ? arg1 : {}
  var cb = _.isFunction(arg2) ? arg2 : (_.isFunction(arg1) ? arg1 : null) 

  plugin_opts = _.isString(arg1) || _.isNumber(arg1) || _.isBoolean(arg1) ? {value$:plugin_opts} : plugin_opts

  var plugindesc = {opts:plugin_opts,callback:cb}

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

  return plugindesc
}


// finds the plugin module using require
// the module must be a function
// sets plugindesc.init to be the function exposed by the module
function resolve_plugin( plugindesc, seneca, opts ) {
  seneca.log.debug('register','resolve',common.owndesc(plugindesc,1))

  var use_require = opts.require || plugindesc.parentmodule.require || require


  function try_require(name) {
    var first_err = null
    var found

    if( !name ) return found;

    try {
      plugindesc.searched_paths.push(name)
      found = use_require(name)
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
    return seneca.die('plugin_no_name',plugindesc)
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
        seneca.die('plugin_bad_init',plugindesc)
      }

      plugindesc.init = initfunc
    }
    else {
      seneca.die('plugin_not_found',plugindesc)
    }
  }
}



var MSGMAP = {
  seneca:{
    test_prop: 'TESTING: exists: <%=exists%>, notfound:<%=notfound%>, str=<%=str%>, obj=<%=obj%>, arr=<%=arr%>, bool=<%=bool%>, null=<%=null$%>, delete=<%=delete$%>, undefined=<%=undefined$%>, void=<%=void$%>, NaN=<%=NaN$%>',

    plugin_required:   'Plugin "<%=name%>" depends on plugin "<%=dependency%>", which is not yet loaded.',
    plugin_bad_init:   'Plugin "<%=name%>" definition should be an initialisation function.',
    plugin_not_found:  'Plugin "<%=name%>" could not be found.',
    plugin_no_name:    'Plugin does not have a name.',

    add_string_pattern_syntax: 'Could not add action due to syntax error in pattern string: "<%=argstr%>": Line:<%=line%>, Column:<%=col%>; <%=syntax%>',
    act_string_args_syntax: 'Could execute action due to syntax error in argument string: "<%=argstr%>": Line:<%=line%>, Column:<%=col%>; <%=syntax%>',

    add_pattern_object_expected_after_string_pattern: 'Could not add action; unexpected argument; a pattern object or function should follow the pattern string; arguments were: <%=args%>.',
    add_pattern_object_expected: 'Could not add action; unexpected argument; a pattern object or string should be the first argument; arguments were: <%=args%>.',

    add_action_function_expected: 'Could not add action: the action function should appear after the pattern; arguments were: <%=args%>.',
    add_action_metadata_not_an_object: 'Could not add action: the argument after the action function should be a metadata object: <%=actmeta%>.',

    act_if_expects_boolean: 'The method act_if expects a boolean value as its first argument, was: "<%=first%>".',

    act_not_found: 'No matching action pattern found for "<%=args%>", and no default result provided (using a default$ property).',
    act_no_args: 'No action pattern defined in "<%=args%>"; the first argument should be a string or object pattern.'
  }
}


