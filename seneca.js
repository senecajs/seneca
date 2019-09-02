/* Copyright © 2010-2019 Richard Rodger and other contributors, MIT License. */
'use strict'

// Node API modules.
const Events = require('events')
const Util = require('util')

// External modules.
const GateExecutor = require('gate-executor')
const Jsonic = require('jsonic')
const UsePlugin = require('use-plugin')
const Nid = require('nid')
const Patrun = require('patrun')
const Stats = require('rolling-stats')
const Ordu = require('ordu')
const Eraro = require('eraro')
const Optioner = require('optioner')
const Joi = require('@hapi/joi')

// Internal modules.
const Common = require('./lib/common')
const Logging = require('./lib/logging')
const API = require('./lib/api')
const Ready = require('./lib/ready')
const Add = require('./lib/add')
const Act = require('./lib/act')
const Inward = require('./lib/inward')
const Outward = require('./lib/outward')
const Legacy = require('./lib/legacy')
const Options = require('./lib/options')
const Package = require('./package.json')
const Plugins = require('./lib/plugins')
const Print = require('./lib/print')
const Actions = require('./lib/actions')
const Transport = require('./lib/transport')

// Shortcuts.
//const errlog = Common.make_standard_err_log_entry
//const actlog = Common.make_standard_act_log_entry

// Internal data and utilities.
const error = Common.error

const option_defaults = {
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

  // Quiet mode. Moves log level to warn. Use for unit testing.
  quiet: false,

  // Default logging specification - see lib/logging.js
  log: Logging().default_logspec,

  // Custom logger function, optional - see lib/logging.js
  logger: null,

  // Wait time for plugins to close gracefully.
  death_delay: 11111,

  // Wait time for actions to complete before shutdown.
  close_delay: 22222,

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
      fatal: 'summary',

      // Include environment when printing full crash report.
      // Default: false for security.
      env: false
    },

    // Trace action caller and place in args.caller$.
    act_caller: false,

    // Shorten all identifiers to 2 characters.
    short_logs: false,

    // Record and log callpoints (calling code locations).
    callpoint: false,

    // Log deprecation warnings
    deprecation: true,

    // Set to array to force artificial argv and ignore process.argv
    argv: null,

    // Set to object to force artificial env and ignore process.env
    env: null,

    // Length of data description in logs
    datalen: 111
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

  // Plugins to load (will be passed to .use)
  plugins: [],

  // System wide functionality.
  system: {
    exit: process.exit,

    // Close instance on these signals, if true.
    close_signals: {
      SIGHUP: false,
      SIGTERM: false,
      SIGINT: false,
      SIGBREAK: false
    },

    plugin: {
      load_once: false
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

  // Setup event listeners before starting
  events: {},

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
    actdef: false,

    // Use old fail method
    fail: false,

    // Insert "[TIMEOUT]" into timeout error message
    timeout_string: true
  }
}

// Utility functions exposed by Seneca via `seneca.util`.
const seneca_util = {
  Eraro: Eraro,
  Jsonic: Jsonic,
  Nid: Nid,
  Patrun: Patrun,
  Joi: Joi,
  Optioner: Optioner,

  clean: Common.clean,
  pattern: Common.pattern,
  print: Common.print,
  error: error,
  deep: Common.deepextend,

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
  resolve_option: Common.resolve_option,
  flatten: Common.flatten,
  argprops: Legacy.argprops
}

// Internal implementations.
const intern = {
  util: seneca_util
}

// Seneca is an EventEmitter.
function Seneca() {
  Events.EventEmitter.call(this)
  this.setMaxListeners(0)
}
Util.inherits(Seneca, Events.EventEmitter)

// Mark the Seneca object
Seneca.prototype.isSeneca = true

// Provide useful description when convered to JSON.
// Cannot be instantiated from JSON.
Seneca.prototype.toJSON = function toJSON() {
  return {
    isSeneca: true,
    id: this.id,
    did: this.did,
    fixedargs: this.fixedargs,
    fixedmeta: this.fixedmeta,
    start_time: this.start_time,
    version: this.version
  }
}

Seneca.prototype[Util.inspect.custom] = Seneca.prototype.toJSON

// Create a Seneca instance.
module.exports = function init(seneca_options, more_options) {
  var initial_options =
    'string' === typeof seneca_options
      ? Common.deepextend({}, { from: seneca_options }, more_options)
      : Common.deepextend({}, seneca_options, more_options)

  // Legacy options, remove in 4.x
  initial_options.deathdelay = initial_options.death_delay

  var seneca = make_seneca(initial_options)
  var options = seneca.options()

  // The 'internal' key of options is reserved for objects and functions
  // that provide functionality, and are thus not really printable
  seneca.log.debug({ kind: 'notice', options: { ...options, internal: null } })

  Print.print_options(seneca, options)

  // Register default plugins, unless turned off by options.
  if (options.legacy.transport && options.default_plugins.transport) {
    seneca.use(require('seneca-transport'))
  }

  // Register plugins specified in options.
  options.plugins = null == options.plugins ? {} : options.plugins
  var pluginkeys = Object.keys(options.plugins)
  for (var pkI = 0; pkI < pluginkeys.length; pkI++) {
    var pluginkey = pluginkeys[pkI]
    var plugindesc = options.plugins[pluginkey]

    if (false === plugindesc) {
      seneca.private$.ignore_plugins[pluginkey] = true
    } else {
      seneca.use(plugindesc)
    }
  }

  seneca.ready(function() {
    this.log.info({ kind: 'notice', data: 'hello ' + this.id })
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
  return module.exports().test(...arguments)
}

// Makes require('seneca').quiet() work.
module.exports.quiet = function top_quiet() {
  return module.exports().quiet(...arguments)
}

module.exports.util = seneca_util
module.exports.test$ = { intern: intern }

// Create a new Seneca instance.
// * _initial_options_ `o` &rarr; instance options
function make_seneca(initial_options) {
  // Create a private context.
  var private$ = make_private()
  private$.error = error

  // Create a new root Seneca instance.
  var root$ = new Seneca()

  // Expose private data to plugins.
  root$.private$ = private$

  // Resolve initial options.
  private$.optioner = Options(module, option_defaults, initial_options)
  var start_opts = private$.optioner.get()

  // Setup event handlers, if defined
  var event_names = ['log', 'act_in', 'act_out', 'act_err', 'ready', 'close']
  event_names.forEach(function(event_name) {
    if ('function' === typeof start_opts.events[event_name]) {
      root$.on(event_name, start_opts.events[event_name])
    }
  })

  // Create internal tools.
  private$.actnid = Nid({ length: start_opts.idlen })
  private$.didnid = Nid({ length: start_opts.didlen })

  // Instance specific incrementing counters to create unique function names
  private$.next_action_id = Common.autoincr()

  // These need to come from options as required during construction.
  start_opts.internal.actrouter =
    start_opts.internal.actrouter || Patrun({ gex: true })
  start_opts.internal.subrouter =
    start_opts.internal.subrouter || Patrun({ gex: true })

  var callpoint = (private$.callpoint = make_callpoint(
    start_opts.debug.callpoint
  ))

  // Define public member variables.
  root$.start_time = Date.now()
  root$.context = {}
  root$.version = Package.version

  // TODO: rename in 4.x as "args" terminology is legacy
  root$.fixedargs = {}

  root$.flags = {
    closed: false
  }

  Object.defineProperty(root$, 'root', { value: root$ })

  private$.history = Common.history(start_opts.history)

  const ready = Ready(root$)

  // Seneca methods. Official API.
  root$.toString = API.toString
  root$.has = API.has // True if the given pattern has an action.
  root$.find = API.find // Find the action definition for a pattern.
  root$.list = API.list // List the patterns added to this instance.
  root$.status = API.status // Get the status if this instance.
  root$.reply = API.reply // Reply to a submitted message.
  root$.sub = API.sub // Subscribe to messages.
  root$.list_plugins = API.list_plugins // List the registered plugins.
  root$.find_plugin = API.find_plugin // Find the plugin definition.
  root$.has_plugin = API.has_plugin // True if the plugin is registered.
  root$.ignore_plugin = API.ignore_plugin // Ignore plugin and don't register it.
  root$.listen = API.listen(callpoint) // Listen for inbound messages.
  root$.client = API.client(callpoint) // Send outbound messages.
  root$.gate = API.gate // Create a delegate that executes actions in sequence.
  root$.ungate = API.ungate // Execute actions in parallel.
  root$.translate = API.translate // Translate message to new pattern.
  root$.ping = API.ping // Generate ping response.
  root$.use = API.use // Define and load a plugin.
  root$.test = API.test // Set test mode.
  root$.quiet = API.quiet // Convenience method to set logging level to `warn+`.
  root$.export = API.export // Export plain objects from a plugin.
  root$.depends = API.depends // Check for plugin dependencies.
  root$.delegate = API.delegate // Create an action-specific Seneca instance.
  root$.prior = API.prior // Call the previous action definition for message pattern.
  root$.inward = API.inward // Add a modifier function for messages inward
  root$.outward = API.outward // Add a modifier function for responses outward
  root$.error = API.error // Set global error handler, or generate Seneca Error
  root$.fail = start_opts.legacy.fail
    ? Legacy.make_legacy_fail(start_opts)
    : API.fail // Throw a Seneca error
  root$.explain = API.explain // Toggle top level explain capture
  root$.decorate = API.decorate // Decorate seneca object with functions
  root$.seneca = API.seneca
  root$.close = API.close(callpoint) // Close and shutdown plugins.
  root$.options = API.options // Get and set options.
  root$.fix = API.fix // fix pattern arguments, message arguments, and custom meta
  root$.wrap = API.wrap // wrap each found pattern with a new action
  root$.add = Add.api_add // Add a pattern an associated action.
  root$.act = Act.api_act // Submit a message and trigger the associated action.
  root$.ready = ready.api_ready // Callback when plugins initialized.

  // Non-API methods.
  root$.register = Plugins.register(callpoint)

  // DEPRECATE IN 4.x
  root$.findact = root$.find
  root$.plugins = API.list_plugins
  root$.findplugin = API.find_plugin
  root$.hasplugin = API.has_plugin
  root$.hasact = Legacy.hasact
  root$.act_if = Legacy.act_if
  root$.findpins = Legacy.findpins
  root$.pinact = Legacy.findpins
  root$.next_act = Legacy.next_act

  // Identifier generator.
  root$.idgen = Nid({ length: start_opts.idlen })
  start_opts.tag = start_opts.tag || option_defaults.tag
  start_opts.tag =
    start_opts.tag === 'undefined' ? option_defaults.tag : start_opts.tag

  // Create a unique identifer for this instance.
  root$.id =
    start_opts.id$ ||
    root$.idgen() +
      '/' +
      root$.start_time +
      '/' +
      process.pid +
      '/' +
      root$.version +
      '/' +
      start_opts.tag

  // The instance tag, useful for grouping instances.
  root$.tag = start_opts.tag

  if (start_opts.debug.short_logs || start_opts.log.short) {
    start_opts.idlen = 2
    root$.idgen = Nid({ length: start_opts.idlen })
    root$.id = root$.idgen() + '/' + start_opts.tag
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

  private$.exports = { options: start_opts }
  private$.decorations = {}

  //root$.make_log = make_log
  //root$.log = make_log(root$)//, make_default_log_modifier(root$))

  // Error events are fatal, unless you're undead.  These are not the
  // same as action errors, these are unexpected internal issues.
  root$.on('error', root$.die)

  private$.ge = GateExecutor({
    timeout: start_opts.timeout
  })
    //.clear(action_queue_clear)
    .clear(ready.clear_ready)
    .start()

  // TODO: this should be a plugin
  // setup status log
  if (start_opts.status.interval > 0 && start_opts.status.running) {
    private$.stats = private$.stats || {}
    private$.status_interval = setInterval(function status() {
      root$.log.info({
        kind: 'status',
        alive: Date.now() - private$.stats.start,
        act: private$.stats.act
      })
    }, start_opts.status.interval)
  }

  if (start_opts.stats) {
    private$.timestats = new Stats.NamedStats(
      start_opts.stats.size,
      start_opts.stats.interval
    )

    if (start_opts.stats.running) {
      setInterval(function stats() {
        private$.timestats.calculate()
      }, start_opts.stats.interval)
    }
  }

  // private$.plugins = {}
  private$.plugin_order = { byname: [], byref: [] }
  private$.use = UsePlugin({
    prefix: ['seneca-', '@seneca/'],
    module: start_opts.internal.module || module,
    msgprefix: false,
    builtin: '',
    merge_defaults: false
  })

  private$.actrouter = start_opts.internal.actrouter
  private$.subrouter = start_opts.internal.subrouter

  // TODO: provide an api to add these
  private$.action_modifiers = [
    function add_rules_from_validate_annotation(actdef) {
      actdef.rules = Object.assign(
        actdef.rules,
        Common.deepextend({}, actdef.func.validate || {})
      )
    }
  ]

  private$.sub = { handler: null, tracers: [] }

  private$.inward = Ordu({ name: 'inward' })
    .add(Inward.msg_modify)
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

  // Configure logging

  // Mark logger as being externally defined from options
  if (start_opts.logger && 'object' === typeof start_opts.logger) {
    start_opts.logger.from_options$ = true
  }

  // Load logger and update log options
  var logspec = private$.logging.build_log(root$)
  start_opts = private$.exports.options = private$.optioner.set({
    log: logspec
  })

  if (start_opts.test) {
    root$.test('string' === typeof start_opts.test ? start_opts.test : null)
  }

  if (start_opts.quiet) {
    root$.quiet()
  }

  private$.handle_close = function() {
    root$.close(function(err) {
      if (err) {
        Print.err(err)
      }

      start_opts.system.exit(err ? (err.exit === null ? 1 : err.exit) : 0)
    })
  }

  Actions(root$)

  if (!start_opts.legacy.transport) {
    start_opts.legacy.error = false

    // TODO: move to static options in Seneca 4.x
    start_opts.transport = root$.util.deepextend(
      {
        port: 62345,
        host: '127.0.0.1',
        path: '/act',
        protocol: 'http'
      },
      start_opts.transport
    )

    Transport(root$)
  }

  Print(root$, start_opts.debug.argv || process.argv)

  Common.each(start_opts.system.close_signals, function(active, signal) {
    if (active) {
      process.once(signal, private$.handle_close)
    }
  })

  return root$
}

// Private member variables of Seneca object.
function make_private() {
  return {
    logging: Logging(),
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
    },
    plugins: {},
    ignore_plugins: {}
  }
}

// Callpoint resolver. Indicates location in calling code.
function make_callpoint(active) {
  return function callpoint(override) {
    if (active || override) {
      return error.callpoint(new Error(), [
        '/seneca/seneca.js',
        '/seneca/lib/',
        '/lodash.js'
      ])
    } else {
      return void 0
    }
  }
}
