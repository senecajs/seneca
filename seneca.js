/* Copyright © 2010-2018 Richard Rodger and other contributors, MIT License. */
'use strict'

// Node API modules.
var Assert = require('assert')
var Events = require('events')
var Util = require('util')

// External modules.
var _ = require('lodash')
var GateExecutor = require('gate-executor')
var Jsonic = require('jsonic')
var Makeuse = require('use-plugin')
var Nid = require('nid')
var Norma = require('norma')
var Patrun = require('patrun')
var Stats = require('rolling-stats')
var Ordu = require('ordu')
var Eraro = require('eraro')

// Internal modules.
var API = require('./lib/api')
var Inward = require('./lib/inward')
var Outward = require('./lib/outward')
var Common = require('./lib/common')
var Legacy = require('./lib/legacy')
var Optioner = require('./lib/optioner')
var Package = require('./package.json')
var Plugins = require('./lib/plugins')
var Print = require('./lib/print')
var Actions = require('./lib/actions')
var Transport = require('./lib/transport')

// Shortcuts.
var errlog = Common.make_standard_err_log_entry
var actlog = Common.make_standard_act_log_entry

// Internal data and utilities.
var error = Common.error

var option_defaults = {
  // Tag this Seneca instance, will be appended to instance identifier.
  tag: '-',

  // Standard timeout for actions.
  timeout: 22222,

  // Standard length of identifiers for actions.
  idlen: 12,
  didlen: 4,

  // Register (true) default plugins. Set false to not register when
  // using custom versions.
  default_plugins: {
    transport: true
  },

  // Test mode. Use for unit testing.
  test: false,

  // Wait time for plugins to close gracefully.
  deathdelay: 11111,

  // Debug settings.
  debug: {
    // Throw (some) errors from seneca.act.
    fragile: false,

    // Fatal errors ... aren't fatal. Not for production!
    undead: false,

    // Print debug info to console
    print: {
      // Print options. Best used via --seneca.print.options.
      options: false,

      // Amount of information to print on fatal error: 'summary', 'full'
      fatal: 'summary'
    },

    // Trace action caller and place in args.caller$.
    act_caller: false,

    // Shorten all identifiers to 2 characters.
    short_logs: false,

    // Record and log callpoints (calling code locations).
    callpoint: false,

    // Log deprecation warnings
    deprecation: true
  },

  // Enforce strict behaviours. Relax when backwards compatibility needed.
  strict: {
    // Action result must be a plain object.
    result: true,

    // Delegate fixedargs override action args.
    fixedargs: true,

    // Adding a pattern overrides existing pattern only if matches exactly.
    add: false,

    // If no action is found and find is false,
    // then no error returned along with empty object
    find: true,

    // Maximum number of times an action can call itself
    maxloop: 11,

    // Exports must exist
    exports: false
  },

  // Keep a transient time-ordered history of actions submitted
  history: {
    // History log is active.
    active: true,

    // Prune the history. Disable only for debugging.
    prune: true,

    // Prune the history only periodically.
    interval: 100
  },

  // Action executor tracing. See gate-executor module.
  trace: {
    act: false,
    stack: false,

    // Messages that do not match a known pattern
    unknown: true,

    // Messages that have invalid content
    invalid: false
  },

  // Action statistics settings. See rolling-stats module.
  stats: {
    size: 1024,
    interval: 60000,
    running: false
  },

  // Plugin settings
  plugin: {},

  // System wide functionality.
  system: {
    exit: process.exit,

    // Close instance on these signals, if true.
    close_signals: {
      SIGHUP: false,
      SIGTERM: false,
      SIGINT: false,
      SIGBREAK: false
    }
  },

  // Internal functionality. Reserved for objects and functions only.
  internal: {},

  // Log status at periodic intervals.
  status: {
    interval: 60000,

    // By default, does not run.
    running: false
  },

  // Shared default transport configuration
  transport: {
    // Standard port for messages.
    port: 10101
  },

  limits: {
    maxparents: 33
  },

  // Backwards compatibility settings.
  legacy: {
    // Action callback must always have signature callback(error, result).
    action_signature: false,

    // Logger can be changed by options method.
    logging: false,

    // Use old error codes. REMOVE in Seneca 4.x
    error_codes: false,

    // Use old error handling.
    error: true,

    // Use seneca-transport plugin.
    transport: true,

    // Add meta$ property to messages.
    meta: false,

    // Add legacy properties
    actdef: false
  }
}

// Utility functions exposed by Seneca via `seneca.util`.
var seneca_util = {
  Eraro: Eraro,
  Jsonic: Jsonic,
  Nid: Nid,
  Patrun: Patrun,
  Joi: Makeuse.Joi,

  clean: Common.clean,
  pattern: Common.pattern,
  print: Common.print,
  error: error,

  // Legacy
  deepextend: Common.deepextend,
  recurse: Common.recurse,
  copydata: Common.copydata,
  nil: Common.nil,
  parsepattern: Common.parsePattern,
  pincanon: Common.pincanon,
  router: function router() {
    return Patrun()
  },
  argprops: Common.argprops,
  resolve_option: Common.resolve_option,
  flatten: Common.flatten
}

// Internal implementations.
var intern = {
  util: seneca_util
}

// Seneca is an EventEmitter.
function Seneca() {
  Events.EventEmitter.call(this)
  this.setMaxListeners(0)
}
Util.inherits(Seneca, Events.EventEmitter)

// Create a Seneca instance.
module.exports = function init(seneca_options, more_options) {
  var initial_options = _.isString(seneca_options)
    ? _.extend({}, { from: seneca_options }, more_options)
    : _.extend({}, seneca_options, more_options)

  var seneca = make_seneca(initial_options)
  var options = seneca.options()

  // The 'internal' key of options is reserved for objects and functions
  // that provide functionality, and are thus not really printable
  seneca.log.debug({ kind: 'notice', options: _.omit(options, ['internal']) })

  Print.print_options(seneca, options)

  // Register default plugins, unless turned off by options.
  if (options.legacy.transport && options.default_plugins.transport) {
    seneca.use(require('seneca-transport'))
  }

  // Register plugins specified in options.
  _.each(options.plugins, function(plugindesc) {
    seneca.use(plugindesc)
  })

  seneca.ready(function() {
    this.log.info({ kind: 'notice', notice: 'hello seneca ' + seneca.id })
  })

  return seneca
}

// Expose Seneca prototype for easier monkey-patching
module.exports.Seneca = Seneca

// To reference builtin loggers when defining logging options.
module.exports.loghandler = Legacy.loghandler

// Makes require('seneca').use(...) work by creating an on-the-fly instance.
module.exports.use = function top_use() {
  var argsarr = new Array(arguments.length)
  for (var l = 0; l < argsarr.length; ++l) {
    argsarr[l] = arguments[l]
  }

  var instance = module.exports()

  return instance.use.apply(instance, argsarr)
}

// Makes require('seneca').test() work.
module.exports.test = function top_test() {
  return module.exports().test(arguments[0], arguments[1])
}

module.exports.util = seneca_util
module.exports.test$ = { intern: intern }

// Create a new Seneca instance.
// * _initial_options_ `o` &rarr; instance options
function make_seneca(initial_options) {
  initial_options = initial_options || {}

  // Create a private context.
  var private$ = make_private()
  private$.error = error

  // Create a new root Seneca instance.
  var root$ = new Seneca()
  root$.make_log = make_log

  // Expose private data to plugins.
  root$.private$ = private$

  // Resolve initial options.
  private$.optioner = Optioner(module, option_defaults, initial_options)
  var opts = { $: private$.optioner.get() }

  // Create internal tools.
  private$.actnid = Nid({ length: opts.$.idlen })
  private$.didnid = Nid({ length: opts.$.didlen })

  var next_action_id = Common.autoincr()

  // These need to come from options as required during construction.
  opts.$.internal.actrouter = opts.$.internal.actrouter || Patrun({ gex: true })
  opts.$.internal.subrouter = opts.$.internal.subrouter || Patrun({ gex: true })

  var callpoint = make_callpoint(opts.$.debug.callpoint)

  // Define public member variables.
  root$.start_time = Date.now()
  root$.fixedargs = {}
  root$.context = {}
  root$.version = Package.version

  Object.defineProperty(root$, 'root', { value: root$ })

  private$.history = Common.history(opts.$.history)

  // Seneca methods. Official API.
  root$.has = API.has // True if the given pattern has an action.
  root$.find = API.find // Find the action definition for a pattern.
  root$.list = API.list // List the patterns added to this instance.
  root$.status = API.status // Get the status if this instance.
  root$.reply = API.reply // Reply to a submitted message.
  root$.sub = API.sub // Subscribe to messages.
  root$.list_plugins = API.list_plugins // List the registered plugins.
  root$.find_plugin = API.find_plugin // Find the plugin definition.
  root$.has_plugin = API.has_plugin // True if the plugin is registered.
  root$.listen = API.listen(callpoint) // Listen for inbound messages.
  root$.client = API.client(callpoint) // Send outbound messages.
  root$.gate = API.gate // Create a delegate that executes actions in sequence.
  root$.ungate = API.ungate // Execute actions in parallel.
  root$.test = API.test // Set test mode.
  root$.translate = API.translate // Translate message to new pattern.
  root$.ping = API.ping // Generate ping response.
  root$.use = API.use // Define and load a plugin.

  root$.add = api_add // Add a pattern an associated action.
  root$.act = api_act // Submit a message and trigger the associated action.
  root$.export = api_export // Export plain objects from a plugin.
  root$.ready = api_ready // Callback when plugins initialized.
  root$.close = api_close // Close and shutdown plugins.
  root$.options = api_options // Get and set options.
  root$.error = api_error // Set global error handler.
  root$.decorate = api_decorate // Decorate seneca object with functions
  root$.inward = api_inward // Add a modifier function for messages inward
  root$.outward = api_outward // Add a modifier function for responses outward

  // Non-API methods.
  root$.register = Plugins.register(opts, callpoint)
  root$.depends = api_depends
  // root$.act_if = api_act_if
  root$.wrap = api_wrap
  root$.seneca = api_seneca
  root$.fix = api_fix
  root$.delegate = api_delegate

  // DEPRECATE IN 4.x
  root$.findact = root$.find
  root$.fail = Legacy.fail(opts.$)
  root$.plugins = API.list_plugins
  root$.findplugin = API.find_plugin
  root$.hasplugin = API.has_plugin
  root$.hasact = Legacy.hasact
  root$.act_if = Legacy.act_if
  root$.findpins = Legacy.findpins
  root$.pinact = Legacy.findpins
  root$.next_act = Legacy.next_act

  // Identifier generator.
  root$.idgen = Nid({ length: opts.$.idlen })
  opts.$.tag = opts.$.tag || option_defaults.tag
  opts.$.tag = opts.$.tag === 'undefined' ? option_defaults.tag : opts.$.tag

  // Create a unique identifer for this instance.
  root$.id =
    opts.$.id$ ||
    root$.idgen() +
      '/' +
      root$.start_time +
      '/' +
      process.pid +
      '/' +
      root$.version +
      '/' +
      opts.$.tag

  // The instance tag, useful for grouping instances.
  root$.tag = opts.$.tag

  if (opts.$.debug.short_logs || opts.$.log.short) {
    opts.$.idlen = 2
    root$.idgen = Nid({ length: opts.$.idlen })
    root$.id = root$.idgen() + '/' + opts.$.tag
  }

  root$.fullname = 'Seneca/' + root$.id

  root$.die = Common.makedie(root$, {
    type: 'sys',
    plugin: 'seneca',
    tag: root$.version,
    id: root$.id,
    callpoint: callpoint
  })

  root$.util = seneca_util

  // Configure logging
  private$.exports = { options: opts.$ }
  private$.decorations = {}

  private$.logger = load_logger(root$, opts.$.internal.logger)
  root$.log = make_log(root$, make_default_log_modifier(root$))

  // Error events are fatal, unless you're undead.  These are not the
  // same as action errors, these are unexpected internal issues.
  root$.on('error', root$.die)

  private$.ge = GateExecutor({
    timeout: opts.$.timeout
  })
    .clear(action_queue_clear)
    .start()

  // TODO: this should be a plugin
  // setup status log
  if (opts.$.status.interval > 0 && opts.$.status.running) {
    private$.stats = private$.stats || {}
    private$.status_interval = setInterval(function status() {
      root$.log.info({
        kind: 'status',
        alive: Date.now() - private$.stats.start,
        act: private$.stats.act
      })
    }, opts.$.status.interval)
  }

  if (opts.$.stats) {
    private$.timestats = new Stats.NamedStats(
      opts.$.stats.size,
      opts.$.stats.interval
    )

    if (opts.$.stats.running) {
      setInterval(function stats() {
        private$.timestats.calculate()
      }, opts.$.stats.interval)
    }
  }

  private$.plugins = {}
  private$.plugin_order = { byname: [], byref: [] }
  private$.use = Makeuse({
    prefix: 'seneca-',
    module: module,
    msgprefix: false,
    builtin: ''
  })

  private$.actrouter = opts.$.internal.actrouter
  private$.subrouter = opts.$.internal.subrouter

  root$.toString = api_toString

  // TODO: provide an api to add these
  private$.action_modifiers = []
  private$.sub = { handler: null, tracers: [] }

  private$.ready_list = []

  private$.inward = Ordu({ name: 'inward' })
    .add(Inward.closed)
    .add(Inward.act_cache)
    .add(Inward.act_default)
    .add(Inward.act_not_found)
    .add(Inward.act_stats)
    .add(Inward.validate_msg)
    .add(Inward.warnings)
    .add(Inward.msg_meta)
    .add(Inward.limit_msg)
    .add(Inward.prepare_delegate)
    .add(Inward.msg_modify)
    .add(Inward.announce)

  private$.outward = Ordu({ name: 'outward' })
    .add(Outward.make_error)
    .add(Outward.act_stats)
    .add(Outward.act_cache)
    .add(Outward.res_object)
    .add(Outward.res_entity)
    .add(Outward.msg_meta)
    .add(Outward.trace)
    .add(Outward.announce)
    .add(Outward.act_error)

  if (opts.$.test) {
    root$.test('string' === typeof opts.$.test ? opts.$.test : 'print')
  }

  function api_depends() {
    var self = this

    var args = Norma('{pluginname:s deps:a? moredeps:s*}', arguments)

    var deps = args.deps || args.moredeps

    _.every(deps, function(depname) {
      if (
        !_.includes(private$.plugin_order.byname, depname) &&
        !_.includes(private$.plugin_order.byname, 'seneca-' + depname)
      ) {
        self.die(
          error('plugin_required', {
            name: args.pluginname,
            dependency: depname
          })
        )
        return false
      } else return true
    })
  }

  function api_export(key) {
    var self = this

    // Legacy aliases
    if (key === 'util') {
      key = 'basic'
    }

    var exportval = private$.exports[key]

    if (!exportval && opts.$.strict.exports) {
      return self.die(error('export_not_found', { key: key }))
    }

    return exportval
  }

  // See [`seneca.add`](#seneca.add)
  function api_add() {
    var self = this
    var args = Common.parsePattern(self, arguments, 'action:f? actdef:o?')

    var raw_pattern = args.pattern
    var pattern = self.util.clean(raw_pattern)

    var action =
      args.action ||
      function default_action(msg, done, meta) {
        done.call(this, null, meta.dflt || null)
      }

    var actdef = args.actdef || {}

    actdef.raw = _.cloneDeep(raw_pattern)
    actdef.plugin_name = actdef.plugin_name || 'root$'
    actdef.plugin_fullname =
      actdef.plugin_fullname ||
      actdef.plugin_name +
        ((actdef.plugin_tag === '-'
        ? void 0
        : actdef.plugin_tag)
          ? '/' + actdef.plugin_tag
          : '')

    actdef.plugin = {
      name: actdef.plugin_name,
      tag: actdef.plugin_tag,
      fullname: actdef.plugin_fullname
    }

    var add_callpoint = callpoint()
    if (add_callpoint) {
      actdef.callpoint = add_callpoint
    }

    actdef.sub = !!raw_pattern.sub$
    actdef.client = !!raw_pattern.client$

    // Deprecate a pattern by providing a string message using deprecate$ key.
    actdef.deprecate = raw_pattern.deprecate$

    var strict_add =
      raw_pattern.strict$ && raw_pattern.strict$.add !== null
        ? !!raw_pattern.strict$.add
        : !!opts.$.strict.add

    var pattern_rules = _.clone(action.validate || {})
    _.each(pattern, function(v, k) {
      if (_.isObject(v)) {
        pattern_rules[k] = _.clone(v)
        delete pattern[k]
      }
    })

    var addroute = true

    if (opts.$.legacy.actdef) {
      actdef.args = _.clone(pattern)
    }

    actdef.rules = pattern_rules

    actdef.id = action.name + '_' + next_action_id()
    actdef.name = action.name
    actdef.func = action

    // Canonical string form of the action pattern.
    actdef.pattern = Common.pattern(pattern)

    // Canonical object form of the action pattern.
    actdef.msgcanon = Jsonic(actdef.pattern)

    var priordef = self.find(pattern)

    if (priordef && strict_add && priordef.pattern !== actdef.pattern) {
      // only exact action patterns are overridden
      // use .wrap for pin-based patterns
      priordef = null
    }

    if (priordef) {
      // Clients needs special handling so that the catchall
      // pattern does not submit all patterns into the handle
      if (
        _.isFunction(priordef.handle) &&
        ((priordef.client && actdef.client) ||
          (!priordef.client && !actdef.client))
      ) {
        priordef.handle(args.pattern, action)
        addroute = false
      } else {
        actdef.priordef = priordef
      }
      actdef.priorpath = priordef.id + ';' + priordef.priorpath
    } else {
      actdef.priorpath = ''
    }

    if (action && actdef && _.isFunction(action.handle)) {
      actdef.handle = action.handle
    }

    private$.stats.actmap[actdef.pattern] =
      private$.stats.actmap[actdef.pattern] || make_action_stats(actdef)

    actdef = modify_action(self, actdef)

    if (addroute) {
      self.log.debug({
        kind: 'add',
        case: actdef.sub ? 'SUB' : 'ADD',
        id: actdef.id,
        pattern: actdef.pattern,
        name: action.name,
        callpoint: callpoint
      })

      private$.actrouter.add(pattern, actdef)
    }

    private$.actdef[actdef.id] = actdef

    return self
  }

  function make_action_stats(actdef) {
    return {
      id: actdef.id,
      plugin: {
        full: actdef.plugin_fullname,
        name: actdef.plugin_name,
        tag: actdef.plugin_tag
      },
      prior: actdef.priorpath,
      calls: 0,
      done: 0,
      fails: 0,
      time: {}
    }
  }

  function modify_action(seneca, actdef) {
    _.each(private$.action_modifiers, function(actmod) {
      actdef = actmod.call(seneca, actdef) || actdef
    })

    return actdef
  }

  // Perform an action. The properties of the first argument are matched against
  // known patterns, and the most specific one wins.
  function api_act() {
    var argsarr = new Array(arguments.length)
    for (var l = 0; l < argsarr.length; ++l) {
      argsarr[l] = arguments[l]
    }

    var self = this
    var spec = Common.build_message(self, argsarr, 'reply:f?', self.fixedargs)
    var msg = spec.msg
    var reply = spec.reply

    if (opts.$.debug.act_caller || opts.$.test) {
      msg.caller$ =
        '\n    Action call arguments and location: ' +
        (new Error(Util.inspect(msg).replace(/\n/g, '')).stack + '\n')
          .replace(/Error: /, '')
          .replace(/.*\/gate-executor\.js:.*\n/g, '')
          .replace(/.*\/seneca\.js:.*\n/g, '')
          .replace(/.*\/seneca\/lib\/.*\.js:.*\n/g, '')
    }

    do_act(self, msg, reply)
    return self
  }

  function api_wrap(pin, meta, wrapper) {
    var pinthis = this

    wrapper = _.isFunction(meta) ? meta : wrapper
    meta = _.isFunction(meta) ? {} : meta

    pin = _.isArray(pin) ? pin : [pin]
    _.each(pin, function(p) {
      _.each(pinthis.list(p), function(actpattern) {
        pinthis.add(actpattern, meta, wrapper)
      })
    })

    return this
  }

  private$.handle_close = function() {
    root$.close(function(err) {
      if (err) {
        Print.err(err)
      }

      opts.$.system.exit(err ? (err.exit === null ? 1 : err.exit) : 0)
    })
  }

  // close seneca instance
  // sets public seneca.closed property
  function api_close(done) {
    var seneca = this
    seneca.ready(do_close)

    function do_close() {
      seneca.closed = true

      // cleanup process event listeners
      _.each(opts.$.system.close_signals, function(active, signal) {
        if (active) {
          process.removeListener(signal, private$.handle_close)
        }
      })

      seneca.log.debug({
        kind: 'close',
        notice: 'start',
        callpoint: callpoint()
      })

      seneca.act('role:seneca,cmd:close,closing$:true', function(err) {
        seneca.log.debug(errlog(err, { kind: 'close', notice: 'end' }))

        seneca.removeAllListeners('act-in')
        seneca.removeAllListeners('act-out')
        seneca.removeAllListeners('act-err')
        seneca.removeAllListeners('pin')
        seneca.removeAllListeners('after-pin')
        seneca.removeAllListeners('ready')

        seneca.private$.history.close()

        if (seneca.private$.status_interval) {
          clearInterval(seneca.private$.status_interval)
        }

        if (_.isFunction(done)) {
          return done.call(seneca, err)
        }
      })
    }

    return seneca
  }

  // useful when defining services!
  // note: has EventEmitter.once semantics
  // if using .on('ready',fn) it will be be called for each ready event
  function api_ready(ready) {
    var self = this

    setImmediate(function register_ready() {
      if (root$.private$.ge.isclear()) {
        execute_ready(ready.bind(self))
      } else {
        root$.private$.ready_list.push(ready.bind(self))
      }
    })

    return self
  }

  // Return self. Mostly useful as a check that this is a Seneca instance.
  function api_seneca() {
    return this
  }

  // Describe this instance using the form: Seneca/VERSION/ID
  function api_toString() {
    return this.fullname
  }

  function api_inward(inward) {
    Assert('function' === typeof inward)
    Assert(2 === inward.length)

    private$.inward.add(inward)
    return this
  }

  function api_outward(outward) {
    Assert('function' === typeof outward)
    Assert(2 === outward.length)

    private$.outward.add(outward)
    return this
  }

  function do_act(instance, origmsg, origreply) {
    var timedout = false
    var actmsg = intern.make_actmsg(origmsg)
    var meta = new intern.Meta(instance, opts, origmsg, origreply)

    if (meta.gate) {
      instance = instance.delegate()
      instance.private$.ge = instance.private$.ge.gate()
    }

    var actctxt = {
      seneca: instance,
      origmsg: origmsg,
      reply: origreply || _.noop,
      options: instance.options(),
      callpoint: callpoint()
    }

    var execspec = {
      dn: meta.id,
      fn: function act_fn(done) {
        try {
          intern.execute_action(
            instance,
            opts,
            actctxt,
            actmsg,
            meta,
            function action_reply(err, out, reply_meta) {
              if (!timedout) {
                intern.handle_reply(meta, actctxt, actmsg, err, out, reply_meta)
              }
              done()
            }
          )
        } catch (e) {
          var ex = Util.isError(e) ? e : new Error(Util.inspect(e))
          intern.handle_reply(meta, actctxt, actmsg, ex)
          done()
        }
      },
      ontm: function act_tm() {
        timedout = true
        intern.handle_reply(meta, actctxt, actmsg, new Error('[TIMEOUT]'))
      },
      tm: meta.timeout
    }

    instance.private$.ge.add(execspec)
  }

  function api_fix() {
    var self = this

    var defargs = Common.parsePattern(self, arguments)

    var fix = self.delegate(defargs.pattern)

    fix.add = function fix_add() {
      var args = Common.parsePattern(fix, arguments, 'rest:.*', defargs.pattern)
      var addargs = [args.pattern].concat(args.rest)
      return self.add.apply(fix, addargs)
    }

    return fix
  }

  // TODO: rename fixedargs
  function api_delegate(fixedargs, fixedmeta) {
    var self = this
    fixedargs = fixedargs || {}
    fixedmeta = fixedmeta || {}

    var delegate = Object.create(self)
    delegate.private$ = Object.create(self.private$)

    delegate.did =
      (delegate.did ? delegate.did + '/' : '') + self.private$.didnid()

    var strdesc
    delegate.toString = function toString() {
      if (strdesc) return strdesc
      var vfa = {}
      _.each(fixedargs, function(v, k) {
        if (~k.indexOf('$')) return
        vfa[k] = v
      })

      strdesc =
        self.toString() +
        (_.keys(vfa).length ? '/' + Jsonic.stringify(vfa) : '')

      return strdesc
    }

    delegate.fixedargs = opts.$.strict.fixedargs
      ? _.extend({}, fixedargs, self.fixedargs)
      : _.extend({}, self.fixedargs, fixedargs)

    delegate.fixedmeta = opts.$.strict.fixedmeta
      ? _.extend({}, fixedmeta, self.fixedmeta)
      : _.extend({}, self.fixedmeta, fixedmeta)

    delegate.delegate = function delegate(
      further_fixedargs,
      further_fixedmeta
    ) {
      var args = _.extend({}, delegate.fixedargs, further_fixedargs || {})
      var meta = _.extend({}, delegate.fixedmeta, further_fixedmeta || {})
      return self.delegate.call(this, args, meta)
    }

    // Somewhere to put contextual data for this delegate.
    // For example, data for individual web requests.
    delegate.context = {}

    delegate.client = function client() {
      return self.client.apply(this, arguments)
    }

    delegate.listen = function listen() {
      return self.listen.apply(this, arguments)
    }

    return delegate
  }

  function api_options(options, chain) {
    var self = this

    if (options != null) {
      self.log.debug({
        kind: 'options',
        case: 'SET',
        options: options,
        callpoint: callpoint()
      })
    }

    opts.$ = private$.exports.options =
      options == null ? private$.optioner.get() : private$.optioner.set(options)

    if (opts.$.legacy.logging) {
      if (options && options.log && _.isArray(options.log.map)) {
        for (var i = 0; i < options.log.map.length; ++i) {
          self.logroute(options.log.map[i])
        }
      }
    }

    // Allow chaining with seneca.options({...}, true)
    // see https://github.com/rjrodger/seneca/issues/80
    return chain ? self : opts.$
  }

  function api_error(errhandler) {
    this.options({ errhandler: errhandler })
    return this
  }

  // Inspired by https://github.com/hapijs/hapi/blob/master/lib/plugin.js decorate
  function api_decorate() {
    var args = Norma('property:s value:.', arguments)

    var property = args.property
    Assert(property[0] !== '_', 'property cannot start with _')
    Assert(
      private$.decorations[property] === undefined,
      'seneca is already decorated with the property'
    )
    Assert(
      root$[property] === undefined,
      'cannot override a core seneca property: ' + property
    )

    root$[property] = private$.decorations[property] = args.value
  }

  Actions(root$)

  if (!opts.$.legacy.transport) {
    opts.$.legacy.error = false

    // TODO: move to static options in Seneca 4.x
    opts.$.transport = root$.util.deepextend(
      {
        port: 62345,
        host: '127.0.0.1',
        path: '/act',
        protocol: 'http'
      },
      opts.$.transport
    )

    Transport(root$)
  }

  Print(root$, process.argv)

  _.each(opts.$.system.close_signals, function(active, signal) {
    if (active) {
      process.once(signal, private$.handle_close)
    }
  })

  function load_logger(instance, log_plugin) {
    log_plugin = log_plugin || require('./lib/logging')

    return log_plugin.preload.call(instance).extend.logger
  }

  // NOTE: this could be called from an arbitrary GateExecutor task,
  // if the task queue is emptied.
  function action_queue_clear() {
    root$.emit('ready')
    execute_ready(root$.private$.ready_list.shift())

    if (root$.private$.ge.isclear()) {
      while (0 < root$.private$.ready_list.length) {
        execute_ready(root$.private$.ready_list.shift())
      }
    }
  }

  function execute_ready(ready_func) {
    if (null == ready_func) return

    try {
      ready_func()
    } catch (ready_err) {
      var err = error(ready_err, 'ready_failed', { message: ready_err.message })

      if (opts.$.test) {
        if (opts.$.errhandler) {
          opts.$.errhandler.call(root$, err)
        } else throw err
      } else {
        root$.die(err)
      }
    }
  }

  return root$
}

// Private member variables of Seneca object.
function make_private() {
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
    },
    actdef: {},
    transport: {
      register: []
    }
  }
}

// Callpoint resolver. Indicates location in calling code.
function make_callpoint(active) {
  if (active) {
    return function() {
      return error.callpoint(new Error(), [
        '/seneca/seneca.js',
        '/seneca/lib/',
        '/lodash.js'
      ])
    }
  }

  return _.noop
}

function make_log(instance, modifier) {
  var log =
    instance.log ||
    function log(data) {
      instance.private$.logger(this, data)
    }

  log = prepare_log(instance, make_modified_log(log, modifier))
  make_log_levels(instance, log)

  return log
}

function prepare_log(instance, log) {
  return function prepare_log_data() {
    var argsarr = new Array(arguments.length)
    for (var l = 0; l < argsarr.length; ++l) {
      argsarr[l] = arguments[l]
    }

    var a0 = argsarr[0]
    var data = _.isArray(a0) ? a0 : _.isObject(a0) ? a0 : argsarr
    log.call(instance, data)
  }
}

function make_log_levels(instance, log) {
  function log_level(level) {
    return function(data) {
      data.level = level
    }
  }
  log.debug = prepare_log(instance, make_modified_log(log, log_level('debug')))
  log.info = prepare_log(instance, make_modified_log(log, log_level('info')))
  log.warn = prepare_log(instance, make_modified_log(log, log_level('warn')))
  log.error = prepare_log(instance, make_modified_log(log, log_level('error')))
  log.fatal = prepare_log(instance, make_modified_log(log, log_level('fatal')))
}

function make_modified_log(log, modifier) {
  return function log_modifier(data) {
    modifier(data)
    log.call(this, data)
  }
}

function make_default_log_modifier(instance) {
  return function default_log_modifier(data) {
    data.level = null == data.level ? 'debug' : data.level
    data.seneca = null == data.seneca ? instance.id : data.seneca
    data.when = null == data.when ? Date.now() : data.when
  }
}

intern.make_act_delegate = function(instance, opts, meta, actdef) {
  meta = meta || {}
  actdef = actdef || {}

  var delegate_args = {
    plugin$: {
      name: actdef.plugin_name,
      tag: actdef.plugin_tag
    }
  }

  var delegate = instance.delegate(delegate_args)

  var parent_act = instance.private$.act || meta.parent

  delegate.private$.act = {
    parent: parent_act && parent_act.meta,
    meta: meta,
    def: actdef
  }

  // special overrides
  if (meta.tx) {
    delegate.fixedargs.tx$ = meta.tx
  }

  // automate actid log insertion

  delegate.log = make_log(delegate, function act_delegate_log_modifier(data) {
    data.actid = meta.id

    data.plugin_name = data.plugin_name || actdef.plugin_name
    data.plugin_tag = data.plugin_tag || actdef.plugin_tag
    data.pattern = data.pattern || actdef.pattern
  })

  delegate.prior = function() {
    var argsarr = new Array(arguments.length)
    for (var l = 0; l < argsarr.length; ++l) {
      argsarr[l] = arguments[l]
    }

    var spec = Common.build_message(
      delegate,
      argsarr,
      'reply:f?',
      delegate.fixedargs
    )
    var msg = spec.msg
    var reply = spec.reply

    if (actdef.priordef) {
      msg.prior$ = actdef.priordef.id
      this.act(msg, reply)
    } else {
      var meta = msg.meta$ || {}
      var out = _.clone(msg.default$ || meta.dflt || null)
      return reply.call(delegate, null, out, meta)
    }
  }

  return delegate
}

intern.execute_action = function(
  act_instance,
  opts,
  actctxt,
  msg,
  meta,
  reply
) {
  var private$ = act_instance.private$
  var actdef = meta.prior ? private$.actdef[meta.prior] : act_instance.find(msg)
  var delegate = intern.make_act_delegate(act_instance, opts, meta, actdef)

  actctxt.seneca = delegate
  actctxt.actdef = actdef

  var data = { meta: meta, msg: msg, reply: reply }
  var inward = private$.inward.process(actctxt, data)

  if (
    intern.handle_inward_break(
      inward,
      act_instance,
      data,
      actdef,
      actctxt.origmsg
    )
  ) {
    return
  }

  if (!actdef.sub) {
    delegate.log.debug(
      actlog(actdef, msg, meta, actctxt.origmsg, { kind: 'act', case: 'IN' })
    )
  }

  data.id = data.meta.id
  data.result = []
  data.timelimit = Date.now() + data.meta.timeout

  if (opts.$.history.active) {
    private$.history.add(data)
  }

  if (opts.$.legacy.meta) {
    data.msg.meta$ = meta
  }

  actdef.func.call(delegate, data.msg, data.reply, data.meta)
}

intern.handle_reply = function(meta, actctxt, actmsg, err, out, reply_meta) {
  meta.end = Date.now()

  var delegate = actctxt.seneca
  var reply = actctxt.reply

  var data = {
    meta: meta,
    msg: actmsg,
    res: err || out,
    reply_meta: reply_meta,
    has_callback: true,
    err: err || null,
    out: out || null
  }

  actctxt.duration = meta.end - meta.start
  actctxt.actlog = actlog
  actctxt.errlog = errlog
  actctxt.error = error

  meta.error = data.res instanceof Error

  intern.process_outward(actctxt, data)

  if (data.has_callback) {
    try {
      reply.call(delegate, data.err, data.res, data.meta)
    } catch (thrown_obj) {
      intern.callback_error(delegate, thrown_obj, actctxt, data)
    }
  }
}

intern.handle_inward_break = function(
  inward,
  act_instance,
  data,
  actdef,
  origmsg
) {
  if (!inward) return false

  var msg = data.msg
  var reply = data.reply
  var meta = data.meta

  if ('error' === inward.kind) {
    var err = inward.error || error(inward.code, inward.info)
    meta.error = true

    if (inward.log && inward.log.level) {
      act_instance.log[inward.log.level](
        errlog(
          err,
          errlog(actdef || {}, meta.prior, msg, origmsg, inward.log.data)
        )
      )
    }

    reply.call(act_instance, err)
    return true
  } else if ('result' === inward.kind) {
    if (inward.log && inward.log.level) {
      act_instance.log[inward.log.level](
        actlog(actdef || {}, msg, meta, origmsg, inward.log.data)
      )
    }

    reply.call(act_instance, null, inward.result)
    return true
  }
}

intern.make_actmsg = function(origmsg) {
  var actmsg = Object.assign({}, origmsg)

  if (actmsg.id$) {
    delete actmsg.id$
  }

  if (actmsg.caller$) {
    delete actmsg.caller$
  }

  if (actmsg.meta$) {
    delete actmsg.meta$
  }

  if (actmsg.prior$) {
    delete actmsg.prior$
  }

  if (actmsg.parents$) {
    delete actmsg.parents$
  }

  // backwards compatibility for Seneca 3.x transports
  if (origmsg.transport$) {
    actmsg.transport$ = origmsg.transport$
  }

  return actmsg
}

intern.resolve_msg_id_tx = function(act_instance, origmsg) {
  var id_tx = (origmsg.id$ || origmsg.actid$ || act_instance.idgen()).split('/')

  id_tx[1] =
    id_tx[1] ||
    origmsg.tx$ ||
    act_instance.fixedargs.tx$ ||
    act_instance.idgen()

  id_tx[0] = id_tx[0] || act_instance.idgen()

  return id_tx
}

intern.Meta = function(instance, opts, origmsg, origreply) {
  var id_tx = intern.resolve_msg_id_tx(instance, origmsg)

  var origmeta = origmsg.meta$

  // Only a limited set of meta properties can be fixed
  var fixedmeta = instance.fixedmeta || {}

  this.start = Date.now()
  this.end = null
  this.pattern = null
  this.action = null

  this.mi = id_tx[0]
  this.tx = id_tx[1]
  this.id = id_tx[0] + '/' + id_tx[1]

  this.instance = instance.id
  this.tag = instance.tag
  this.seneca = instance.version
  this.version = '0.1.0'

  this.gate = !!origmsg.gate$ || fixedmeta.gate
  this.fatal = !!origmsg.fatal$ || fixedmeta.fatal
  this.local = !!origmsg.local$ || fixedmeta.local

  this.closing = !!origmsg.closing$ || (origmeta && origmeta.closing)

  this.timeout = Math.max(
    0,
    'number' === typeof origmsg.timeout$ ? origmsg.timeout$ : opts.$.timeout
  )

  this.dflt = origmsg.default$ || (origmeta && origmeta.dflt)

  // NOTE: do not create object here if not provided explicitly.
  // The parent custom object will be used when available during inward processing.
  // This preserves object ref of custom object, as it is shared over calls
  this.custom = origmsg.custom$ || (origmeta && origmeta.custom) || null

  this.plugin = origmsg.plugin$
  this.prior = origmsg.prior$
  this.caller = origmsg.caller$

  this.parents = origmsg.parents$

  this.sync =
    null != origmsg.sync$
      ? !!origmsg.sync$
      : origmeta && null != origmeta.sync
        ? !!origmeta.sync
        : _.isFunction(origreply)

  this.trace = null
  this.sub = null
  this.data = null
  this.err = null
  this.err_trace = null
  this.error = null
  this.empty = null
}

intern.process_outward = function(actctxt, data) {
  var outward = actctxt.seneca.private$.outward.process(actctxt, data)

  if (outward) {
    if ('error' === outward.kind) {
      data.res = outward.error || error(outward.code, outward.info)
      data.meta.error = true
    } else if ('result' === outward.kind) {
      data.res = outward.result
    } else {
      Assert.fail('unknown outward kind: ' + outward.kind)
    }
  }
}

intern.callback_error = function(instance, thrown_obj, ctxt, data) {
  var duration = ctxt.duration
  var act_callpoint = ctxt.callpoint
  var actdef = ctxt.actdef || {}
  var origmsg = ctxt.origmsg
  var reply = ctxt.reply

  var meta = data.meta
  var msg = data.msg

  var err = Util.isError(thrown_obj)
    ? thrown_obj
    : new Error(Util.inspect(thrown_obj))

  var opts = instance.options()

  if (!err.seneca) {
    err = error(
      err,
      'act_callback',
      _.extend({}, err.details, {
        message: err.message,
        pattern: actdef.pattern,
        fn: actdef.func,
        callback: reply,
        instance: instance.toString(),
        callpoint: act_callpoint
      })
    )
  }

  instance.log.error(
    actlog(actdef, msg, meta, origmsg, {
      // kind is act as this log entry relates to an action
      kind: 'act',
      case: 'ERR',
      info: err.message,
      code: err.code,
      err: err,
      duration: duration
    })
  )

  instance.emit('act-err', msg, err, data.res)

  if (opts.errhandler) {
    opts.errhandler.call(instance, err, err.meta$)
  }
}
