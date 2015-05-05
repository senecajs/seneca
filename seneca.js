/* Copyright (c) 2010-2015 Richard Rodger, MIT License */
/* jshint node:true, asi:true, eqnull:true */
"use strict"; 


// Current version, access using _seneca.version_ property
var VERSION = '0.6.1'

// Polyfills for cross-browser support.
require('setimmediate');

// Node API modules
var util     = require('util')
var events   = require('events')
var net      = require('net')
var repl     = require('repl')
var assert   = require('assert')


// External modules
var _            = require('lodash')
var minimist     = require('minimist')
var nid          = require('nid')
var jsonic       = require('jsonic')
var patrun       = require('patrun')
var parambulator = require('parambulator')
var norma        = require('norma')
var stats        = require('rolling-stats')
var makeuse      = require('use-plugin')
var lrucache     = require('lru-cache')
var zig          = require('zig')
var gex          = require('gex')
var executor     = require('gate-executor')

var error        = require('eraro')({
  package:  'seneca',
  msgmap:   ERRMSGMAP(),
  override: true
})


// Internal modules
var make_entity  = require('./lib/entity')
var store        = require('./lib/store')
var logging      = require('./lib/logging')
var plugin_util  = require('./lib/plugin-util')
var makeoptioner = require('./lib/optioner')


// Utility functions
var common   = require('./lib/common')


// Abbreviations
var arr = common.arrayify


// Exports.
module.exports = init


// Create a new Seneca instance.
//
//    * initial_options  &rarr;  options
function make_seneca( initial_options ) {
  /* jshint validthis:true */


  // Create a private context.
  var private$ = {
    stats: {
      start: Date.now(),
      act: {
        calls: 0,
        done:  0,
        fails: 0,
        cache: 0
      },
      actmap:{}
    }
  }


  initial_options = initial_options || {}

  // Seneca is an EventEmitter.
  function Seneca() {
    events.EventEmitter.call(this)
    this.setMaxListeners(0)
  }
  util.inherits(Seneca, events.EventEmitter)

  var root = new Seneca()
  root.root      = root
  root.fixedargs = {}

  root.context = {}

  // Expose the current version of Seneca
  root.version = VERSION



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
  root.add = api_add


  root.sub = api_sub


  root.logroute   = api_logroute
  root.register   = api_register
  root.depends    = api_depends
  root.export     = api_export

  root.make       = api_make
  root.make$      = api_make
  root.listen     = api_listen
  root.client     = api_client
  root.cluster    = api_cluster
  root.hasplugin  = api_hasplugin
  root.findplugin = api_findplugin
  root.pin        = api_pin

  root.has        = api_hasact
  root.hasact     = api_hasact

  root.actroutes  = api_actroutes
  root.list       = api_list
  root.act        = api_act
  root.act_if     = api_act_if
  root.wrap       = api_wrap
  root.close      = api_close
  root.ready      = api_ready
  root.use        = api_use
  root.seneca     = api_seneca
  root.fix        = api_fix
  root.delegate   = api_delegate

  root.options    = api_options


  root.findact       = api_findact
  root.findact.mark  = 'top'

  root.start = api_start


  // Legacy API; Deprecated.

  root.fail = function(){
    var args = common.arrayify(arguments)

    var cb = _.isFunction(arguments[arguments.length-1]) ?
          arguments[arguments.length-1] : null

    if( cb ) {
      args.pop()
    }

    if( _.isObject( args[0] ) ) {
      var code = args[0].code
      if( _.isString(code) ) {
        args.unshift(code)
      }
    }

    var err = error.apply(null,args)
    err.callpoint = new Error().stack.match(/^.*\n.*\n\s*(.*)/)[1]
    err.seneca = { code: err.code, valmap:err.details }
    
    this.log.error(err)
    if( so.errhandler ) {
      so.errhandler.call(this,err)
    }

    if( cb ) {
      cb.call(this,err)
    }

    return err;
  }



  var paramcheck = {}

  paramcheck.options = parambulator({
    tag:        { string$:true },
    idlen:      { integer$:true },
    timeout:    { integer$:true },
    errhandler: { function$:true },
  },{
    topname:       'options',
    msgprefix:     'seneca( {...} ): ',
  })




  var argv = minimist(process.argv.slice(2))


  // Resolve options.
  var optioner = private$.optioner = 
        makeoptioner( 
          argv, 
          initial_options.module || module.parent || module,
          
          // Default options.
          {
            tag:             '-',
            idlen:           12,
            timeout:         33333,
            status_interval: 60000,

            actcache:        true,
            actcache_size:   1111,

            zig:{},


            // Enforce strict behaviours. Relax when backwards compatibility needed.
            strict: {

              // Action result must be a plain object.
              result: true
            },


            trace:{
              act:     false,
              stack:   false,
              unknown: 'warn'
            },

            stats: {
              size:     1024,
              duration: 60000,
              running:  false
            },

            debug:{
              allargs:    false,
              fragile:    false,
              undead:     false,
              print:      {},
              act_caller: false,
            },

            deathdelay: 33333,

            admin:{
              local:  false,
              prefix: '/admin'
            },

            plugin:{},

            internal: {
              actrouter:    patrun(),
              clientrouter: patrun(pin_patrun_customizer),
              subrouter:    patrun(pin_patrun_customizer),
              close_signals: {
                SIGHUP:   true, 
                SIGTERM:  true,
                SIGINT:   true, 
                SIGBREAK: true, 
              },
            },

            default_plugins: {
              basic:       true, 
              'mem-store': true, 
              transport:   true, 
              web:         true, 
            }
          }
        )

  // not needed after this point, and screws up debug printing
  delete initial_options.module 

  var so = optioner.set( initial_options )

  paramcheck.options.validate(so,thrower)

  // Identifier generator.
  root.idgen = nid({length:so.idlen})


  // Create a unique identifer for this instance.
  root.id = root.idgen()+'/'+Date.now()+'/'+process.pid+'/'+so.tag

  root.name = 'Seneca/'+root.version+'/'+root.id


  root.die = makedie( root, {
    type:   'sys',
    plugin: 'seneca',
    tag:    root.version,
    id:     root.id
  })


  private$.logrouter = logging.makelogrouter(so.log)

  root.log = logging.makelog(private$.logrouter,root.id)


  // Error events are fatal, unless you're undead.  These are not the
  // same as action errors, these are unexpected internal issues.
  root.on('error',root.die) 
  
  // TODO: support options
  private$.executor = executor({
    trace:   _.isFunction(so.trace.act) ? so.trace.act : 
      (!!so.trace.act) ? make_trace_act({stack:so.trace.stack}) : false,
    timeout: so.timeout,
    error: function(err) {
      if( !err ) return;
      logging.log_exec_err( root, err )
    },
    msg_codes: {
      timeout:   'action-timeout',
      error:     'action-error',
      callback:  'action-callback',
      execute:   'action-execute',
      abandoned: 'action-abandoned'
    }
  })
    

  // TODO: encapsulate
  // setup status log
  if( 0 < so.status_interval && so.status_log ) {
    private$.stats = private$.stats || {}
    setInterval(function() {
      var stats = {alive:(Date.now()-private$.stats.start),act:private$.stats.act}
      root.log.info('status',stats)
    },so.status_interval)
  }

  if( so.stats ) {
    private$.timestats = new stats.NamedStats( so.stats.size, so.stats.duration )

    if( so.stats.running ) {
      setInterval(function() {
        private$.timestats.calculate()
      }, so.stats.duration )
    }
  }


  private$.plugins      = {}
  private$.exports      = { options: common.deepextend({},so) }
  private$.plugin_order = { byname:[], byref:[] }
  private$.use          = makeuse({
    prefix:    'seneca-', 
    module:    module, 
    msgprefix: false,
    builtin:   ''
  })

  private$.actcache       = lrucache({max:so.actcache_size})
  private$.wait_for_ready = false

  private$.actrouter    = so.internal.actrouter
  private$.clientrouter = so.internal.clientrouter
  private$.subrouter    = so.internal.subrouter



  root.on('newListener', function(eventname) {
    if( 'ready' == eventname ) {
      if( !private$.wait_for_ready ) {
        private$.wait_for_ready = true
        root.act('role:seneca,ready:true,gate$:true')
      }
    }
  })


  root.toString = api_toString
   

  root.util = {
    deepextend: common.deepextend,
    recurse:    common.recurse,
    clean:      common.clean,
    copydata:   common.copydata,
    nil:        common.nil,
    argprops:   common.argprops,
    print:      common.print,

    router:     function() { return patrun() },
    parsecanon: make_entity.parsecanon,
  }


  root.store = {
    init: store.init,
    cmds: store.cmds
  }


  // say hello, printing identifier to log
  root.log.info('hello',root.toString())


  // dump options if debugging
  root.log.debug('options',function() {
    return util.inspect(so,false,null).replace(/[\r\n]/g,' ')
  })

  if( so.debug.print.options ) {
    console_log('\nSeneca Options: before plugins\n'+
                '==============================\n')
    console_log(util.inspect(so,{depth:null}))
    console_log('')
  }


  function api_logroute(entry,handler) {
    if( 0 === arguments.length ) return private$.logrouter.toString()

    entry.handler = handler || entry.handler
    logging.makelogroute(entry,private$.logrouter)
  }



  paramcheck.register = parambulator({
    type$:     'object',
    required$: ['name','init'],
    string$:   ['name'],
    function$: ['init','service'],
    object$:   ['options']
  },{
    topname:       'plugin',
    msgprefix:     'register(plugin): ',
  })



  function api_register( plugin ) {
    var self = this

    paramcheck.register.validate(plugin,thrower)

    var fullname = plugin.name+(plugin.tag?'/'+plugin.tag:'')
    var tag      = plugin.tag||'-'

    plugin.fullname = fullname

    var sd = plugin_util.make_delegate( 
      self, 
      plugin, 
      {makedie:makedie}
    )

    self.log.debug('register','init',fullname)
    
    var plugin_options = plugin_util.resolve_options(fullname,plugin,so)

    sd.log.debug('DEFINE',plugin_options)

    var meta
    try {
      meta = plugin_util.define_plugin( sd, plugin, plugin_options )
    }
    catch(e) {
      return sd.die(e)
    }

    // legacy api for service function
    if( _.isFunction(meta) ) {
      meta = {service:meta}
    }

    plugin.name    = meta.name    || plugin.name
    plugin.tag     = meta.tag     || plugin.tag || 
      (plugin.options && plugin.options.tag$)
    plugin.service = meta.service || plugin.service

    sd.__update_plugin__(meta)
    
    var pluginref = plugin.name+(plugin.tag?'/'+plugin.tag:'')
    private$.plugins[pluginref] = plugin

    private$.plugin_order.byname.push(plugin.name)
    private$.plugin_order.byname = _.uniq(private$.plugin_order.byname)

    private$.plugin_order.byref.push(pluginref)

    // LEGACY
    var service = plugin.service
    if( service ) {
      service.log = sd.log
      service.key = pluginref
      self.act('role:web',{use:service})
    }

    self.act(
      {
        init:plugin.name,
        tag:plugin.tag,
        default$:{},
        gate$:true,
        fatal$:true
      },
      function(err,out) {
        if( err ) {
          var plugin_err_code = 'plugin_init'

          plugin.plugin_error = err.message

          if( 'action-timeout' == err.code ) {
            plugin_err_code = 'plugin_init_timeout'
            plugin.timeout = so.timeout
          }

          return self.die(error(err,plugin_err_code,plugin))
        }

        if( so.debug.print && so.debug.print.options ) {
          console_log('\nSeneca Options: plugin: '+plugin.name+
                      (plugin.tag?'$'+plugin.tag:'')+'\n'+
                      '==================================================\n')
          console_log(util.inspect(plugin_options,{depth:null}))
          console_log('')
        }


        return self.log.debug('register','ready',pluginref,out)
      }
    )

    var exports = []
    
    if( void 0 != meta.export ) {
      private$.exports[pluginref] = meta.export
      exports.push(pluginref)
    }

    if( _.isObject(meta.exportmap) || _.isObject(meta.exports) ) {
      meta.exportmap = meta.exportmap || meta.exports
      _.each(meta.exportmap,function(v,k) {
        if( void 0 != v ) {
          var exportname = pluginref+'/'+k
          private$.exports[exportname] = v
          exports.push(exportname)
        }
      })
    }

    self.log.debug('register','install',pluginref,
                   {exports:exports},fullname!=pluginref?fullname:undefined)
  }


  
  function api_depends() {
    var self = this

    var args = norma('{pluginname:s deps:a? moredeps:s*}',arguments)
    
    var deps = args.deps || args.moredeps

    _.every(deps, function(depname) {
      if( !_.contains(private$.plugin_order.byname,depname) &&
          !_.contains(private$.plugin_order.byname,'seneca-'+depname) ) {
        self.die(error('plugin_required',{name:args.pluginname,dependency:depname}))
        return false
      }
      else return true;
    })
  }



  function api_export( key ) {
    var self = this

    // Legacy aliases
    if( 'util' == key ) key = 'basic';

    var exportval = private$.exports[key];
    if( !exportval ) {
      return self.die(error('export_not_found', {key:key}))
    }
    
    return exportval;
  }




  // all optional
  function api_make() {
    var self = this
    var args = arr(arguments)
    args.unshift(self)
    return private$.entity.make$.apply(private$.entity,args)
  }
  root.make$ = root.make




  function api_listen() {
    var self = this

    var opts   = self.options().transport || {}
    var config = parseConfig( arr(arguments), opts )

    self.act('role:transport,cmd:listen',{config:config,gate$:true},function(err) {
      if( err ) return self.die(error(err,'transport_listen',config))
    })

    return self
  }



  function api_client() {
    var self = this

    var opts   = self.options().transport || {}
    var config = parseConfig( arr(arguments), opts )

    // Queue messages while waiting for client to become active.
    var sendqueue = []
    var sendclient = {
      send: function( args, done ) {
        var tosend = {instance:this, args:args, done:done }
        self.log.debug('client','sendqueue-add',sendqueue.length+1,config,tosend)
        sendqueue.push( tosend )
      }
    }

    // TODO: validate pin, pins args

    var pins = config.pins || [config.pin] || ['']

    pins = _.map(pins, function(pin){
      return _.isString(pin) ? jsonic(pin) : pin
    })


    _.each(pins,function(pin) {

      // Only wrap if pin is specific.
      // Don't want to wrap all patterns, esp. system ones!
      if( 0 < _.keys(pin).length ) {
        self.wrap(pin,function(args,done){
          sendclient.send.call( this, args, done ) 
        })
      }

      // For patterns not locally defined.
      private$.clientrouter.add( 
        pin,
        {
          func: function(args,done) { 
            sendclient.send.call( this, args, done ) 
          },
          log:        self.log,
          argpattern: common.argpattern(pin),
          id:         'CLIENT',
          client$:    true
        })
    })
    
    // Create client.
    self.act( 
      'role:transport,cmd:client',
      {config:config,gate$:true},
      function(err,liveclient) {
        if( err ) return self.die(error(err,'transport_client',config));
        if( null == liveclient ) 
          return self.die(error('transport_client_null',common.clean(config)));

        // Process any messages waiting for this client, 
        // before bringing client online.
        function sendnext() {
          if( 0 === sendqueue.length ) {
            sendclient = liveclient
            self.log.debug('client','sendqueue-clear',config)
          }
          else {
            var tosend = sendqueue.shift()
            self.log.debug('client','sendqueue-processing',
                           sendqueue.length+1,config,tosend)
            sendclient.send.call(tosend.instance,tosend.args,tosend.done)
            setImmediate(sendnext)
          }
        }
        sendnext()
      })    
    
    return self;
  }


  function parseConfig( args, options ) {
    var out = {}

    var config = args.config || args

    if( _.isArray( config ) ) {
      var arglen = config.length

      if( 1 === arglen ) {
        if( _.isObject( config[0] ) ) {
          out = config[0]
        }
        else {
          out.port = parseInt(config[0],10)
        }
      }
      else if( 2 === arglen ) {
        out.port = parseInt(config[0],10)
        out.host = config[1]
      }
      else if( 3 === arglen ) {
        out.port = parseInt(config[0],10)
        out.host = config[1]
        out.path = config[2]
      }

    }

    // TODO: accept a jsonic string

    else out = config;

    
    _.each( options, function(v,k){
      if( _.isObject(v) ) return;
      out[k] =  ( void 0 === out[k] ? v : out[k] )
    })


    // Default transport is web
    out.type = out.type || 'web'

    // Aliases.
    if( 'direct' == out.type || 'http' == out.type ) {
      out.type = 'web'
    }

    var base = options[out.type] || {}

    out = _.extend({},base,out)

    if( 'web' == out.type || 'tcp' == out.type ) {
      out.port = null == out.port ? base.port : out.port 
      out.host = null == out.host ? base.host : out.host
      out.path = null == out.path ? base.path : out.path
    }

    return out
  }


  function api_cluster() {
    /* jshint loopfunc:true */
    var self = this

    var cluster = require('cluster')

    if( cluster.isMaster ) {
      require('os').cpus().forEach(function() {
        cluster.fork()
      })

      cluster.on('disconnect', function(worker) {
        cluster.fork()
      })

      var noopinstance = self.delegate()
      for( var fn in noopinstance ) {
        if( _.isFunction(noopinstance[fn]) ) {
          noopinstance[fn] = function() { return noopinstance; }
        }
      }

      return noopinstance;
    }
    else return self;
  }



  function api_hasplugin(plugindesc,tag) {
    var self = this
    tag = ('' === tag || '-' === tag) ? null : tag
    return !!self.findplugin(plugindesc,tag)
  }



  // get plugin instance
  function api_findplugin(plugindesc,tag) {
    var name = plugindesc.name || plugindesc
    tag = plugindesc.tag || tag

    var key = name+(tag?'/'+tag:'')
    var plugin = private$.plugins[key]

    return plugin
  }



  function api_pin( pattern, pinopts ) {
    var thispin = this

    pattern = _.isString( pattern ) ? jsonic(pattern) : pattern

    var methodkeys = []
    for( var key in pattern ) {
      if( /[\*\?]/.exec(pattern[key]) ) {
        methodkeys.push(key)
      }
    }


    var methods = private$.actrouter.list(pattern)


    var api = {
      toString: function() {
        return 'pin:'+common.descdata(pattern,1)+'/'+thispin
      }
    }


    methods.forEach(function(method) {
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

      api[methodname].pattern$ = method.match
      api[methodname].name$    = methodname
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



  function api_sub() {
    var self = this

    var subargs = parse_pattern(self,arguments,'action:f actmeta:o?')
    var pattern = subargs.pattern
    if( null == pattern.in$ && 
        null == pattern.out$ && 
        null == pattern.error$ &&
        null == pattern.cache$ &&
        null == pattern.default$ &&
        null == pattern.client$ ) 
    {
      pattern.in$ = true
    }

    if( !private$.handle_sub ) {
      private$.handle_sub = function(args,result) {
        var subfuncs = private$.subrouter.find(args)

        if( subfuncs ) {
          _.each(subfuncs,function(subfunc){
            try {
              subfunc.call(self,args,result)
            }
            catch(ex) {
              // TODO: not really satisfactory
              var err = error(ex,'sub_function_catch',{args:args,result:result})
              self.log.error(
                'sub','err',args.actid$, err.message, args, error.stack )
            }
          })
        }
      }

      // TODO: other cases

      self.on('act-in',  annotate( 'in$',  private$.handle_sub))
      self.on('act-out', annotate( 'out$', private$.handle_sub))
    }

    function annotate( prop, handle_sub ) {
      return function( args,result ) {
        args   = _.clone(args)
        result = _.clone(result)
        args[prop] = true
        handle_sub(args,result)
      }
    }

    var subs = private$.subrouter.find(pattern)
    if( !subs ) {
      private$.subrouter.add(pattern,subs=[])
    }
    subs.push(subargs.action)

    return self;
  }



  // params: argstr,argobj,actfunc,actmeta
  function api_add() {
    var self = this
    var args = parse_pattern(self,arguments,'action:f actmeta:o?')

    var pattern   = args.pattern
    var action    = args.action
    var actmeta   = args.actmeta || {}

    actmeta.sub = !!pattern.sub$

    pattern = self.util.clean(args.pattern)

    if( 0 === _.keys( pattern ) ) {
      throw error('add_empty_pattern',{args:common.clean(args)})
    }

    var pattern_rules = _.clone(action.validate || {})
    _.each( pattern, function(v,k) { 
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
    actmeta.pattern = common.argpattern( pattern )

    // deprecated
    actmeta.argpattern = actmeta.pattern

    actmeta.id = self.idgen()



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


    private$.stats.actmap[actmeta.argpattern] = 
      private$.stats.actmap[actmeta.argpattern] || 
      {id:actmeta.id,
       plugin:{
         full: actmeta.plugin_fullname,
         name: actmeta.plugin_name,
         tag:  actmeta.plugin_tag
       },
       prior:actmeta.priorpath,calls:0,done:0,fails:0,time:{}}
    
    if( addroute ) {
      var addlog = [ actmeta.sub ? 'SUB' : 'ADD', 
                     actmeta.id, common.argpattern(pattern) ]
      var isplugin = self.context.isplugin
      var logger   = self.log.log || self.log

      if( !isplugin ) {
        addlog.unshift('-')
        addlog.unshift('-')
        addlog.unshift('-')
      }

      logger.debug.apply( self, addlog )
      private$.actrouter.add(pattern,actmeta)
    }

    return self
  }


  
  function api_findact(args) {
    var actmeta = private$.actrouter.find(args)

    if( !actmeta ) {
      actmeta = private$.clientrouter.find(args)
    }

    return actmeta
  }



  function api_hasact(args) {
    return !!private$.actrouter.find(args)
  }



  root.findpins = root.pinact = function() {
    var pins = []
    var patterns = _.flatten(arr(arguments))

    _.each( patterns, function(pattern) {
      pattern = _.isString(pattern) ? jsonic(pattern) : pattern
      pins = pins.concat( _.map( private$.actrouter.list(pattern), 
                                 function(desc) {return desc.match} ) )
    })

    return pins
  }



  function api_actroutes() {
    return private$.actrouter.toString(function(d) {
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
    var found = private$.actrouter.list( args )
    
    found = _.map( found, function(entry) {
      return entry.match
    })
    return found
  }



  function api_act_if() {
    var self = this
    var args = norma('{execute:b actargs:.*}',arguments)

    if( args.execute ) {
      return self.act.apply( self, args.actargs )
    }
    else return self;
  }



  // Perform an action. The propeties of the first argument are matched against 
  // known patterns, and the most specific one wins.
  function api_act() {
    var self = this

    var spec    = parse_pattern( self, common.arrayify(arguments), 'done:f?' )
    var args    = spec.pattern
    var actdone = spec.done
    var actmeta = self.findact(args)

    if( so.debug.act_caller ) {
      args.caller$ = '\n    Action call arguments and location: '+
        (new Error(util.inspect(args).replace(/\n/g,'')).stack)
        .replace(/.*\/seneca\.js:.*\n/g,'')
        .replace(/.*\/seneca\/lib\/.*\.js:.*\n/g,'')
    }

    // action pattern found
    if( actmeta ) {
      do_act(self,actmeta,false,args,actdone)
      return self;
    }

    // action pattern not found

    if( _.isPlainObject( args.default$ ) ) {
      self.log.debug('act','-','-','DEFAULT',self.util.clean(args))
      if( actdone ) actdone.call( self, null, _.clone(args.default$) );
      return self;
    }

    var errcode = 'act_not_found'
    var errinfo = { args: util.inspect(common.clean(args)).replace(/\n/g,'') }


    if( !_.isUndefined( args.default$ ) ) {
      errcode = 'act_default_bad'
      errinfo.xdefault = util.inspect(args.default$)
    }

    var err = error( errcode, errinfo )

    if( args.fatal$ ) {
      return self.die(err)
    }

    logging.log_act_bad( root, err, so.trace.unknown )

    if( so.debug.fragile ) throw err;

    if( actdone ) actdone.call( self, err );
    return self;
  }



  function api_wrap(pin,wrapper) {
    var pinthis = this

    pin = _.isArray(pin) ? pin : [pin]
    _.each(pin, function(p) {
      _.each( pinthis.findpins(p), function(actpattern) {
        pinthis.add(actpattern,function(args,done) {
          wrapper.call(this,args,done)
        })
      })
    })
  }



  // close seneca instance
  // sets public seneca.closed property
  function api_close(done) {
    var self = this
    
    self.closed = true

    self.log.debug('close','start')
    self.act('role:seneca,cmd:close,closing$:true',function(err) {
      self.log.debug('close','end',err)
      if( _.isFunction(done) ) return done.call(self,err);
    })
  }



  // useful when defining services!
  // note: has EventEmitter.once semantics
  // if using .on('ready',fn) it will be be called for each ready event
  function api_ready(ready) {
    var self = this

    if( _.isFunction(ready) ) {
      self.once('ready',function(){
        try {
          var ready_delegate = self.delegate({fatal$:true})
          ready.call(ready_delegate)
        }
        catch(ex) {
          var re = ex

          if( !re.seneca ) { 
            re = error(re,'ready_failed', {message:ex.message,ready:ready})
          }

          self.die( re )
        }
      })

      if( !private$.wait_for_ready ) {
        private$.wait_for_ready = true
        self.act('role:seneca,ready:true,gate$:true')
      }
    }

    return self;
  }



  // use('pluginname') - built-in, or provide calling code 'require' as seneca opt
  // use( require('pluginname') ) - plugin object, init will be called
  // if first arg has property senecaplugin 
  function api_use( arg0, arg1, arg2 ) {
    var self = this, plugindesc;

    // Allow chaining with seneca.use('options', {...}) 
    // see https://github.com/rjrodger/seneca/issues/80
    if( 'options' == arg0 ) {
      self.options( arg1 )
      return self
    }

    try {
      plugindesc = private$.use( arg0, arg1, arg2 )
    }
    catch(e) {
      return self.die( error(e,'plugin_'+e.code) );
    }

    self.register( plugindesc )

    return self
  }


  // TODO: move repl functionality to seneca-repl

  root.inrepl = function() {
    var self = this

    self.on('act-out',function() {
      logging.handlers.print.apply(null,arr(arguments))
    })
    
    self.on('error',function(err) {
      var args = arr(arguments).slice()
      args.unshift('ERROR: ')
      logging.handlers.print.apply(null,arr(args))
    })
  }


  root.startrepl = function(in_opts) {
    var self = this

    var repl_opts = _.extend({repl:{listen:10170}},so,in_opts)
    
    net.createServer(function (socket) {
      var actout =  function() {
        socket.write(''+arr(arguments)+'\n')
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
        var args = arr(arguments)
        args.repl$=true
        orig_act.apply(self,args)
        return r.context.seneca
      }

      self.on('act-out',actout)
      
    }).listen(repl_opts.repl.listen)
  }


  
  /// Return self. Mostly useful as a check that this is a Seneca instance.
  function api_seneca() {
    return this
  }



  // Describe this instance using the form: Seneca/VERSION/ID
  function api_toString() {
    return this.name
  }



  function do_act( instance, actmeta, prior_ctxt, origargs, cb ) {
    var args = _.clone(origargs)
    prior_ctxt = prior_ctxt || {chain:[],entry:true,depth:1}

    var tx = origargs.tx$ || 
          instance.fixedargs.tx$ || 
          instance.idgen()

    var actid    = ( args.actid$ || (instance.idgen()+'/'+tx) )
    var actstart = Date.now()

    cb = cb || common.noop

    if( act_cache_check( instance, args, prior_ctxt, cb ) ) return;

    var actstats = act_stats_call( actmeta.pattern )


    // build callargs
    var callargs = args
    callargs.actid$ = actid

    callargs.meta$ = {
      id:      actid,
      tx:      tx,
      start:   actstart,
      pattern: actmeta.pattern,
      action:  actmeta.id,
      entry:   prior_ctxt.entry,
      chain:   prior_ctxt.chain
    }
    

    logging.log_act_in( root, {actid:actid}, actmeta, callargs, prior_ctxt )
    
    instance.emit('act-in', callargs)

    var delegate = act_make_delegate( instance, tx, callargs, actmeta, prior_ctxt )

    callargs = _.extend({},callargs,delegate.fixedargs)


    var act_done = function(err) {
      try {
        var actend = Date.now()
        private$.timestats.point( actend-actstart, actmeta.argpattern )

        prior_ctxt.depth--
        prior_ctxt.entry = prior_ctxt.depth <= 0
        
        var result  = arr(arguments)
        var call_cb = true

        var resdata = result[1]

        if( null == err && 
            null != resdata && 
            !(_.isPlainObject(resdata) || 
              _.isArray(resdata) ||
              !!resdata.entity$) &&
            so.strict.result) 
        {

          // allow legacy patterns
          if( !( 'generate_id' === callargs.cmd ||
                 true === callargs.note || 
                 'quickcode' === callargs.cmd )) 
          {
            err = error(
              'result_not_objarr', {
                pattern:actmeta.pattern,
                args:util.inspect(common.clean(callargs)).replace(/\n/g,''),
                result:resdata
              })
          }
        }

        if( so.actcache ) {
          private$.actcache.set(actid,{
            result:result,
            actmeta:actmeta,
            when:Date.now()
          })
        }

        if( err ) {
          private$.stats.act.fails++
          actstats.fails++

          var out = act_error(instance,err,actmeta,result,cb,
                              actend-actstart,callargs,prior_ctxt)
          
          call_cb = out.call_cb
          result[0] = out.err

          if( args.fatal$ ) {
            return instance.die(out.err)
          }
        }
        else {
          instance.emit('act-out',callargs,result[1])
          result[0] = null

          logging.log_act_out( 
            root, {actid:actid,duration:actend-actstart}, 
            actmeta, callargs, result, prior_ctxt )

          private$.stats.act.done++
          actstats.done++
        }
        
        try {
          if( call_cb ) {
            cb.apply(delegate,result) // note: err == result[0]
          }
        }

        // for exceptions thrown inside the callback
        catch( ex ) {
          var err = ex

          // handle throws of non-Error values
          if( !util.isError(ex) ) {
            if( _.isObject(ex) ) {
              err = new Error(common.owndesc(ex,1))
            }
            else {
              err = new Error(''+ex)
            }
          }

          callback_error(
            instance,err,actmeta,result,cb,actend-actstart,callargs,prior_ctxt)
        }
      }
      catch(ex) {
        instance.emit('error',ex)
      }
    }



    act_param_check( origargs, actmeta, function( err ) {
      if( err ) return act_done(err);

      var execspec = {
        id:      actid,
        gate:    prior_ctxt.entry && !!callargs.gate$,
        ungate:  !!callargs.ungate$,
        desc:    actmeta.argpattern,
        cb:      act_done,

        plugin: {
          name: actmeta.plugin_name,
          tag:  actmeta.plugin_tag
        },

        fn:function(cb) {
          if( root.closed && !callargs.closing$ ) {
            return cb(error('instance-closed',{args:common.clean(callargs)}))
          }

          delegate.good = function(out) {
            cb(null,out)
          }

          delegate.bad = function(err) {
            cb(err)
          }

          actmeta.func.call(delegate,callargs,cb)
        },
      }

      private$.executor.execute(execspec)
    })
  }


  function act_error( instance, err, actmeta, result, cb, 
                      duration, callargs, prior_ctxt ) 
  {
    var call_cb = true

    if( !err.seneca ) {
      err = error(err,'act_execute',_.extend(
        {},
        err.details,
        {
          message:  (err.eraro && err.orig) ? err.orig.message : err.message,
          pattern:  actmeta.pattern,
          fn:       actmeta.func,
          cb:       cb,
          instance: instance.toString()
        }))

      result[0] = err
    }

    // Special legacy case for seneca-perm
    else if( err.orig && 0 === err.orig.code.indexOf('perm/') ) {
      err = err.orig
      result[0] = err
    }
      
    err.details = err.details || {}
    err.details.plugin = err.details.plugin || {}

    logging.log_act_err( root, {actid:callargs.actid$,duration:duration}, 
                         actmeta, callargs, prior_ctxt, err )

    instance.emit('act-err',callargs,err)

    if( so.errhandler ) {
      call_cb = !so.errhandler.call(instance,err)
    }

    return {call_cb:call_cb,err:err}
  }


  function callback_error( instance, err, actmeta, result, cb,
                           duration, callargs, prior_ctxt ) 
  {
    if( !err.seneca ) {
      err = error(err,'act_callback',_.extend(
        {},
        err.details,
        {
          message:  err.message,
          pattern:  actmeta.pattern,
          fn:       actmeta.func,
          cb:       cb,
          instance: instance.toString()
        }))

      result[0] = err
    }
      
    err.details = err.details || {}
    err.details.plugin = err.details.plugin || {}

    logging.log_act_err( root, {actid:callargs.actid$,duration:duration}, 
                         actmeta, callargs, prior_ctxt, err )

    instance.emit('act-err',callargs,err,result[1])

    if( so.errhandler ) {
      so.errhandler.call(instance,err)
    }
  }


  // Check if actid has already been seen, and if action cache is active,
  // then provide cached result, if any. Return true in this case.
  //
  //    * _instance_    (object)    &rarr;  seneca instance
  //    * _args_        (object)    &rarr;  action arguments
  //    * _prior_ctxt_  (object?)   &rarr;  prior action context, if any
  //    * _actcb_       (function)  &rarr;  action arguments
  function act_cache_check( instance, args, prior_ctxt, actcb ) {
    assert.ok( _.isObject(instance), 'act_cache_check; instance; isObject')
    assert.ok( _.isObject(args),     'act_cache_check; args; isObject')
    assert.ok( !prior_ctxt || _.isObject(prior_ctxt),     
               'act_cache_check; prior_ctxt; isObject')
    assert.ok( !actcb || _.isFunction(actcb),  
               'act_cache_check; actcb; isFunction')

    var actid = args.actid$

    if( null != actid && so.actcache ) {
      var actdetails = private$.actcache.get(actid)      

      if( actdetails ) {
        var actmeta = actdetails.actmeta || {}
        private$.stats.act.cache++
        
        logging.log_act_cache( root, {actid:actid}, actmeta, args, prior_ctxt )
        
        if( actcb ) actcb.apply( instance, actdetails.result );
        return true;
      }
    }
    
    return false;
  }


  // Resolve action stats object, creating if ncessary, and count a call.
  //
  //    * _pattern_     (string)    &rarr;  action pattern
  function act_stats_call( pattern ) {
    var actstats = (private$.stats.actmap[pattern] = 
                    private$.stats.actmap[pattern] || {})

    private$.stats.act.calls++
    actstats.calls++

    return actstats
  }
  


  function act_make_delegate( instance, tx, callargs, actmeta, prior_ctxt ) {
    var delegate_args = { tx$: tx }
    if( null != callargs.gate$ ) {
      delegate_args.ungate$ = !!callargs.gate$
    }
    var delegate = instance.delegate( delegate_args )
    

    // automate actid log insertion
    delegate.log = logging.make_delegate_log(callargs.actid$,actmeta,instance)
    logging.makelogfuncs(delegate)


    if( actmeta.priormeta ) {
      delegate.prior = function(prior_args,prior_cb) {
        prior_args = _.clone(prior_args)
        
        var sub_prior_ctxt = _.clone(prior_ctxt)
        sub_prior_ctxt.chain = _.clone(prior_ctxt.chain)
        sub_prior_ctxt.chain.push(callargs.actid$)
        sub_prior_ctxt.entry = false
        sub_prior_ctxt.depth++;
        
        delete prior_args.actid$
        delete prior_args.meta$

        do_act(delegate,actmeta.priormeta,sub_prior_ctxt,prior_args,prior_cb)
      }

      delegate.parent = function(prior_args,prior_cb) {
        delegate.log.warn('The method name seneca.parent is deprecated.'+
                          ' Please use seneca.prior instead.')
        delegate.prior(prior_args,prior_cb)
      }
    }
    else delegate.prior = common.nil

    return delegate;
  }
  

  // Check if action parameters pass parambulator spec, if any.
  //
  //    * _args_     (object)    &rarr;  action arguments
  //    * _actmeta_  (object)    &rarr;  action meta data
  //    * _done_     (function)  &rarr;  callback function
  function act_param_check( args, actmeta, done ) {
    assert.ok( _.isObject(args),    'act_param_check; args; isObject')
    assert.ok( _.isObject(actmeta), 'act_param_check; actmeta; isObject')
    assert.ok( _.isFunction(done),  'act_param_check; done; isFunction')

    if( actmeta.parambulator ) {
      actmeta.parambulator.validate(args,function(err) {
        if(err) return done( 
          error('act_invalid_args', {
            pattern: actmeta.pattern,
            message: err.message,
            args:    common.clean(args)
          }));
        return done();
      })
    } 
    else return done();
  }



  // string args override object args
  function parse_pattern(instance,args,normaspec,fixed) {
    args = norma('{strargs:s? objargs:o? moreobjargs:o? '+(normaspec||'')+'}', args)

    try {
      return _.extend(
        args,
        { pattern: _.extend(
          {},

          // Precedence of arguments in add,act is left-to-right
          args.moreobjargs ? args.moreobjargs : {},
          args.objargs ? args.objargs : {},
          args.strargs ? jsonic( args.strargs ) : {},

          fixed || {} )
        })
    }
    catch( e ) {
      var col = 1==e.line?e.column-1:e.column
      throw error('add_string_pattern_syntax',{
        argstr: args,
        syntax: e.message,
        line:   e.line,
        col:    col
      })
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
    var act = self.act

    delegate.did = nid()

    delegate.act = function() {
      var spec = parse_pattern( self, common.arrayify(arguments), 'done:f?' )
      var args = spec.pattern
      var cb   = spec.done

      args = _.extend({},args,fixedargs)

      act.call(this,args,cb)

      return delegate
    }

    var strdesc
    delegate.toString = function() {
      if( strdesc ) return strdesc;
      var vfa = {}
      _.each(fixedargs,function(v,k) {
        if( ~k.indexOf('$') ) return;
        vfa[k]=v
      })

      strdesc = self.toString()+(_.keys(vfa).length?'/'+common.owndesc(vfa,0,false):'')

      return strdesc
    }

    delegate.fixedargs = _.extend({},fixedargs,self.fixedargs)
    
    delegate.delegate = function(further_fixedargs) {
      var args = _.extend({},delegate.fixedargs,further_fixedargs||{})
      return self.delegate.call(this,args)
    }

    // Somewhere to put contextual data for this delegate.
    // For example, data for individual web requests.
    delegate.context = {}

    delegate.client = function() {
      return self.client.call(this,arguments)
    }

    delegate.listen = function() {
      return self.listen.call(this,arguments)
    }

    return delegate
  }



  function api_options( options ) {
    var self = this

    so = private$.exports.options = 
      (null == options) ? optioner.get() : optioner.set( options );

    if( options && options.log ) {
      private$.logrouter = logging.makelogrouter(so.log)
      self.log = logging.makelog(private$.logrouter,self.id)
    }

    return so
  }



  function api_start( errhandler ) {
    var sd = this.delegate()
    var options = sd.options()
    options.zig = options.zig || {}


    function make_fn(self,origargs) {
      var args = parse_pattern(self,origargs,'fn:f?')

      var actargs = _.extend(
        {},
        args.moreobjargs ? args.moreobjargs : {},
        args.objargs ? args.objargs : {},
        args.strargs ? jsonic( args.strargs ) : {}
      )

      var fn
      if( args.fn ) {
        fn = function(data,done){
          return args.fn.call(self,data,done)
        }
      }
      else {
        fn = function(data,done){
          /* jshint evil:true */

          if( args.strargs ) {
            var $ = data
            _.each(actargs,function(v,k){
              if( _.isString(v) && 0===v.indexOf('$.') ) {
                actargs[k] = eval(v)
              }
            })
          }

          self.act(actargs,done)
          return true
        }
        fn.nm = args.strargs
      }

      return fn
    }


    var dzig = zig({
      timeout: options.zig.timeout || options.timeout,
      trace: options.zig.trace
    })

    dzig.start(function(){
      var self = this
      dzig.end(function(){
        if( errhandler ) errhandler.apply(self,arguments);
      })
    })
    
    sd.end = function(cb){
      var self = this
      dzig.end(function(){
        if( cb ) return cb.apply(self,arguments);
        if( errhandler ) return errhandler.apply(self,arguments);
      })
      return self
    }

    sd.wait = function(){
      dzig.wait(make_fn(this,arguments))
      return this
    }

    sd.step = function(){
      dzig.step(make_fn(this,arguments))
      return this
    }

    sd.run = function(){
      dzig.run(make_fn(this,arguments))
      return this
    }

    sd.if = function(cond){
      dzig.if(cond)
      return this
    }

    sd.endif = function(){
      dzig.endif()
      return this
    }

    sd.fire = function(){
      dzig.step(make_fn(this,arguments))
      return this
    }

    return sd
  }



  // Create entity delegate.
  var sd = root.delegate()
  sd.log = function() {
    var args = ['entity']
    root.log.apply(this,args.concat(arr(arguments)))
  }
  logging.makelogfuncs(sd)
  

  // Template entity that makes all others.
  private$.entity = make_entity({},sd)


  // DEPRECATED 
  // for use with async
  root.next_act = function() {
    var si   = this || root
    var args = arr(arguments)
    
    return function(next) {
      args.push(next)
      si.act.apply(si,args)
    }
  }



  root.gate = function() {
    var gated = this.delegate({gate$:true})
    return gated
  }


  root.ungate = function() {
    var ungated = this.delegate({gate$:false})
    return ungated
  }








  // Add builtin actions.
  root.add( {role:'seneca',  stats:true},  action_seneca_stats )
  root.add( {role:'seneca',  ready:true},  action_seneca_ready )
  root.add( {role:'seneca',  cmd:'close'}, action_seneca_close )
  root.add( {role:'options', cmd:'get'},   action_options_get  )


  // Define builtin actions.

  function action_seneca_close(args,done) {
    this.emit('close')
    done()
  }


  function action_seneca_ready(args,done) {
    private$.wait_for_ready = false
    this.emit('ready')
    done()
  }


  function action_seneca_stats( args, done ) {
    var stats

    if( args.pattern && private$.stats.actmap[args.pattern] ) {
      stats = private$.stats.actmap[args.pattern]
      stats.time = private$.timestats.calculate(args.pattern)
    }
    else {
      stats = _.clone(private$.stats)
      stats.now    = new Date()
      stats.uptime = stats.now - stats.start

      stats.now   = new Date(stats.now).toISOString()
      stats.start = new Date(stats.start).toISOString()

      var summary = 
            (null == args.summary && false) || 
            (/^false$/i.exec(args.summary) ? false : !!(args.summary) )

      if( summary ) {
        stats.actmap = void 0
      }
      else {
        _.each( private$.stats.actmap, function(a,p) { 
          private$.stats.actmap[p].time = private$.timestats.calculate(p) 
        })
      }
    }

    done(null,stats)
  }


  function action_options_get( args, done ) {
    var options = private$.optioner.get()
    
    var base = args.base || null
    var root = base ? (options[base]||{}) : options 
    var val  = args.key ? root[args.key] : root

    done(null,common.copydata(val))
  }


  _.each( so.internal.close_signals, function(active,signal){
    if(active) {
      process.on(signal,function(){
        root.close(function(err){
          if( err ) console.error(err);
          process.exit( err ? (null == err.exit ? 1 : err.exit) : 0 )
        })
      })
    }
  })


  return root
}




// Utilities

function makedie( instance, ctxt ) {
  ctxt = _.extend(ctxt,instance.die?instance.die.context:{})

  var die = function( err ) {
    var die_trace = '\n'+(new Error('die trace').stack)
          .match(/^.*?\n.*\n(.*)/)[1]

    try {
      if( !err ) {
        err = new Error( 'unknown' )
      }
      else if( !util.isError(err) ) {
        err = new Error( _.isString(err) ? err : util.inspect(err) )
      }

      var so = instance.options()

      // undead is only for testing, do not use in production
      var undead = so.debug.undead || (err && err.undead)

      var logargs = [ctxt.type, ctxt.plugin, ctxt.tag, ctxt.id, 
                     err.code, err.message, err.details, 
                     instance.fixedargs.fatal$?'all-errors-fatal':'-']

      instance.log.fatal.apply( instance, logargs )

      var stack = err.stack || ''
      stack = stack.replace(/^.*?\n/,'\n')

      var procdesc = '\n  pid='+process.pid+
            ', arch='+process.arch+
            ', platform='+process.platform+
            ',\n  path='+process.execPath+
            ',\n  argv='+util.inspect(process.argv).replace(/\n/g,'')+
            ',\n  env='+util.inspect(process.env).replace(/\n/g,'')

      var fatalmodemsg = instance.fixedargs.fatal$ ? 
            '\n  ALL ERRORS FATAL: action called with argument fatal$:true '+
            '(probably a plugin init error, or using a plugin seneca instance, see senecajs.org/fatal.html)' : ''
      
      var stderrmsg =
            "\n\n"+
            "Seneca Fatal Error\n"+
            "==================\n\n"+
            "Message: "+err.message+"\n\n"+
            "Code: "+err.code+"\n\n"+
            "Details: "+util.inspect(err.details,{depth:null})+"\n\n"+
            "Stack: "+stack+"\n\n"+
            "Instance: "+instance.toString()+fatalmodemsg+die_trace+"\n\n"+
            "When: "+new Date().toISOString()+"\n\n"+
            "Log: "+common.owndesc(logargs,3)+"\n\n"+
            "Node:\n  "+util.inspect(process.versions).replace(/\s+/g,' ')+
            ",\n  "+util.inspect(process.features).replace(/\s+/g,' ')+
            ",\n  "+util.inspect(process.moduleLoadList).replace(/\s+/g,' ')+"\n\n"+
            "Process: "+procdesc+"\n\n"


      if( so.errhandler ) {
        so.errhandler.call(instance,err)
      }

      if( instance.closed ) return;

      if( !undead ) {
        instance.close(     
          // terminate process, err (if defined) is from seneca.close
          function ( err ) {
            if( !undead ) {
              process.nextTick(function() {
                if( err ) console_error( err );
                console_error( stderrmsg )
                console_error("\n\nSENECA TERMINATED at "+(new Date().toISOString())+
                  ". See above for error report.\n\n")

                // can not exit in the browser
                //process.exit(1)
              })
            }
          }
        )
      }

      // make sure we close down within options.deathdelay seconds
      if( !undead ) {
        var killtimer = setTimeout(function() {
          console_error( stderrmsg )
          console_error("\n\nSENECA TERMINATED (on timeout) at "+(new Date().toISOString())+
                        ".\n\n")
          // can not exit in the browser
          //process.exit(2);
        }, so.deathdelay);
        killtimer.unref();
      }
    }
    catch(panic) {
      var msg =
            "\n\n"+
            "Seneca Panic\n"+
            "============\n\n"+
            panic.stack+
            "\n\nOrginal Error:\n"+
            (arguments[0] && arguments[0].stack ? arguments[0].stack : arguments[0])
      console_error(msg)
    }
  }

  die.context = ctxt
  
  return die
}



function make_trace_act( opts ) {
  return function() {
    var args = Array.prototype.slice.call(arguments,0)
    args.unshift(new Date().toISOString())

    if( opts.stack ) {
      args.push(new Error('trace...').stack)
    }

    console_log(args.join('\t'))
  }
}


function pin_patrun_customizer(pat,data) {
  /* jshint validthis:true */

  var pi = this

  var gexers = {}
  _.each(pat, function(v,k) {
    if( _.isString(v) && ~v.indexOf('*') ) {
      delete pat[k]
      gexers[k] = gex(v)
    }
  })

  // handle previous patterns that match this pattern
  var prev     = pi.list(pat)
  var prevfind = prev[0] && prev[0].find
  var prevdata = prev[0] && pi.findexact(prev[0].match)

  return function(args,data) {
    var pi  = this
    var out = data
    _.each(gexers,function(g,k) {
      var v = args[k]
      if( null == g.on( v ) ) { out = null }
    })

    if( prevfind && null == out ) {
      out = prevfind.call(pi,args,prevdata)
    }

    return out
  }
}


// Primary export function, creates a new Seneca instance.
function init( seneca_options, more_options ) {

  // Create instance.
  var seneca = make_seneca( _.extend( {}, seneca_options, more_options ))
  var so     = seneca.options()

  // Register default plugins, unless turned off by options.
  if( so.default_plugins.basic )        { seneca.use('basic') }
  if( so.default_plugins.transport )    { seneca.use('transport') }
  if( so.default_plugins.web )          { seneca.use('web') }
  if( so.default_plugins['mem-store'] ) { seneca.use('mem-store') }

  // Register plugins specified in options.
  _.each(so.plugins, function(plugindesc) {
    seneca.use(plugindesc)
  })

  return seneca
}



// To reference builtin loggers when defining logging options.
init.loghandler = logging.handlers



// Makes require('seneca').use( ... ) work by creating an on-the-fly instance.
init.use = function() {
  var instance = init()
  return instance.use.apply(instance,arr(arguments))
}



// Mostly for testing.
if( require.main === module ) {
  init()
}


// Minor utils
function thrower(err) {
  if( err ) throw err;
}


// Error code messages.
function ERRMSGMAP() {
  return {
    test_msg: 'Test message.',
    test_prop: 'TESTING: exists: <%=exists%>, notfound:<%=notfound%>, str=<%=str%>, obj=<%=obj%>, arr=<%=arr%>, bool=<%=bool%>, null=<%=null$%>, delete=<%=delete$%>, undefined=<%=undefined$%>, void=<%=void$%>, NaN=<%=NaN$%>',

    add_string_pattern_syntax: 'Could not add action due to syntax error in pattern string: "<%=argstr%>": Line:<%=line%>, Column:<%=col%>; <%=syntax%>',
    act_string_args_syntax: 'Could execute action due to syntax error in argument string: "<%=argstr%>": Line:<%=line%>, Column:<%=col%>; <%=syntax%>',

    add_pattern_object_expected_after_string_pattern: 'Could not add action; unexpected argument; a pattern object or function should follow the pattern string; arguments were: "<%=args%>".',
    add_pattern_object_expected: 'Could not add action; unexpected argument; a pattern object or string should be the first argument; arguments were: "<%=args%>".',

    add_action_function_expected: 'Could not add action: the action function should appear after the pattern; arguments were: "<%=args%>".',
    add_action_metadata_not_an_object: 'Could not add action: the argument after the action function should be a metadata object: <%=actmeta%>.',

    add_empty_pattern: 'Could not add action, as the action pattern is empty: "<%=args%>"',

    act_if_expects_boolean: 'The method act_if expects a boolean value as its first argument, was: "<%=first%>".',

    act_not_found: 'No matching action pattern found for <%=args%>, and no default result provided (using a default$ property).',
    act_default_bad: 'No matching action pattern found for <%=args%>, and default result is not a plain object: <%=xdefault%>.',
    act_no_args: 'No action pattern defined in "<%=args%>"; the first argument should be a string or object pattern.',
    act_invalid_args: 'Action <%=pattern%> has invalid arguments; <%=message%>; arguments were: <%=args%>.',
    act_execute: 'Action <%=pattern%> failed: <%=message%>.',
    act_callback: 'Action <%=pattern%> callback threw: <%=message%>.',

    result_not_objarr: 'Action <%=pattern%> responded with result that was not an object or array: <%=result%>; Use option strict:{result:false} to allow; arguments were: <%=args%>',

    no_client: 'Transport client was not created; arguments were: "<%=args%>".',

    invalid_options: 'Invalid options; <%=message%>',

    plugin_required: 'The <%=name%> plugin depends on the <%=dependency%> plugin, which is not loaded yet.',
    plugin_init: 'The <%=name%> plugin failed to initialize: <%=plugin_error%>.',
    plugin_init_timeout: 'The <%=name%> plugin failed to initialize within <%=timeout%> milliseconds (The init:<%=name%> action did not call the "done" callback in time).',

    export_not_found: 'The export <%=key%> has not been defined by a plugin.',

    store_cmd_missing: 'Entity data store implementation is missing a command; "<%=cmd%>": "<%=store%>".',

    sub_function_catch: 'Pattern subscription function threw: <%=message%> on args: <%=args%>, result: <%=result%>.',

    ready_failed: 'Ready function failed: <%=message%>'
  }
}


// Intentional console output uses this function. Helps to find spurious debugging.
function console_log() {
  console.log.apply(console,arguments)
}

// Intentional console errors use this function. Helps to find spurious debugging.
function console_error() {
  console.error.apply(console,arguments)
}
