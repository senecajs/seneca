/* Copyright (c) 2010-2015 Richard Rodger, MIT License */
// <style> p,ul,li { margin:5px !important; } </style>
'use strict'

// Node API modules
var Assert = require('assert')
var Events = require('events')
var Util = require('util')

// External modules.
var _ = require('lodash')
var Eraro = require('eraro')
var Executor = require('gate-executor')
var Gex = require('gex')
var Jsonic = require('jsonic')
var Lrucache = require('lru-cache')
var Makeuse = require('use-plugin')
var Nid = require('nid')
var Norma = require('norma')
var Patrun = require('patrun')
var Parambulator = require('parambulator')
var Stats = require('rolling-stats')
var Zig = require('zig')

// Internal modules.
var Cluster = require('./lib/cluster')
var Common = require('./lib/common')
var Errors = require('./lib/errors')
var Legacy = require('./lib/legacy')
var Logging = require('./lib/logging')
var MakeEntity = require('./lib/entity')
var Optioner = require('./lib/optioner')
var Package = require('./package.json')
var Plugins = require('./lib/plugins')
var Print = require('./lib/print')
var Repl = require('./lib/repl')
var Store = require('./lib/store')
var Transport = require('./lib/transport')

// Shortcuts
var arrayify = Common.arrayify

var internals = {
  error: Eraro({
    package: 'seneca',
    msgmap: Errors,
    override: true
  }),
  defaults: {
    // Tag this Seneca instance, will be appended to instance identifier.
    tag: '-',

    // Standard length of identifiers for actions.
    idlen: 12,

    // Standard timeout for actions.
    timeout: 11111,

    // Register (true) default plugins. Set false to not register when
    // using custom versions.
    default_plugins: {
      basic: true,
      'mem-store': true,
      transport: true,
      web: true
    },

    // Settings for network REPL.
    repl: {
      port: 30303,
      host: null
    },

    // Debug settings.
    debug: {
      // Throw (some) errors from seneca.act.
      fragile: false,

      // Fatal errors ... aren't fatal. Not for production!
      undead: false,

      // Print debug info to console
      print: {
        // Print options. Best used via --seneca.print.options.
        options: false
      },

      // Trace action caller and place in args.caller$.
      act_caller: false,

      // Shorten all identifiers to 2 characters.
      short_logs: false,

      // Record and log callpoints (calling code locations).
      callpoint: false
    },

    // Enforce strict behaviours. Relax when backwards compatibility needed.
    strict: {
      // Action result must be a plain object.
      result: true,

      // Delegate fixedargs override action args.
      fixedargs: true,

      // Adding a pattern overrides existing pattern only if matches exactly.
      add: false
    },

    // Action cache. Makes inbound messages idempotent.
    actcache: {
      active: true,
      size: 11111
    },

    // Action executor tracing. See gate-executor module.
    trace: {
      act: false,
      stack: false,
      unknown: 'warn'
    },

    // Action statistics settings. See rolling-stats module.
    stats: {
      size: 1024,
      interval: 60000,
      running: false
    },

    // Wait time for plugins to close gracefully.
    deathdelay: 11111,

    // Default seneca-admin settings.
    // TODO: move to seneca-admin!
    admin: {
      local: false,
      prefix: '/admin'
    },

    // Plugin settings
    plugin: {},

    // Internal settings.
    internal: {
      // Close instance on these signals, if true.
      close_signals: {
        SIGHUP: true,
        SIGTERM: true,
        SIGINT: true,
        SIGBREAK: true
      }
    },

    // Log status at periodic intervals.
    status: {
      interval: 60000,

      // By default, does not run.
      running: false
    },

    // zig module settings for seneca.start() chaining.
    zig: {}
  }
}

// Seneca is an EventEmitter.
function Seneca () {
  Events.EventEmitter.call(this)
  this.setMaxListeners(0)
}
Util.inherits(Seneca, Events.EventEmitter)


module.exports = function init (seneca_options, more_options) {
  // Create instance.
  var seneca = make_seneca(_.extend({}, seneca_options, more_options))
  var so = seneca.options()

  // Register default plugins, unless turned off by options.
  if (so.default_plugins.basic) { seneca.use('basic') }
  if (so.default_plugins.transport) { seneca.use('transport') }
  if (so.default_plugins.web) { seneca.use('web') }
  if (so.default_plugins['mem-store']) { seneca.use('mem-store') }

  // Register plugins specified in options.
  _.each(so.plugins, function (plugindesc) {
    seneca.use(plugindesc)
  })

  return seneca
}

// To reference builtin loggers when defining logging options.
module.exports.loghandler = Logging.handlers

// Makes require('seneca').use(...) work by creating an on-the-fly instance.
module.exports.use = function () {
  var instance = module.exports()
  return instance.use.apply(instance, arrayify(arguments))
}

// Mostly for testing.
if (require.main === module) {
  module.exports()
}

// Create a new Seneca instance.
// * _initial_options_ `o` &rarr; instance options
function make_seneca (initial_options) {
  initial_options = initial_options || {} // ensure defined

  // Create a private context.
  var private$ = make_private()

  // Create a new root Seneca instance.
  var root = new Seneca()

  // Create option resolver.
  private$.optioner = Optioner(
    initial_options.module || module.parent || module,
    internals.defaults)

  // Not needed after this point, and screws up debug printing.
  delete initial_options.module

  // Create internal tools.
  var actnid = Nid({length: 5})
  var refnid = function () { return '(' + actnid() + ')' }
  var paramcheck = make_paramcheck()

  // Define options
  var so = private$.optioner.set(initial_options)
  paramcheck.options.validate(so, thrower)

  // These need to come from options as required during construction.
  so.internal.actrouter = so.internal.actrouter || Patrun({gex: true})
  so.internal.subrouter = so.internal.subrouter || Patrun(pin_patrun_customizer)

  var callpoint = make_callpoint(so.debug.callpoint)

  var repl = Repl(root, so)

  // Define public member variables.
  root.root = root
  root.start_time = Date.now()
  root.fixedargs = {}
  root.context = {}
  root.version = Package.version

  // Seneca methods. Official API.
  root.add = api_add // Add a message pattern and action.
  root.act = api_act // Perform action that matches pattern.
  root.sub = api_sub // Subscribe to a message pattern.
  root.use = api_use // Define a plugin.
  root.make = api_make // Make a new entity object.
  root.listen = Transport.listen(callpoint) // Listen for inbound messages.
  root.client = Transport.client(callpoint, private$) // Send outbound messages.
  root.export = api_export // Export plain objects from a plugin.
  root.has = api_has // True if action pattern defined.
  root.find = api_find // Find action by pattern
  root.list = api_list // List (a subset of) action patterns.
  root.ready = api_ready // Callback when plugins initialized.
  root.close = api_close // Close and shutdown plugins.
  root.options = api_options // Get and set options.
  root.repl = repl // Open a REPL on a local port.
  root.start = api_start // Start an action chain.
  root.error = api_error // Set global error handler.
  root.decorate = api_decorate // Decorate seneca object with functions

  // Method aliases.
  root.make$ = api_make
  root.hasact = api_has

  // Non-API methods.
  root.logroute = api_logroute
  root.register = Plugins.register(so, private$, paramcheck, makedie, callpoint)
  root.hasplugin = Plugins.isRegistered
  root.findplugin = Plugins.find(private$)
  root.plugins = Plugins.all(private$)
  root.depends = api_depends
  root.cluster = Cluster
  root.pin = api_pin
  root.actroutes = api_actroutes
  root.act_if = api_act_if
  root.wrap = api_wrap
  root.seneca = api_seneca
  root.fix = api_fix
  root.delegate = api_delegate

  // Legacy API; Deprecated.
  root.startrepl = repl
  root.findact = api_find

  // DEPRECATED
  root.fail = Legacy.fail(so)

  // Identifier generator.
  root.idgen = Nid({length: so.idlen})

  // Create a unique identifer for this instance.
  root.id = root.idgen() + '/' + root.start_time + '/' + process.pid + '/' + so.tag

  if (so.debug.short_logs || so.log.short) {
    so.idlen = 2
    root.idgen = Nid({length: so.idlen})
    root.id = root.idgen() + '/' + so.tag
  }

  root.name = 'Seneca/' + root.version + '/' + root.id

  root.die = makedie(root, {
    type: 'sys',
    plugin: 'seneca',
    tag: root.version,
    id: root.id,
    callpoint: callpoint
  })

  // Configure logging
  root.log = Logging.makelog(so.log, {
    id: root.id,
    start: root.start_time,
    short: !!so.debug.short_logs
  })

  // Error events are fatal, unless you're undead.  These are not the
  // same as action errors, these are unexpected internal issues.
  root.on('error', root.die)

  // TODO: support options
  private$.executor = Executor({
    trace: _.isFunction(so.trace.act) ? so.trace.act
      : (so.trace.act) ? make_trace_act({stack: so.trace.stack}) : false,
    timeout: so.timeout,
    error: function (err) {
      if (!err) return
      Logging.log_exec_err(root, err)
    },
    msg_codes: {
      timeout: 'action-timeout',
      error: 'action-error',
      callback: 'action-callback',
      execute: 'action-execute',
      abandoned: 'action-abandoned'
    }
  })

  // setup status log
  if (so.status.interval > 0 && so.status.running) {
    private$.stats = private$.stats || {}
    setInterval(function () {
      var status = {
        alive: (Date.now() - private$.stats.start),
        act: private$.stats.act
      }
      root.log.info('status', status)
    }, so.status.interval)
  }

  if (so.stats) {
    private$.timestats = new Stats.NamedStats(so.stats.size, so.stats.interval)

    if (so.stats.running) {
      setInterval(function () {
        private$.timestats.calculate()
      }, so.stats.interval)
    }
  }

  private$.plugins = {}
  private$.exports = { options: Common.deepextend({}, so) }
  private$.plugin_order = { byname: [], byref: [] }
  private$.use = Makeuse({
    prefix: 'seneca-',
    module: module,
    msgprefix: false,
    builtin: ''
  })

  private$.actcache = (so.actcache.active
    ? Lrucache({ max: so.actcache.size })
    : { set: _.noop })

  private$.wait_for_ready = false

  private$.actrouter = so.internal.actrouter
  private$.subrouter = so.internal.subrouter

  root.on('newListener', function (eventname) {
    if (eventname === 'ready') {
      if (!private$.wait_for_ready) {
        private$.wait_for_ready = true
        root.act('role:seneca,ready:true,gate$:true')
      }
    }
  })

  root.toString = api_toString

  root.util = {
    deepextend: Common.deepextend,
    recurse: Common.recurse,
    clean: Common.clean,
    copydata: Common.copydata,
    nil: Common.nil,
    argprops: Common.argprops,
    print: Common.print,
    router: function () { return Patrun() },
    parsecanon: MakeEntity.parsecanon
  }

  root.store = Store()

  // Used for extending seneca with api_decorate
  root._decorations = {}

  // say hello, printing identifier to log
  root.log.info('hello', root.toString(), callpoint())

  // dump options if debugging
  root.log.debug('options', function () {
    return Util.inspect(so, false, null).replace(/[\r\n]/g, ' ')
  })

  if (so.debug.print.options) {
    console_log('\nSeneca Options (' + root.id + '): before plugins\n' +
      '===\n')
    console_log(Util.inspect(so, {depth: null}))
    console_log('')
  }

  function api_logroute (entry, handler) {
    if (arguments.length === 0) {
      return root.log.router.toString()
    }

    entry.handler = handler || entry.handler
    Logging.makelogroute(entry, root.log.router)
  }

  function api_depends () {
    var self = this

    var args = Norma('{pluginname:s deps:a? moredeps:s*}', arguments)

    var deps = args.deps || args.moredeps

    _.every(deps, function (depname) {
      if (!_.contains(private$.plugin_order.byname, depname) &&
        !_.contains(private$.plugin_order.byname, 'seneca-' + depname)) {
        self.die(internals.error('plugin_required', { name: args.pluginname, dependency: depname }))
        return false
      }
      else return true
    })
  }

  function api_export (key) {
    var self = this

    // Legacy aliases
    if (key === 'util') {
      key = 'basic'
    }

    var exportval = private$.exports[key]
    if (!exportval) {
      return self.die(internals.error('export_not_found', {key: key}))
    }

    return exportval
  }

  // all optional
  function api_make () {
    var self = this
    var args = arrayify(arguments)
    args.unshift(self)
    return private$.entity.make$.apply(private$.entity, args)
  }
  root.make$ = root.make

  function api_pin (pattern, pinopts) {
    var thispin = this

    pattern = _.isString(pattern) ? Jsonic(pattern) : pattern

    var methodkeys = []
    for (var key in pattern) {
      if (/[\*\?]/.exec(pattern[key])) {
        methodkeys.push(key)
      }
    }

    var methods = private$.actrouter.list(pattern)

    var api = {
      toString: function () {
        return 'pin:' + Common.argpattern(pattern) + '/' + thispin
      }
    }

    methods.forEach(function (method) {
      var mpat = method.match

      var methodname = ''
      for (var mkI = 0; mkI < methodkeys.length; mkI++) {
        methodname += ((0 < mkI ? '_' : '')) + mpat[methodkeys[mkI]]
      }

      api[methodname] = function (args, cb) {
        var si = this && this.seneca ? this : thispin

        var fullargs = _.extend({}, args, mpat)
        si.act(fullargs, cb)
      }

      api[methodname].pattern$ = method.match
      api[methodname].name$ = methodname
    })

    if (pinopts) {
      if (pinopts.include) {
        for (var i = 0; i < pinopts.include.length; i++) {
          var methodname = pinopts.include[i]
          if (thispin[methodname]) {
            api[methodname] = Common.delegate(thispin, thispin[methodname])
          }
        }
      }
    }

    return api
  }

  var pm_custom_args = {
    rules: {
      entity$: function (ctxt, cb) {
        var val = ctxt.point
        if (val.entity$) {
          if (val.canon$({isa: ctxt.rule.spec})) {
            return cb()
          }
          else return ctxt.util.fail(ctxt, cb)
        }
        else return ctxt.util.fail(ctxt, cb)
      }
    },
    msgs: {
      entity$: 'The value <%=value%> is not a data entity of kind <%=rule.spec%>' +
        ' (property <%=parentpath%>).'
    }
  }

  function api_sub () {
    var self = this

    var subargs = Common.parsePattern(self, arguments, 'action:f actmeta:o?')
    var pattern = subargs.pattern
    if (null == pattern.in$ &&
      null == pattern.out$ &&
      null == pattern.error$ &&
      null == pattern.cache$ &&
      null == pattern.default$ &&
      null == pattern.client$) {
      pattern.in$ = true
    }

    if (!private$.handle_sub) {
      private$.handle_sub = function (args, result) {
        if (args.meta$.entry !== true) {
          return
        }

        var subfuncs = private$.subrouter.find(args)

        if (subfuncs) {
          args.meta$.sub = subfuncs.pattern

          _.each(subfuncs, function (subfunc) {
            try {
              subfunc.call(self, args, result)
            }
            catch (ex) {
              // TODO: not really satisfactory
              var err = internals.error(ex, 'sub_function_catch', { args: args, result: result })
              self.log.error(
                'sub', 'err', args.meta.id$, err.message, args, err.stack)
            }
          })
        }
      }

      // TODO: other cases

      // Subs are triggered via events
      self.on('act-in', annotate('in$', private$.handle_sub))
      self.on('act-out', annotate('out$', private$.handle_sub))
    }

    function annotate (prop, handle_sub) {
      return function (args, result) {
        args = _.clone(args)
        result = _.clone(result)
        args[prop] = true
        handle_sub(args, result)
      }
    }

    var subs = private$.subrouter.find(pattern)
    if (!subs) {
      private$.subrouter.add(pattern, subs = [])
      subs.pattern = Common.argpattern(pattern)
    }
    subs.push(subargs.action)

    return self
  }

  // ### seneca.add
  // Add an message pattern and action function.
  //
  // `seneca.add(pattern, action)`
  //    * _pattern_ `o|s` &rarr; pattern definition
  //    * _action_ `f` &rarr; pattern action function
  //
  // `seneca.add(pattern_string, pattern_object, action)`
  //    * _pattern_string_ `s` &rarr; pattern definition as jsonic string
  //    * _pattern_object_ `o` &rarr; pattern definition as object
  //    * _action_ `f` &rarr; pattern action function
  //
  // The pattern is defined by the top level properties of the
  // _pattern_ parameter.  In the case where the pattern is a string,
  // it is first parsed by
  // [jsonic](https://github.com/rjrodger/jsonic)
  //
  // If the value of a pattern property is a sub-object, this is
  // interpreted as a
  // [parambulator](https://github.com/rjrodger/parambulator)
  // validation check. In this case, the property is not considered
  // part of the pattern, but rather an argument to validate when
  // _seneca.act_ is called.
  function api_add () {
    var self = this
    var args = Common.parsePattern(self, arguments, 'action:f? actmeta:o?')

    var pattern = args.pattern
    var action = args.action
    var actmeta = args.actmeta || {}

    action = action || function (msg, done) {
      done.call(this, null, msg.default$ || null)
    }

    actmeta.plugin_name = actmeta.plugin_name || 'root$'
    actmeta.plugin_fullname = actmeta.plugin_fullname ||
      actmeta.plugin_name + (actmeta.plugin_tag ? '/' + actmeta.plugin_tag : '')

    var add_callpoint = callpoint()
    if (add_callpoint) {
      actmeta.callpoint = add_callpoint
    }

    actmeta.sub = !!pattern.sub$

    // Deprecate a pattern by providing a string message using deprecate$ key.
    actmeta.deprecate = pattern.deprecate$

    var strict_add = (pattern.strict$ && pattern.strict$.add !== null)
      ? !!pattern.strict$.add : !!so.strict.add

    pattern = self.util.clean(args.pattern)

    if (0 === _.keys(pattern)) {
      throw internals.error('add_empty_pattern', {args: Common.clean(args)})
    }

    var pattern_rules = _.clone(action.validate || {})
    _.each(pattern, function (v, k) {
      if (_.isObject(v)) {
        pattern_rules[k] = v
        delete pattern[k]
      }
    })

    if (0 < _.keys(pattern_rules).length) {
      actmeta.parambulator = Parambulator(pattern_rules, pm_custom_args)
    }

    var addroute = true

    actmeta.args = _.clone(pattern)
    actmeta.pattern = Common.argpattern(pattern)

    // deprecated
    actmeta.argpattern = actmeta.pattern

    // actmeta.id = self.idgen()
    actmeta.id = refnid()

    actmeta.func = action

    var priormeta = self.find(pattern)

    // only exact action patterns are overridden
    // use .wrap for pin-based patterns
    if (strict_add && priormeta && priormeta.pattern !== actmeta.pattern) {
      priormeta = null
    }

    if (priormeta) {
      if (_.isFunction(priormeta.handle)) {
        priormeta.handle(action)
        addroute = false
      }
      else {
        actmeta.priormeta = priormeta
      }
      actmeta.priorpath = priormeta.id + ';' + priormeta.priorpath
    }
    else {
      actmeta.priorpath = ''
    }

    // FIX: need a much better way to support layered actions
    // this ".handle" hack is just to make seneca.close work
    if (action && actmeta && _.isFunction(action.handle)) {
      actmeta.handle = action.handle
    }

    var stats = {
      id: actmeta.id,
      plugin: {
        full: actmeta.plugin_fullname,
        name: actmeta.plugin_name,
        tag: actmeta.plugin_tag
      },
      prior: actmeta.priorpath,
      calls: 0,
      done: 0,
      fails: 0,
      time: {}
    }

    private$.stats.actmap[actmeta.argpattern] =
      private$.stats.actmap[actmeta.argpattern] || stats

    if (addroute) {
      var addlog = [ actmeta.sub ? 'SUB' : 'ADD',
        actmeta.id, Common.argpattern(pattern), action.name,
        callpoint() ]
      var isplugin = self.context.isplugin
      var logger = self.log.log || self.log

      if (!isplugin) {
        // addlog.unshift('-')
        // addlog.unshift('-')
        // addlog.unshift('-')
        addlog.unshift(actmeta.plugin_tag)
        addlog.unshift(actmeta.plugin_name)
        addlog.unshift('plugin')
      }

      logger.debug.apply(self, addlog)
      private$.actrouter.add(pattern, actmeta)
    }

    return self
  }

  function api_find (args) {
    if (_.isString(args)) {
      args = Jsonic(args)
    }

    var actmeta = private$.actrouter.find(args)

    // if we have no destination, we look for
    // a catch-all pattern and assign this, if
    // it exists.
    if (!actmeta) {
      actmeta = private$.actrouter.find({})
    }

    return actmeta
  }

  function api_has (args) {
    return !!private$.actrouter.find(args)
  }

  // TODO: deprecate
  root.findpins = root.pinact = function () {
    var pins = []
    var patterns = _.flatten(arrayify(arguments))

    _.each(patterns, function (pattern) {
      pattern = _.isString(pattern) ? Jsonic(pattern) : pattern
      pins = pins.concat(_.map(private$.actrouter.list(pattern),
        function (desc) {
          return desc.match
        }
      ))
    })

    return pins
  }

  function api_actroutes () {
    return private$.actrouter.toString(function (d) {
      var s = 'F='

      if (d.plugin_fullname) {
        s += d.plugin_fullname + '/'
      }

      s += d.id

      while (d.priormeta) {
        d = d.priormeta
        s += ';'

        if (d.plugin_fullname) {
          s += d.plugin_fullname + '/'
        }

        s += d.id
      }
      return s
    })
  }

  function api_list (args) {
    args = _.isString(args) ? Jsonic(args) : args

    var found = private$.actrouter.list(args)

    found = _.map(found, function (entry) {
      return entry.match
    })

    return found
  }

  function api_act_if () {
    var self = this
    var args = Norma('{execute:b actargs:.*}', arguments)

    if (args.execute) {
      return self.act.apply(self, args.actargs)
    }
    else return self
  }

  // Perform an action. The properties of the first argument are matched against
  // known patterns, and the most specific one wins.
  function api_act () {
    var self = this

    var spec = Common.parsePattern(self, arrayify(arguments), 'done:f?')
    var args = spec.pattern
    var actdone = spec.done

    args = _.extend(args, self.fixedargs)
    var actmeta = self.find(args)

    if (so.debug.act_caller) {
      args.caller$ = '\n    Action call arguments and location: ' +
        (new Error(Util.inspect(args).replace(/\n/g, '')).stack)
          .replace(/.*\/seneca\.js:.*\n/g, '')
          .replace(/.*\/seneca\/lib\/.*\.js:.*\n/g, '')
    }

    // action pattern found
    if (actmeta) {
      do_act(self, actmeta, false, args, actdone)
      return self
    }

    // action pattern not found

    if (_.isPlainObject(args.default$) || _.isArray(args.default$)) {
      self.log.debug('act', '-', '-', 'DEFAULT', self.util.clean(args), callpoint())
      if (actdone) actdone.call(self, null, _.clone(args.default$))
      return self
    }

    var errcode = 'act_not_found'
    var errinfo = { args: Util.inspect(Common.clean(args)).replace(/\n/g, '') }

    if (!_.isUndefined(args.default$)) {
      errcode = 'act_default_bad'
      errinfo.xdefault = Util.inspect(args.default$)
    }

    var err = internals.error(errcode, errinfo)

    if (args.fatal$) {
      self.die(err)
      return self
    }

    Logging.log_act_bad(root, err, so.trace.unknown)

    if (so.debug.fragile) {
      throw err
    }

    if (actdone) {
      actdone.call(self, err)
    }
    return self
  }


  function api_wrap (pin, meta, wrapper) {
    var pinthis = this

    wrapper = _.isFunction(meta) ? meta : wrapper
    meta = _.isFunction(meta) ? {} : meta

    pin = _.isArray(pin) ? pin : [pin]
    _.each(pin, function (p) {
      _.each( pinthis.findpins(p), function (actpattern) {
        pinthis.add(actpattern, meta, function (args, done) {
          wrapper.call(this, args, done)
        })
      })
    })
  }

  // close seneca instance
  // sets public seneca.closed property
  function api_close (done) {
    var self = this

    self.closed = true

    // cleanup process event listeners
    _.each(so.internal.close_signals, function (active, signal) {
      if (active) {
        process.removeListener(signal, handleClose)
      }
    })

    self.log.debug('close', 'start', callpoint())
    self.act('role:seneca,cmd:close,closing$:true', function (err) {
      self.log.debug('close', 'end', err)
      if (_.isFunction(done)) {
        return done.call(self, err)
      }
    })
  }

  // useful when defining services!
  // note: has EventEmitter.once semantics
  // if using .on('ready',fn) it will be be called for each ready event
  function api_ready (ready) {
    var self = this

    if (so.debug.callpoint) {
      self.log.debug('ready', 'register', callpoint())
    }

    if (_.isFunction(ready)) {
      self.once('ready', function () {
        try {
          ready.call(self)
        }
        catch (ex) {
          var re = ex

          if (!re.seneca) {
            re = internals.error(re, 'ready_failed', { message: ex.message, ready: ready })
          }

          self.die(re)
        }
      })

      if (!private$.wait_for_ready) {
        private$.wait_for_ready = true
        self.act('role:seneca,ready:true,gate$:true')
      }
    }

    return self
  }

  // use('pluginname') - built-in, or provide calling code 'require' as seneca opt
  // use(require('pluginname')) - plugin object, init will be called
  // if first arg has property senecaplugin
  function api_use (arg0, arg1, arg2) {
    var self = this
    var plugindesc

    // Allow chaining with seneca.use('options', {...})
    // see https://github.com/rjrodger/seneca/issues/80
    if (arg0 === 'options') {
      self.options(arg1)
      return self
    }

    try {
      plugindesc = private$.use(arg0, arg1, arg2)
    }
    catch (e) {
      self.die(internals.error(e, 'plugin_' + e.code))
      return self
    }

    self.register(plugindesc)

    return self
  }

  // TODO: move repl functionality to seneca-repl

  root.inrepl = function () {
    var self = this

    self.on('act-out', function () {
      Logging.handlers.print.apply(null, arrayify(arguments))
    })

    self.on('error', function () {
      var args = arrayify(arguments).slice()
      args.unshift('ERROR: ')
      Logging.handlers.print.apply(null, arrayify(args))
    })
  }

  // Return self. Mostly useful as a check that this is a Seneca instance.
  function api_seneca () {
    return this
  }

  // Describe this instance using the form: Seneca/VERSION/ID
  function api_toString () {
    return this.name
  }

  function do_act (instance, actmeta, prior_ctxt, origargs, cb) {
    var args = _.clone(origargs)
    prior_ctxt = prior_ctxt || { chain: [], entry: true, depth: 1 }

    var act_callpoint = callpoint()

    var id_tx = (args.id$ || args.actid$ || instance.idgen()).split('/')

    var tx =
    id_tx[1] ||
      origargs.tx$ ||
      instance.fixedargs.tx$ ||
      instance.idgen()

    var actid = (id_tx[0] || instance.idgen()) + '/' + tx

    var actstart = Date.now()

    cb = cb || _.noop

    if (act_cache_check(instance, args, prior_ctxt, cb, act_callpoint)) return

    var actstats = act_stats_call(actmeta.pattern)

    // build callargs
    var callargs = args

    // remove actid so that user manipulation of args for subsequent use does
    // not cause inadvertent hit on existing action
    delete callargs.id$
    delete callargs.actid$ // legacy alias

    callargs.meta$ = {
      id: actid,
      tx: tx,
      start: actstart,
      pattern: actmeta.pattern,
      action: actmeta.id,
      entry: prior_ctxt.entry,
      chain: prior_ctxt.chain
    }

    if (actmeta.deprecate) {
      instance.log.warn('DEPRECATED', actmeta.pattern, actmeta.deprecate,
        act_callpoint)
    }

    Logging.log_act_in(root, { actid: actid, info: origargs.transport$ },
      actmeta, callargs, prior_ctxt, act_callpoint)

    instance.emit('act-in', callargs)

    var delegate = act_make_delegate(instance, tx, callargs, actmeta, prior_ctxt)

    callargs = _.extend({}, callargs, delegate.fixedargs, {tx$: tx})

    var listen_origin = origargs.transport$ && origargs.transport$.origin

    var act_done = function (err) {
      try {
        var actend = Date.now()

        prior_ctxt.depth--
        prior_ctxt.entry = prior_ctxt.depth <= 0

        if (prior_ctxt.entry === true) {
          private$.timestats.point(actend - actstart, actmeta.argpattern)
        }

        var result = arrayify(arguments)
        var call_cb = true

        var resdata = result[1]
        var info = result[2]

        if (null == err &&
          null != resdata &&
          !(_.isPlainObject(resdata) ||
          _.isArray(resdata) ||
          !!resdata.entity$ ||
          !!resdata.force$
         ) &&
          so.strict.result) {
          // allow legacy patterns
          if (!('generate_id' === callargs.cmd ||
            true === callargs.note ||
            'native' === callargs.cmd ||
            'quickcode' === callargs.cmd
           )) {
            err = internals.error(
              'result_not_objarr', {
                pattern: actmeta.pattern,
                args: Util.inspect(Common.clean(callargs)).replace(/\n/g, ''),
                result: resdata
              })
          }
        }

        private$.actcache.set(actid, {
          result: result,
          actmeta: actmeta,
          when: Date.now()
        })

        if (err) {
          private$.stats.act.fails++
          actstats.fails++

          var out = act_error(instance, err, actmeta, result, cb,
            actend - actstart, callargs, prior_ctxt, act_callpoint)

          call_cb = out.call_cb
          result[0] = out.err

          if (_.isFunction(delegate.on_act_err)) {
            delegate.on_act_err(actmeta, result[0])
          }

          if (args.fatal$) {
            return instance.die(out.err)
          }
        }
        else {
          instance.emit('act-out', callargs, result[1])
          result[0] = null

          Logging.log_act_out(
            root, {
              actid: actid,
              duration: actend - actstart,
              info: info,
              listen: listen_origin
            },
            actmeta, callargs, result, prior_ctxt, act_callpoint)

          if (_.isFunction(delegate.on_act_out)) {
            delegate.on_act_out(actmeta, result[1])
          }

          private$.stats.act.done++
          actstats.done++
        }

        try {
          if (call_cb) {
            cb.apply(delegate, result.slice(0, 2)) // note: err == result[0]
          }
        }

        // for exceptions thrown inside the callback
        catch (ex) {
          var formattedErr = ex
          // handle throws of non-Error values
          if (!Util.isError(ex)) {
            formattedErr = _.isObject(ex)
              ? new Error(Jsonic.stringify(ex))
              : new Error('' + ex)
          }

          callback_error(instance, formattedErr, actmeta, result, cb,
            actend - actstart, callargs, prior_ctxt, act_callpoint)
        }
      }
      catch (ex) {
        instance.emit('error', ex)
      }
    }

    act_param_check(origargs, actmeta, function (err) {
      if (err) return act_done(err)

      var execspec = {
        id: actid,
        gate: prior_ctxt.entry && !!callargs.gate$,
        ungate: !!callargs.ungate$,
        desc: actmeta.argpattern,
        cb: act_done,

        plugin: {
          name: actmeta.plugin_name,
          tag: actmeta.plugin_tag
        },

        fn: function (cb) {
          if (root.closed && !callargs.closing$) {
            return cb(internals.error('instance-closed', {args: Common.clean(callargs)}))
          }

          delegate.good = function (out) {
            cb(null, out)
          }

          delegate.bad = function (err) {
            cb(err)
          }

          if (_.isFunction(delegate.on_act_in)) {
            delegate.on_act_in(actmeta, callargs)
          }
          actmeta.func.call(delegate, callargs, cb)
        }
      }

      private$.executor.execute(execspec)
    })
  }

  function act_error (instance, err, actmeta, result, cb,
    duration, callargs, prior_ctxt, act_callpoint) {
    var call_cb = true

    if (!err.seneca) {
      err = internals.error(err, 'act_execute', _.extend(
        {},
        err.details,
        {
          message: (err.eraro && err.orig) ? err.orig.message : err.message,
          pattern: actmeta.pattern,
          fn: actmeta.func,
          cb: cb,
          instance: instance.toString()
        }))

      result[0] = err
    }

    // Special legacy case for seneca-perm
    else if (err.orig &&
      _.isString(err.orig.code) &&
      0 === err.orig.code.indexOf('perm/')) {
      err = err.orig
      result[0] = err
    }

    err.details = err.details || {}
    err.details.plugin = err.details.plugin || {}

    Logging.log_act_err(root, {
      actid: callargs.id$ || callargs.actid$,
      duration: duration
    }, actmeta, callargs, prior_ctxt, err, act_callpoint)

    instance.emit('act-err', callargs, err)

    if (so.errhandler) {
      call_cb = !so.errhandler.call(instance, err)
    }

    return {
      call_cb: call_cb,
      err: err
    }
  }

  function callback_error (instance, err, actmeta, result, cb,
    duration, callargs, prior_ctxt, act_callpoint) {
    if (!err.seneca) {
      err = internals.error(err, 'act_callback', _.extend(
        {},
        err.details,
        {
          message: err.message,
          pattern: actmeta.pattern,
          fn: actmeta.func,
          cb: cb,
          instance: instance.toString()
        }))

      result[0] = err
    }

    err.details = err.details || {}
    err.details.plugin = err.details.plugin || {}

    Logging.log_act_err(root, {
      actid: callargs.id$ || callargs.actid$,
      duration: duration
    }, actmeta, callargs, prior_ctxt, err, act_callpoint)

    instance.emit('act-err', callargs, err, result[1])

    if (so.errhandler) {
      so.errhandler.call(instance, err)
    }
  }

  // Check if actid has already been seen, and if action cache is active,
  // then provide cached result, if any. Return true in this case.
  //
  //    * _instance_      (object)    &rarr;  seneca instance
  //    * _args_          (object)    &rarr;  action arguments
  //    * _prior_ctxt_    (object?)   &rarr;  prior action context, if any
  //    * _actcb_         (function)  &rarr;  action callback
  //    * _act_callpoint_ (function)  &rarr;  action call point
  function act_cache_check (instance, args, prior_ctxt, actcb, act_callpoint) {
    Assert.ok(_.isObject(instance), 'act_cache_check; instance; isObject')
    Assert.ok(_.isObject(args), 'act_cache_check; args; isObject')
    Assert.ok(!prior_ctxt || _.isObject(prior_ctxt),
      'act_cache_check; prior_ctxt; isObject')
    Assert.ok(!actcb || _.isFunction(actcb),
      'act_cache_check; actcb; isFunction')

    var actid = args.id$ || args.actid$

    if (null != actid && so.actcache.active) {
      var actdetails = private$.actcache.get(actid)

      if (actdetails) {
        var actmeta = actdetails.actmeta || {}
        private$.stats.act.cache++

        Logging.log_act_cache(root, {actid: actid}, actmeta,
          args, prior_ctxt, act_callpoint)

        if (actcb) actcb.apply(instance, actdetails.result)
        return true
      }
    }

    return false
  }

  // Resolve action stats object, creating if ncessary, and count a call.
  //
  //    * _pattern_     (string)    &rarr;  action pattern
  function act_stats_call (pattern) {
    var actstats = (private$.stats.actmap[pattern] =
      private$.stats.actmap[pattern] || {})

    private$.stats.act.calls++
    actstats.calls++

    return actstats
  }

  function act_make_delegate (instance, tx, callargs, actmeta, prior_ctxt) {
    var delegate_args = {}
    if (null != callargs.gate$) {
      delegate_args.ungate$ = !!callargs.gate$
    }

    var delegate = instance.delegate(delegate_args)

    // special overrides
    if (tx) { delegate.fixedargs.tx$ = tx }

    // automate actid log insertion
    delegate.log = Logging.make_delegate_log(callargs.meta$.id, actmeta, instance)
    Logging.makelogfuncs(delegate)

    if (actmeta.priormeta) {
      delegate.prior = function (prior_args, prior_cb) {
        prior_args = _.clone(prior_args)

        var sub_prior_ctxt = _.clone(prior_ctxt)
        sub_prior_ctxt.chain = _.clone(prior_ctxt.chain)
        sub_prior_ctxt.chain.push(actmeta.id)
        sub_prior_ctxt.entry = false
        sub_prior_ctxt.depth++

        ;delete prior_args.id$
        delete prior_args.actid$
        delete prior_args.meta$
        delete prior_args.transport$

        if (callargs.default$) {
          prior_args.default$ = callargs.default$
        }

        prior_args.tx$ = tx

        do_act(delegate, actmeta.priormeta, sub_prior_ctxt, prior_args, prior_cb)
      }

      delegate.parent = function (prior_args, prior_cb) {
        delegate.log.warn('The method name seneca.parent is deprecated.' +
          ' Please use seneca.prior instead.')
        delegate.prior(prior_args, prior_cb)
      }
    }
    else {
      delegate.prior = function (msg, done) {
        var out = callargs.default$ ? callargs.default$ : null
        return done.call(delegate, null, out)
      }
    }

    return delegate
  }

  // Check if action parameters pass parambulator spec, if any.
  //
  //    * _args_     (object)    &rarr;  action arguments
  //    * _actmeta_  (object)    &rarr;  action meta data
  //    * _done_     (function)  &rarr;  callback function
  function act_param_check (args, actmeta, done) {
    Assert.ok(_.isObject(args), 'act_param_check; args; isObject')
    Assert.ok(_.isObject(actmeta), 'act_param_check; actmeta; isObject')
    Assert.ok(_.isFunction(done), 'act_param_check; done; isFunction')

    if (actmeta.parambulator) {
      actmeta.parambulator.validate(args, function (err) {
        if (err) {
          return done(
            internals.error('act_invalid_args', {
              pattern: actmeta.pattern,
              message: err.message,
              args: Common.clean(args)
            })
          )
        }
        return done()
      })
    }
    else return done()
  }

  function api_fix () {
    var self = this

    var defargs = Common.parsePattern(self, arguments)

    var fix = self.delegate(defargs.pattern)

    fix.add = function () {
      var args = Common.parsePattern(fix, arguments, 'rest:.*', defargs.pattern)
      var addargs = [args.pattern].concat(args.rest)
      return self.add.apply(fix, addargs)
    }

    return fix
  }

  function api_delegate (fixedargs) {
    var self = this

    var delegate = Object.create(self)

    delegate.did = refnid()

    var strdesc
    delegate.toString = function () {
      if (strdesc) return strdesc
      var vfa = {}
      _.each(fixedargs, function (v, k) {
        if (~k.indexOf('$')) return
        vfa[k] = v
      })

      strdesc = self.toString() +
        (_.keys(vfa).length ? '/' + Jsonic.stringify(vfa) : '')

      return strdesc
    }

    delegate.fixedargs = (so.strict.fixedargs
      ? _.extend({}, fixedargs, self.fixedargs)
      : _.extend({}, self.fixedargs, fixedargs))

    delegate.delegate = function (further_fixedargs) {
      var args = _.extend({}, delegate.fixedargs, further_fixedargs || {})
      return self.delegate.call(this, args)
    }

    // Somewhere to put contextual data for this delegate.
    // For example, data for individual web requests.
    delegate.context = {}

    delegate.client = function () {
      return self.client.apply(this, arguments)
    }

    delegate.listen = function () {
      return self.listen.apply(this, arguments)
    }

    return delegate
  }

  function api_options (options) {
    var self = this

    if (null != options) {
      self.log.debug('options', 'set', options, callpoint())
    }

    so = private$.exports.options = ((null == options)
      ? private$.optioner.get()
      : private$.optioner.set(options))

    if (options && options.log) {
      self.log = Logging.makelog(so.log, self.id, self.start_time)
    }

    return so
  }

  function api_start (errhandler) {
    var sd = this.delegate()
    var options = sd.options()
    options.zig = options.zig || {}

    function make_fn (self, origargs) {
      var args = Common.parsePattern(self, origargs, 'fn:f?')

      var actargs = _.extend(
        {},
        args.moreobjargs ? args.moreobjargs : {},
        args.objargs ? args.objargs : {},
        args.strargs ? Jsonic(args.strargs) : {}
     )

      var fn
      if (args.fn) {
        fn = function (data, done) {
          return args.fn.call(self, data, done)
        }
      }
      else {
        fn = function (data, done) {
          if (args.strargs) {
            /*eslint-disable */
            var $ = data
            /*eslint-enable */
            _.each(actargs, function (v, k) {
              if (_.isString(v) && v.indexOf('$.') === 0) {
                /*eslint-disable */
                actargs[k] = eval(v)
                /*eslint-enable */
              }
            })
          }

          self.act(actargs, done)
          return true
        }
        fn.nm = args.strargs
      }

      return fn
    }

    var dzig = Zig({
      timeout: options.zig.timeout || options.timeout,
      trace: options.zig.trace
    })

    dzig.start(function () {
      var self = this
      dzig.end(function () {
        if (errhandler) errhandler.apply(self, arguments)
      })
    })

    sd.end = function (cb) {
      var self = this
      dzig.end(function () {
        if (cb) return cb.apply(self, arguments)
        if (errhandler) return errhandler.apply(self, arguments)
      })
      return self
    }

    sd.wait = function () {
      dzig.wait(make_fn(this, arguments))
      return this
    }

    sd.step = function () {
      dzig.step(make_fn(this, arguments))
      return this
    }

    sd.run = function () {
      dzig.run(make_fn(this, arguments))
      return this
    }

    sd.if = function (cond) {
      dzig.if(cond)
      return this
    }

    sd.endif = function () {
      dzig.endif()
      return this
    }

    sd.fire = function () {
      dzig.step(make_fn(this, arguments))
      return this
    }

    return sd
  }

  function api_error (errhandler) {
    this.options({errhandler: errhandler})
    return this
  }

  // Inspired by https://github.com/hapijs/hapi/blob/master/lib/plugin.js decorate
  function api_decorate (property, method) {
    Assert(property, 'property must be specified')
    Assert(typeof property === 'string', 'property must be a string')
    Assert(property[0] !== '_', 'property cannot start with _')
    Assert(this._decorations[property] === undefined, 'seneca is already decorated with the property')
    Assert(this[property] === undefined, 'cannot override a core seneca property: ' + property)

    this._decorations[property] = method
    this[property] = method
  }

  // Create entity delegate.
  var sd = root.delegate()
  sd.log = function () {
    var args = ['entity']
    root.log.apply(this, args.concat(arrayify(arguments)))
  }
  Logging.makelogfuncs(sd)

  // Template entity that makes all others.
  private$.entity = MakeEntity({}, sd)

  private$.exports.Entity = MakeEntity.Entity

  // DEPRECATED
  // for use with async
  root.next_act = function () {
    var si = this || root
    var args = arrayify(arguments)

    return function (next) {
      args.push(next)
      si.act.apply(si, args)
    }
  }

  root.gate = function () {
    var gated = this.delegate({gate$: true})
    return gated
  }

  root.ungate = function () {
    var ungated = this.delegate({gate$: false})
    return ungated
  }

  // Add builtin actions.
  root.add({role: 'seneca', cmd: 'stats'}, action_seneca_stats)
  root.add({role: 'seneca', cmd: 'close'}, action_seneca_close)
  root.add({role: 'seneca', info: 'ready'}, action_seneca_ready)
  root.add({role: 'seneca', info: 'fatal'}, action_seneca_fatal)
  root.add({role: 'seneca', get: 'options'}, action_options_get)

  // Legacy builtin actions.
  root.add({role: 'seneca', stats: true}, action_seneca_stats)
  root.add({role: 'seneca', ready: true}, action_seneca_ready)
  root.add({role: 'options', cmd: 'get'}, action_options_get)

  Print(root)

  // Define builtin actions.

  function action_seneca_fatal (args, done) {
    done()
  }

  function action_seneca_close (args, done) {
    this.emit('close')
    done()
  }

  function action_seneca_ready (args, done) {
    private$.wait_for_ready = false
    this.emit('ready')
    done()
  }

  function action_seneca_stats (args, done) {
    args = args || {}
    var stats

    if (args.pattern && private$.stats.actmap[args.pattern]) {
      stats = private$.stats.actmap[args.pattern]
      stats.time = private$.timestats.calculate(args.pattern)
    }
    else {
      stats = _.clone(private$.stats)
      stats.now = new Date()
      stats.uptime = stats.now - stats.start

      stats.now = new Date(stats.now).toISOString()
      stats.start = new Date(stats.start).toISOString()

      var summary =
      (null == args.summary && false) ||
        (/^false$/i.exec(args.summary) ? false : !!(args.summary))

      if (summary) {
        stats.actmap = void 0
      }
      else {
        _.each(private$.stats.actmap, function (a, p) {
          private$.stats.actmap[p].time = private$.timestats.calculate(p)
        })
      }
    }

    if (done) {
      done(null, stats)
    }
    return stats
  }

  root.stats = action_seneca_stats

  function action_options_get (args, done) {
    var options = private$.optioner.get()

    var base = args.base || null
    var root = base ? (options[base] || {}) : options
    var val = args.key ? root[args.key] : root

    done(null, Common.copydata(val))
  }

  var handleClose = function () {
    root.close(function (err) {
      if (err) {
        console.error(err)
      }

      process.exit(err ? (err.exit === null ? 1 : err.exit) : 0)
    })
  }

  _.each(so.internal.close_signals, function (active, signal) {
    if (active) {
      process.once(signal, handleClose)
    }
  })

  // Expose the Entity object so third-parties can do interesting things with it
  private$.exports.Entity = MakeEntity.Entity

  return root
}

// Utilities

function makedie (instance, ctxt) {
  ctxt = _.extend(ctxt, instance.die ? instance.die.context : {})

  var die = function (err) {
    var die_trace = '\n' + (new Error('die trace').stack)
        .match(/^.*?\n.*\n(.*)/)[1]

    try {
      if (!err) {
        err = new Error('unknown')
      }
      else if (!Util.isError(err)) {
        err = new Error(_.isString(err) ? err : Util.inspect(err))
      }

      err.fatal$ = true

      var so = instance.options()

      // undead is only for testing, do not use in production
      var undead = so.debug.undead || (err && err.undead)

      var logargs = [ctxt.type, ctxt.plugin, ctxt.tag, ctxt.id,
        err.code, err.message, err.details,
        instance.fixedargs.fatal$ ? 'all-errors-fatal' : '-',
        ctxt.callpoint()]

      instance.log.fatal.apply(instance, logargs)

      var stack = err.stack || ''
      stack = stack.replace(/^.*?\n/, '\n')

      var procdesc = '\n  pid=' + process.pid +
        ', arch=' + process.arch +
        ', platform=' + process.platform +
        ',\n  path=' + process.execPath +
        ',\n  argv=' + Util.inspect(process.argv).replace(/\n/g, '') +
        ',\n  env=' + Util.inspect(process.env).replace(/\n/g, '')

      var fatalmodemsg = instance.fixedargs.fatal$
        ? '\n  ALL ERRORS FATAL: action called with argument fatal$:true ' +
        '(probably a plugin init error, or using a plugin seneca instance' +
        ', see senecajs.org/fatal.html)' : ''

      var stderrmsg =
      '\n\n' +
        'Seneca Fatal Error\n' +
        '==================\n\n' +
        'Message: ' + err.message + '\n\n' +
        'Code: ' + err.code + '\n\n' +
        'Details: ' + Util.inspect(err.details, {depth: null}) + '\n\n' +
        'Stack: ' + stack + '\n\n' +
        'Instance: ' + instance.toString() + fatalmodemsg + die_trace + '\n\n' +
        'When: ' + new Date().toISOString() + '\n\n' +
        'Log: ' + Jsonic.stringify(logargs) + '\n\n' +
        'Node:\n  ' + Util.inspect(process.versions).replace(/\s+/g, ' ') +
        ',\n  ' + Util.inspect(process.features).replace(/\s+/g, ' ') +
        ',\n  ' + Util.inspect(process.moduleLoadList).replace(/\s+/g, ' ') + '\n\n' +
        'Process: ' + procdesc + '\n\n'

      if (so.errhandler) {
        so.errhandler.call(instance, err)
      }

      if (instance.closed) return

      if (!undead) {
        instance.act('role:seneca,info:fatal,closing$:true', {err: err})

        instance.close(
          // terminate process, err (if defined) is from seneca.close
          function (err) {
            if (!undead) {
              process.nextTick(function () {
                if (err) console_error(err)
                console_error(stderrmsg)
                console_error('\n\nSENECA TERMINATED at ' + (new Date().toISOString()) +
                  '. See above for error report.\n\n')
                process.exit(1)
              })
            }
          }
       )
      }

      // make sure we close down within options.deathdelay seconds
      if (!undead) {
        var killtimer = setTimeout(function () {
          console_error(stderrmsg)
          console_error('\n\nSENECA TERMINATED (on timeout) at ' +
            (new Date().toISOString()) + '.\n\n')
          process.exit(2)
        }, so.deathdelay)
        killtimer.unref()
      }
    }
    catch (panic) {
      var msg =
      '\n\n' +
        'Seneca Panic\n' +
        '============\n\n' +
        panic.stack +
        '\n\nOriginal Error:\n' +
        (arguments[0] && arguments[0].stack ? arguments[0].stack : arguments[0])
      console_error(msg)
    }
  }

  die.context = ctxt

  return die
}

function make_trace_act (opts) {
  return function () {
    var args = Array.prototype.slice.call(arguments, 0)
    args.unshift(new Date().toISOString())

    if (opts.stack) {
      args.push(new Error('trace...').stack)
    }

    console_log(args.join('\t'))
  }
}

function pin_patrun_customizer (pat, data) {
  var pi = this

  var gexers = {}
  _.each(pat, function (v, k) {
    if (_.isString(v) && ~v.indexOf('*')) {
      delete pat[k]
      gexers[k] = Gex(v)
    }
  })

  // handle previous patterns that match this pattern
  var prev = pi.list(pat)
  var prevfind = prev[0] && prev[0].find
  var prevdata = prev[0] && pi.findexact(prev[0].match)

  return function (args, data) {
    var pi = this
    var out = data
    _.each(gexers, function (g, k) {
      var v = args[k]
      if (null == g.on(v)) { out = null }
    })

    if (prevfind && null == out) {
      out = prevfind.call(pi, args, prevdata)
    }

    return out
  }
}

// ### Declarations

// Private member variables of Seneca object.
function make_private () {
  return {
    stats: {
      start: Date.now(),
      act: {
        calls: 0,
        done: 0,
        fails: 0,
        cache: 0
      },
      actmap: {}
    }
  }
}

// Make parambulators.
function make_paramcheck () {
  var paramcheck = {}

  paramcheck.options = Parambulator({
    tag: { string$: true },
    idlen: { integer$: true },
    timeout: { integer$: true },
    errhandler: { function$: true }
  }, {
    topname: 'options',
    msgprefix: 'seneca({...}): '
  })

  paramcheck.register = Parambulator({
    type$: 'object',
    required$: ['name', 'init'],
    string$: ['name'],
    function$: ['init', 'service'],
    object$: ['options']
  }, {
    topname: 'plugin',
    msgprefix: 'register(plugin): '
  })

  return paramcheck
}

// Minor utils
function thrower (err) {
  if (err) throw err
}

// Callpoint resolver. Indicates location in calling code.
function make_callpoint (active) {
  if (active) {
    return function () {
      return internals.error.callpoint(
        new Error(),
        ['/seneca/seneca.js', '/seneca/lib/', '/lodash.js'])
    }
  }

  return _.noop
}

// Intentional console output uses this function. Helps to find spurious debugging.
function console_log () {
  console.log.apply(null, arguments)
}

// Intentional console errors use this function. Helps to find spurious debugging.
function console_error () {
  console.error.apply(null, arguments)
}
