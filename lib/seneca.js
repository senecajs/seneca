/* Copyright (c) 2010-2014 Richard Rodger, MIT License */
/* jshint node:true, asi:true, eqnull:true */
"use strict";


// Current version, access using _seneca.version_ property
var VERSION = '0.5.20'


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
var minimist     = require('minimist')
var nid          = require('nid')
var jsonic       = require('jsonic')
var patrun       = require('patrun')
var parambulator = require('parambulator')
var norma        = require('norma')
var stats        = require('rolling-stats')
var makeuse      = require('use-plugin')
var lrucache     = require('lru-cache')
var executor     = require('gate-executor')


// Internal modules
var Entity       = require('./entity').Entity
var store        = require('./store')
var logging      = require('./logging')
var plugin_util  = require('./plugin-util')
var makeoptioner = require('./optioner')


// Utility functions
var common   = require('./common')


// Abbreviations
var arr = common.arrayify


// Exports.
module.exports = init


// Create a new Seneca instance.
//
//    * $     &rarr;  private context
//    * opts  &rarr;  options
function make_seneca($, initial_options ) {
  /* jshint validthis:true */

  initial_options = initial_options || {}

  // Seneca is an EventEmitter.
  function Seneca() {
    events.EventEmitter.call(this)
  }
  util.inherits(Seneca, events.EventEmitter)

  var self = new Seneca()
  self.context = {}

  // Expose the current version of Seneca
  self.version = VERSION



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


  self.sub = api_sub


  self.logroute   = api_logroute
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

  self.has        = api_hasact
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

  self.options    = api_options


  self.findact       = api_findact
  self.findact.mark  = 'top'


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
  var optioner = $.optioner = 
        makeoptioner( 
          argv, 
          initial_options.module || module.parent || module,
          
          // Default options.
          {
            tag:             '-',
            idlen:           12,
            timeout:         33333,
            status_interval: 60000,
            actcache_size:   1111,

            trace:{
              act:   false,
              stack: false
            },

            stats: {
              size:     1024,
              duration: 60000,
              running:  false
            },
            debug:{
              allargs:  false
            },
            deathdelay: 33333,
            test:{
              stayalive: false
            },
            admin:{
              local:  false,
              prefix: '/admin'
            },
            plugin:{},
            internal: {
              actrouter: patrun()
            }
          }
        )

  // not needed after this point, and screws up debug printing
  delete initial_options.module 

  var so = optioner.set( initial_options )

  paramcheck.options.validate(so,thrower)

  // Identifier generator.
  self.idgen = nid({length:so.idlen})


  // Create a unique identifer for this instance.
  self.id = self.idgen()+'/'+Date.now()+'/'+so.tag

  self.name = 'Seneca/'+self.version+'/'+self.id

  $.logrouter = logging.makelogrouter(so.log)

  self.log = logging.makelog($.logrouter,self.id)

  
  // TODO: support options
  $.executor = executor({
    trace:   _.isFunction(so.trace.act) ? so.trace.act : 
      (!!so.trace.act) ? make_trace_act({stack:so.trace.stack}) : false,
    timeout: so.timeout,
    error: function(err) {
      if( !err ) return;

      err.details        = err.details || {}
      err.details.plugin = err.details.plugin || {}

      self.log.error( 'act',
                      err.details.plugin.name || '-',
                      err.details.plugin.tag  || '-',
                      err.details.id          || '-',
                      err.details.pattern     || '-', 
                      err.message,
                      err.code,
                      common.descdata(err.details),
                      err.stack )
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
    $.stats = $.stats || {}
    setInterval(function() {
      var stats = {alive:(Date.now()-$.stats.start),act:$.stats.act}
      self.log.info('status',stats)
    },so.status_interval)
  }

  if( so.stats ) {
    $.timestats = new stats.NamedStats( so.stats.size, so.stats.duration )

    if( so.stats.running ) {
      setInterval(function() {
        $.timestats.calculate()
      }, so.stats.duration )
    }
  }


  $.plugins      = {}
  $.exports      = { options: common.deepextend({},so) }
  $.actrouter    = so.internal.actrouter
  $.plugin_order = { byname:[], byref:[] }
  $.use          = makeuse({
    prefix:    'seneca-', 
    module:    module, 
    msgprefix: false,

    // Fake false, update use-plugin when fixed.
    builtin:   ''
  })
  $.actcache     = lrucache({max:so.actcache_size})

  // prevent process exit
  self.on('error',common.noop) 


  self.toString = api_toString

  self.fail = makefail( self, {type:'sys',plugin:'seneca',tag:self.version,id:self.id} )


  self.util = {
    deepextend: common.deepextend,
    recurse:    common.recurse,
    clean:      common.clean,
    copydata:   common.copydata,
    nil:        common.nil,
    argprops:   common.argprops,
    print:      common.print,

    router:     function() { return patrun() },
    parsecanon: Entity.parsecanon,
  }


  self.store = {
    init: store.init,
    cmds: store.cmds
  }


  // say hello, printing identifier to log
  self.log.info('hello',self.toString())


  // dump options if debugging
  self.log.debug('options',function() {return util.inspect(so,false,null).replace(/[\r\n]/g,' ')})


  function api_logroute(entry,handler) {
    if( 0 === arguments.length ) return $.logrouter.toString()

    entry.handler = handler || entry.handler
    logging.makelogroute(entry,$.logrouter)
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


  // TODO: remove cbfunc - this is hiding errors! log them instead
  function api_register( plugin, cbfunc ) {
    var self = this

    cbfunc = _.isFunction(cbfunc) ? cbfunc : common.noop
    paramcheck.register.validate(plugin,thrower)

    var fullname = plugin.name+(plugin.tag?'/'+plugin.tag:'')
    var tag      = plugin.tag||'-'
    var nameref  = [plugin.name,tag]

    plugin.fullname = fullname
    var sd = plugin_util.make_delegate( 
      self, 
      plugin, 
      {tag:tag,nameref:nameref},
      {makefail:makefail, makedie:makedie}
    )

    self.log.debug('register','init',fullname)
    
    var plugin_options = plugin_util.resolve_options(fullname,plugin,so)

    sd.log.debug('DEFINE',plugin_options)

    plugin_util.define_plugin( sd, plugin, plugin_options, function(err,meta) {
      if( err ) return cbfunc(err);
      meta = meta || {}

      // legacy api for service function
      if( _.isFunction(meta) ) {
        meta = {service:meta}
      }

      plugin.name    = meta.name    || plugin.name
      plugin.tag     = meta.tag     || plugin.tag || 
        (plugin.options && plugin.options.tag$)
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
        self.act('role:web',{use:service})
      }

      self.act(
        {
          init:plugin.name,
          tag:plugin.tag,
          default$:{},
          gate$:true
        },
        function(err,out) {
          if( err ) {
            return self.die('plugin_init',err,plugin)
          }
          return self.log.debug('register','ready',pluginref,out)
        }
      )

      var exports = []
      
      if( void 0 != meta.export ) {
        $.exports[pluginref] = meta.export
        exports.push(pluginref)
      }

      if( _.isObject(meta.exportmap) || _.isObject(meta.exports) ) {
        meta.exportmap = meta.exportmap || meta.exports
        _.each(meta.exportmap,function(v,k) {
          if( void 0 != v ) {
            var exportname = pluginref+'/'+k
            $.exports[exportname] = v
            exports.push(exportname)
          }
        })
      }

      self.log.debug('register','install',pluginref,
                     {exports:exports},fullname!=pluginref?fullname:undefined)

      cbfunc(null)
    })
  }



  
  function api_depends() {
    var args = norma('{pluginname:s deps:a? moredeps:s*}',arguments)
    
    var deps = args.deps || args.moredeps

    _.every(deps, function(depname) {
      if( !_.contains($.plugin_order.byname,depname) &&
          !_.contains($.plugin_order.byname,'seneca-'+depname) ) {
        self.die('plugin_required',{name:args.pluginname,dependency:depname})
        return false
      }
      else return true;
    })
  }



  function api_export( key ) {
    var exportval = $.exports[key];
    if( !exportval ) {
      return self.die( 'export_not_found', {key:key} )
    }
    
    return exportval;
  }


  self.die = makedie( self, {type:'sys',plugin:'seneca',tag:self.version,id:self.id} )



  // all optional
  function api_make() {
    var args = arr(arguments)
    var si = (this && this.seneca) ? this : self
    args.unshift(si)
    return $.entity.make$.apply($.entity,args)
  }
  self.make$ = self.make




  function api_listen() {
    var self = this

    var config = arr(arguments)

    self.act('role:transport,cmd:listen',{config:config,gate$:true},function(err) {
      if( err ) return self.die('transport_listen',err,config)
    })

    return self
  }




  function api_client() {
    var self = this
    var config = arr(arguments)


    // WARNING!!!!
    // A horrible, temporary hack so that .act calls after a .client will work
    // without needing .ready
    // SOLUTION: api_act should insert entire action performance into executor,
    // including findact call
    // REFACTOR REFACTOR REFACTOR

    var findact = _.bind(self.findact.check_orig || self.findact,self)
    var check_findact_mark = 'check-client-'+nid()+'-orig-'+self.findact.mark
    self.findact = function( args ) {
      var actmeta = findact( args )
      if( actmeta ) return actmeta;

      actmeta = {
        func: function(args,done) { 
          var seneca = this
          var count = 0

          function checkready() {
            var am = seneca.findact(args)
            if( am && am.client$ ) {
              am.func.call(seneca,args,done)
            }
            else if( count < 222 ) {
              count++
              setTimeout(checkready,55)
            }
            else throw self.fail('no-client',{args:args})
          }
          checkready()

        },
        plugin_nameref:'-',
        log:self.log,
        argpattern:common.argpattern(args),
        id:'CLIENT'
      }

      return actmeta
    }
    self.findact.mark = check_findact_mark
    self.findact.check_orig = findact


    self.act( 
      'role:transport,cmd:client',
      {config:config,gate$:true},
      function(err,sendclient) {
        if( err ) return self.die('transport_client',err,config)
        if( null == sendclient ) return self.die('transport_client_null',config)

        var findact = _.bind( self.findact.check_orig || self.findact, self )
        findact.mark = 'bind-client-'+nid()+'-orig-'+self.findact.mark

        self.findact = function( args ) {
          var clientmatch = sendclient.match.call( self, args )
          if( !clientmatch ) return findact( args );

          var actmeta = {
            func: function(args,done) { 
              try {
                sendclient.send.call( self, args, done ) 
              }
              catch( e ) { 
                done(e) 
              }
            },
            plugin_nameref:'-',
            log:self.log,
            argpattern:common.argpattern(args),
            id:'CLIENT',
            client$:true
          }

          return actmeta
        }
        self.findact.mark = 'send-'+findact.mark
      })


    return self
  }




  function api_cluster() {
    /* jshint loopfunc:true */
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


    var methods = $.actrouter.list(pattern)


    var api = {toString:function() {return 'pin:'+common.descdata(pattern,1)+'/'+thispin}}

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
    subargs.pattern.sub$ = true

    return api_add.call(self,subargs.pattern,function(args,done) {
      subargs.action.call(this,args)
      this.prior(args,done)
    },subargs.actmeta)
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
      throw self.fail('add_empty_pattern',{args:args})
    }


    var pattern_rules = {}
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
    actmeta.argpattern = common.argpattern( pattern )
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


    $.stats.actmap[actmeta.argpattern] = 
      $.stats.actmap[actmeta.argpattern] || 
      {id:actmeta.id,
       plugin:{full:actmeta.plugin_fullname,name:actmeta.plugin_nameref,tag:actmeta.plugin_tag},
       prior:actmeta.priorpath,calls:0,done:0,fails:0,time:{}}
    
    if( addroute ) {
      var addlog = [ actmeta.sub ? 'SUB' : 'ADD', 
                     actmeta.id, common.argpattern(pattern) ]
      var isplugin = self.context.isplugin
      var logger   = self.log.log || self.log

      if( !isplugin ) {
        addlog.unshift('-')
        addlog.unshift('-')
        addlog.unshift('single')
      }

      logger.debug.apply( self, addlog )
      $.actrouter.add(pattern,actmeta)
    }

    return self
  }
  


  self.compose = function(args,acts) {
    self.add(args,function(call_args,cb) {
      function call_act(i,cur_args) {
        if( i < acts.length ) {
          cur_args = _.omit(cur_args,_.keys(acts[i-1]||args))
          cur_args = _.extend(cur_args,acts[i])

          self.act(cur_args,function(err,next_args) {
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
    var patterns = _.flatten(arr(arguments))
    _.each( patterns, function(pattern) {
      pattern = _.isString(pattern) ? jsonic(pattern) : pattern
      pins = pins.concat( _.map( $.actrouter.list(pattern), function(desc) {return desc.match} ) )
    })
    return pins
  }



  function api_actroutes() {
    return $.actrouter.toString(function(d) {
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
    var found = $.actrouter.list( args )
    
    found = _.map( found, function(entry) {
      return entry.match
    })
    return found
  }



  function handle_act_args(self,orig) {
    var args = parse_pattern( self, orig, 'done:f?' )
    var done = args.done ? args.done : common.noop

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



  // Perform an action. The propeties of the first argument are matched against 
  // known patterns, and the most specific one wins.
  function api_act() {
    var self = this

    var argscb = handle_act_args(self,arr(arguments))
    var args = argscb[0]
    var cb   = argscb[1]

    var actmeta = self.findact(args)

    function provide_default() {
      self.log.debug('act','-','-','DEFAULT',self.util.clean(args))
      cb.call(self,null,args.default$);
    }

    if( !actmeta ) {
      if( _.isUndefined(args.default$) ) {
        var err = self.fail('act_not_found',{args:args})

        err.details = err.details || {}
        err.details.plugin = err.details.plugin || {}

        self.log.error('act',
                       err.details.plugin.name || '-',
                       err.details.plugin.tag  || '-',
                       err.details.id          || '-',
                       err.details.pattern     || '-', 
                       err.message,
                       err.code,
                       common.descdata(err.details),
                       err.stack )

        return cb( err )
      }
      else provide_default()
    }
    else do_act(self,actmeta,false,args,cb)

    return self
  }



  // TODO: just use var self = this
  function api_wrap(pin,wrapper) {
    var pinthis = this || self

    if( _.isArray(pin) ) {
      _.each(pin, function(p) {
        do_wrap(p)
      })
    }
    else return do_wrap(pin);

    function do_wrap( pin ) {
      _.each( pinthis.pinact(pin), function(actpattern) {
        pinthis.add(actpattern,function(args,done) {
          wrapper.call(this,args,done)
        })
      })
    }
  }



  // close seneca instance
  // sets public seneca.closed property
  function api_close(done) {
    var self = this
    
    self.closed = true

    self.log.debug('close','start')
    self.act('role:seneca,cmd:close',function(err) {
      this.log.debug('close','end',err)
      if( _.isFunction(done) ) return done.call(this,err);
    })
  }



  // useful when defining services!
  function api_ready(ready) {
    var self = this

    if( _.isFunction(ready) ) {
      self.act('role:seneca,ready:true,gate$:true',ready)
    }

    return self;
  }



  // use('pluginname') - built-in, or provide calling code 'require' as seneca opt
  // use( require('pluginname') ) - plugin object, init will be called
  // if first arg has property senecaplugin 
  function api_use( arg0, arg1, arg2 ) {
    var self = this, plugindesc;

    // Legacy options
    if( 'options' == arg0 ) {
      self.options( arg1 )
      return self
    }

    try {
      plugindesc = $.use( arg0, arg1, arg2 )
    }
    catch(e) {
      return self.die( 'plugin_'+e.code, e );
    }

    self.register( plugindesc, plugindesc.callback )

    return self
  }


  // TODO: move repl functionality to lib/repl.js

  self.inrepl = function() {
    self.on('act-out',function() {
      logging.handlers.print.apply(null,arr(arguments))
    })
    
    self.on('error',function(err) {
      var args = arr(arguments).slice()
      args.unshift('ERROR: ')
      logging.handlers.print.apply(null,arr(args))
    })
  }


  self.startrepl = function(in_opts) {
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
    return self
  }



  // Describe this instance using the form: Seneca/VERSION/ID
  function api_toString() {
    return this.name
  }



  function do_act(instance,actmeta,isprior,origargs,cb) {
    var act_start = new Date().getTime()

    var args = _.clone(origargs)

    if( null != args.actid$ ) {
      var actdetails = $.actcache.get(args.actid$)      
      if( actdetails ) {
        $.stats.act.cache++
        self.log.debug('act',
                       actdetails.actmeta.plugin_nameref[0]||'-',
                       actdetails.actmeta.plugin_nameref[1]||'-',
                       args.actid$,'CACHE',
                       function() {
                         return [actdetails.actmeta.descdata ? 
                                 actdetails.actmeta.descdata(args) : 
                                 common.descdata(args), actdetails.actmeta.id]
                       })

        return cb.apply( instance, actdetails.result )
      }
    }


    var actid = ( args.actid$ || self.idgen() )

    
    // FIX: make this error nice to handle for calling code - get rid of circular ref
    if( actmeta.parambulator ) {
      actmeta.parambulator.validate(args,function(err) {

        if( err ) {
          throw instance.fail('act_invalid_args',
                              {message:err.message,args:origargs})
        }

        return perform(actmeta)
      })
    } 
    else return perform(actmeta);


    function perform(actmeta) {
      var actstats = ($.stats.actmap[actmeta.argpattern] = 
                      $.stats.actmap[actmeta.argpattern] || {})

      var plugin_nameref = 
            (actmeta.plugin_nameref = (actmeta.plugin_nameref||['-','-']))

      var do_log = !actmeta.sub

      if( do_log ) {
        self.log.debug('act',plugin_nameref[0]||'-',plugin_nameref[1]||'-',
                       'IN',actid,actmeta.argpattern,function() {
          var argmeta = args.gate$ ? 'GATE' : void 0
          argmeta = args.ungate$ ? 
            argmeta ? argmeta+';UNGATE':'UNGATE' : argmeta || void 0
          return [actmeta.descdata ? actmeta.descdata(args) : common.descdata(args),
                  actmeta.id, argmeta]
        })
      }
      

      // TODO: review the way this works
      var delegate_args = {}
      if( null != args.gate$ ) {
        delegate_args.ungate$ = !!args.gate$
      }
      var delegate = instance.delegate( delegate_args )


      instance.emit('act-in', actmeta.argpattern, actid, args)


      // automate actid log insertion
      delegate.log = function() {
        var args = arr(arguments)

        if( _.isFunction(actmeta.log) ) {
          var entries = [args[0],'ACT',actid].concat(args.slice(1))
          actmeta.log.apply(instance,entries)
        }
        else {
          instance.log.apply(
            instance,
            [args[0],'single','-','-','ACT',actid]
              .concat(args.slice(1)))
        }
      }
      delegate.log.log = actmeta.log
      logging.makelogfuncs(delegate)


      if( actmeta.priormeta ) {
        // TODO: deprecate parent
        delegate.prior = delegate.parent = function(args,cb) {
          do_act(delegate,actmeta.priormeta,true,args,cb)
        }
      }
      else delegate.prior = common.nil


      var callargs = args
      callargs.actid$ = actid

      // fixed args are not used for finding actions!!!
      if( delegate.fixedargs ) {
        callargs = _.extend({},args,delegate.fixedargs)
      }
      
      $.stats.act.calls++
      actstats.calls++
      var actstart = Date.now()




      var act_done = function(err) {
        var actend = Date.now()
        $.timestats.point( actend-actstart, actmeta.argpattern )

        var result  = arr(arguments)
        var call_cb = true

        $.actcache.set(actid,{result:result,actmeta:actmeta,when:Date.now()})


        if( err ) {
          $.stats.act.fails++
          actstats.fails++

          err.details = err.details || {}
          err.details.plugin = err.details.plugin || {}

          self.log.error('act',
                         err.details.plugin.name || '-',
                         err.details.plugin.tag  || '-',
                         'OUT',
                         actid,
                         err.details.pattern     || '-', 
                         err.message,
                         err.code,
                         common.descdata(err.details),
                         err.stack )

          self.emit('error',err)
          if( so.errhandler ) {
            call_cb = !so.errhandler(err)
          }
        }
        else {
          var emitresult = result.slice()
          emitresult.unshift(actid)
          emitresult.unshift(actmeta.argpattern)
          emitresult.unshift('act-out')
          instance.emit.apply(instance,emitresult)
          
          result[0] = null

          if( do_log ) {
            self.log.debug('act',plugin_nameref[0]||'-',plugin_nameref[1]||'-',
                           'OUT',actid,actmeta.argpattern,function() {
              return _.flatten( [ _.flatten([ actmeta.descdata ? 
                                              actmeta.descdata(result.slice(1)) : 
                                              common.descdata(result.slice(1)) ], 
                                            true), actmeta.id ] )
            })
          }

          $.stats.act.done++
          actstats.done++
        }
        
        try {
          if( call_cb ) {
            cb.apply(delegate,result) // note: err == result[0]
          }
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

          // TODO: not really satisfactory
          var err = instance.fail( error, {result:result} )
          self.log.error('act','err',actid,'callback', 
                         err.message, actmeta.id, origargs, error.stack )

          self.emit('error',err)
          if( so.errhandler ) {
            so.errhandler(err)
          }
        }
      }

      $.executor.execute({
        id:      actid,
        gate:    !!callargs.gate$,
        ungate:  !!callargs.ungate$,
        pattern: actmeta.argpattern,
        cb:      act_done,

        plugin: {
          name: actmeta.plugin_nameref ? actmeta.plugin_nameref[0] : undefined,
          tag:  actmeta.plugin_nameref ? actmeta.plugin_nameref[1] : undefined,
        },

        fn:function(cb) {
          delegate.good = function(out) {
            cb(null,out)
          }

          delegate.bad = function(err) {
            cb(err)
          }

          actmeta.func.call(delegate,callargs,cb)
        },
      })
    }
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
      var argscb = handle_act_args(this,arr(arguments))

      // can't override fixedargs
      var args = _.extend({},argscb[0],fixedargs)

      var cb = argscb[1]

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
    
    delegate.delegate = function(further_fixedargs) {
      var args = _.extend({},further_fixedargs||{},fixedargs)
      return self.delegate.call(this,args)
    }

    delegate.fixedargs = fixedargs

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
    so = $.exports.options = 
      (null == options) ? optioner.get() : optioner.set( options );

    if( options && options.log ) {
      $.logrouter = logging.makelogrouter(so.log)
      self.log = logging.makelog($.logrouter,self.id)
    }

    return so
  }



  // DEPRECATED 
  // for use with async
  self.next_act = function() {
    var si   = this || self
    var args = arr(arguments)
    
    return function(next) {
      args.push(next)
      si.act.apply(si,args)
    }
  }


  return self
}




// Utilities

// Error arguments:
// code
// code, values
// code, Error, values
// Error (optional code,message properties), values
// values (optional code,message properties)
function handle_error_args( args, ctxt ) {
  args = arr(args)

  var first = args[0]
  var valstart = 1

  var code = 'unknown'
  code = _.isString(first) ? first : code 
  code = util.isError(first) && _.isString(first.code) ? first.code : code
  code = _.isObject(first) && _.isString(first.code) ? first.code : code 


  if( _.isObject(first) && !util.isError(first) ) {
    valstart = 0
  }

  var error = util.isError(first) ? first : util.isError(args[1]) ? (valstart=2,args[1]) : null

  var valmap = _.isObject(args[valstart]) ? args[valstart] : {}

  var message = (MSGMAP[ctxt.plugin] && MSGMAP[ctxt.plugin][code])
  message = _.isString(message) ? message : (_.isString(valmap.message) && valmap.message)
  message = _.isString(message) ? message : (error && _.isString(error.message) && error.message)


  if( !_.isString(message) ) {
    try {
      message = code+': '+util.inspect(args)
    }
    catch(e) {
      message = code
    }
  }


  // workaround to prevent underscore blowing up if properties are not found
  // reserved words and undefined need to be suffixed with $ in the template interpolates

  // TODO: use eraro

  var valstrmap = {}
  _.each(valmap,function(val,key) {
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
    code:      code,
    error:     error,
    message:   message,
    remaining: args.slice(valstart),
    valmap:    valmap,
    callback:  _.isFunction(args[valstart]) ? args[valstart] : null
  }
}



function makedie( instance, ctxt ) {
  ctxt = _.extend(ctxt,instance.die?instance.die.context:{})

  var die = function() {
    var args = handle_error_args(arguments,ctxt)

    var code    = args.code
    var error   = args.error
    var message = args.message

    var so = instance.options()

    // stayalive is only for testing, do not use in production
    var stayalive = so.test.stayalive || (error && error.stayalive)

    var logargs  = [ctxt.type, ctxt.plugin, ctxt.tag, ctxt.id, code]
          .concat( message && message != code ? message : void 0 )
          .concat( args.remaining )

    if( !error ) {
      error = new Error( code )
    }

    instance.log.fatal.apply( instance, logargs )

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
          "Instance: "+instance.toString()+"\n\n"+
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


    // this blocks, but that's ok, we want to be sure the error description 
    // is printed to STDERR
    console.error( stderrmsg )

    // terminate process, err (if defined) is from seneca.close
    function die( err ) {
      if( !stayalive ) {
        process.nextTick(function() {
          if( err ) console.error( err );
          console.error("Terminated at "+(new Date().toISOString())+
                        ". See above for error report.\n\n")
          process.exit(1)
        })
      }
    }

    instance.close( die )

    // make sure we close down within options.deathdelay seconds
    if( !stayalive ) {
      var killtimer = setTimeout(function() {
        console.error("Terminated (on timeout) at "+(new Date().toISOString())+
                      ".\n\n")
        process.exit(2);
      }, so.deathdelay);
      killtimer.unref();
    }
  }

  die.context = ctxt
  
  return die
}



function makefail( instance, ctxt ) {
  ctxt = _.extend(ctxt,instance.fail?instance.fail.context:{})

  var fail = function() {
    var args = handle_error_args(arguments,ctxt)

    var code    = args.code
    var error   = args.error
    var message = args.message


    message = instance.toString()+': '+message
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

    // DEPRECATED
    if( _.isFunction( args.callback ) ) {
      args.callback.call( instance, error )
    }

    return error;
  }

  fail.context = ctxt

  return fail
}



function make_trace_act( opts ) {
  return function() {
    var args = Array.prototype.slice.call(arguments,0)
    args.unshift(new Date().toISOString())

    if( opts.stack ) {
      args.push(new Error('trace...').stack)
    }

    console.log(args.join('\t'))
  }
}


// Primary export function, creates a new Seneca instance.
function init( seneca_options ) {
  var so = seneca_options || {}



  // Create a private context.
  var $ = {
    stats:{
      start:new Date().getTime(),
      act:{calls:0,done:0,fails:0,cache:0},
      actmap:{}
    }
  }



  // Create instance.
  var seneca = make_seneca($,so)



  // Add builtin actions.
  seneca.add( {role:'seneca',  stats:true},  action_seneca_stats )
  seneca.add( {role:'seneca',  ready:true},  action_seneca_ready )
  seneca.add( {role:'seneca',  cmd:'close'}, action_seneca_close )
  seneca.add( {role:'options', cmd:'get'},   action_options_get  )



  // Define builtin actions.

  function action_seneca_close(args,done) {
    seneca.emit('close')
    done()
  }


  function action_seneca_ready(args,done) {
    seneca.emit('ready')
    done()
  }


  function action_seneca_stats( args, done ) {
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
        _.each( $.stats.actmap, function(a,p) { $.stats.actmap[p].time = $.timestats.calculate(p) })
      }
    }

    done(null,stats)
  }


  function action_options_get( args, done ) {
    var options = $.optioner.get()
    
    var base = args.base || null
    var root = base ? (options[base]||{}) : options 
    var val  = args.key ? root[args.key] : root

    done(null,common.copydata(val))
  }



  // register default plugins
  seneca.use('basic')
  seneca.use('mem-store')
  seneca.use('transport')
  seneca.use('web')



  // Register plugins specified in options.
  _.each(so.plugins, function(plugindesc) {
    seneca.use(plugindesc)
  })


  // Create entity delegate.
  var sd = seneca.delegate()
  sd.log = function() {
    var args = ['entity']
    seneca.log.apply(seneca,args.concat(arr(arguments)))
  }
  logging.makelogfuncs(sd)
  

  // Template entity that makes all others.
  $.entity = new Entity({},sd)

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
var MSGMAP = {
  seneca:{
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

    act_not_found: 'No matching action pattern found for "<%=args%>", and no default result provided (using a default$ property).',
    act_no_args: 'No action pattern defined in "<%=args%>"; the first argument should be a string or object pattern.',
    act_invalid_args: 'Invalid action arguments; <%=message%>; arguments were: "<%=args%>".',
    no_client: 'Transport client was not created; arguments were: "<%=args%>".',

    invalid_options: 'Invalid options; <%=message%>',

    plugin_required: 'The <%=name%> plugin depends on the <%=dependency%> plugin, which is not loaded yet.',

    store_cmd_missing: 'Entity data store implementation is missing a command; "<%=cmd%>": "<%=store%>".',
  }
}
