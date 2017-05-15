/* Copyright (c) 2010-2017 Richard Rodger and other contributors, MIT License */
'use strict'

// Node API modules.
var Assert = require('assert')
var Events = require('events')
var Util = require('util')

// External modules.
var _ = require('lodash')
var Eraro = require('eraro')
var GateExecutor = require('gate-executor')
var Jsonic = require('jsonic')
var Makeuse = require('use-plugin')
var Nid = require('nid')
var Norma = require('norma')
var Patrun = require('patrun')
var Stats = require('rolling-stats')
var Ordu = require('ordu')

// Internal modules.
var API = require('./lib/api')
var Inward = require('./lib/inward')
var Outward = require('./lib/outward')
var Common = require('./lib/common')
var Errors = require('./lib/errors')
var Legacy = require('./lib/legacy')
var Optioner = require('./lib/optioner')
var Package = require('./package.json')
var Plugins = require('./lib/plugins')
var Print = require('./lib/print')
var Actions = require('./lib/actions')
var Transport = require('./lib/transport')

// Shortcuts
var errlog = Common.make_standard_err_log_entry
var actlog = Common.make_standard_act_log_entry

// Internal data and utilities
var error = Eraro({
  package: 'seneca',
  msgmap: Errors,
  override: true
})

var option_defaults = {
  // Tag this Seneca instance, will be appended to instance identifier.
  tag: '-',

  // Standard timeout for actions.
  timeout: 22222,

  // Standard length of identifiers for actions.
  idlen: 12,

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
      options: false
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

  // Action cache. Makes inbound messages idempotent.
  // TODO: rename to `history`
  actcache: {
    active: false,
    size: 1111
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
    // Close instance on these signals, if true.
    close_signals: {
      SIGHUP: true,
      SIGTERM: true,
      SIGINT: true,
      SIGBREAK: true
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
    // TODO: make static in Seneca 4.x
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
    transport: true
  }
}

// Utility functions exposed by Seneca via `seneca.util`.
var seneca_util = {
  deepextend: Common.deepextend,
  recurse: Common.recurse,
  clean: Common.clean,
  copydata: Common.copydata,
  nil: Common.nil,
  parsepattern: Common.parsePattern,
  pattern: Common.pattern,
  print: Common.print,
  pincanon: Common.pincanon,
  router: function router() {
    return Patrun()
  },
  argprops: Common.argprops,
  resolve_option: Common.resolve_option,
  flatten: Common.flatten
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

  // TODO: these are core API and should not be decorations
  seneca.decorate('hasplugin', Plugins.api_decorations.hasplugin)
  seneca.decorate('findplugin', Plugins.api_decorations.findplugin)
  seneca.decorate('plugins', Plugins.api_decorations.plugins)

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
  var argsarr = new Array(arguments.length)
  for (var l = 0; l < argsarr.length; ++l) {
    argsarr[l] = arguments[l]
  }

  var instance = module.exports({ test: true, log: 'test' })
  instance.test.apply(instance, argsarr)

  return instance
}

module.exports.util = seneca_util

// Mostly for testing.
if (require.main === module) {
  module.exports()
}

// Create a new Seneca instance.
// * _initial_options_ `o` &rarr; instance options
function make_seneca(initial_options) {
  initial_options = initial_options || {}

  // Create a private context.
  var private$ = make_private()

  // Create a new root Seneca instance.
  var root$ = new Seneca()
  root$.make_log = make_log

  // Expose private data to plugins.
  root$.private$ = private$

  // Resolve initial options.
  private$.optioner = Optioner(module, option_defaults, initial_options)
  var opts = { $: private$.optioner.get() }

  // Create internal tools.
  var actnid = Nid({ length: opts.$.idlen })
  var refnid = function refnid(suffix) {
    return '(' + actnid() + (suffix ? '/' + suffix : '') + ')'
  }
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

  Object.defineProperty(root$, 'root', {value: root$})

  private$.history = Common.history(opts.$.actcache.size)

  // Seneca methods. Official API.

  // <a name="seneca.add">**seneca.add**</a>
  //
  // Add a message pattern and action.
  //   * `pattern` <small>_string|object_</small> &rarr;
  //   Pattern definition as
  //   [jsonic](https://github.com/rjrodger/jsonic) string or object.
  //
  //   * `action` <small>_function (optional)_</small> &rarr;
  //   Action function.
  //
  // When a message that matches the pattern is submitted inward using
  // `seneca.act`, the action function is called with parameters:
  //   * `message` <small>_object_</small> &rarr; Message object.
  //   * `reply` <small>_function_</small> &rarr; Callback function.
  //
  // The `reply` callback is used to provide a response to the
  // message.  If the action function is not provided, the pattern
  // will be added with a default action function that does
  // nothing. The `reply` callback has parameters:
  //   * `error` <small>_Error (optional)_</small> &rarr;
  //   Provide this value if you wish to provide an error response to the message.
  //   * `response` <small>_object|array (optional)_</small> &rarr;
  //   Response data to the message.
  //
  // **The action function is not a lambda, and the `=>` function
  // syntax should not be used.** The context `this` of the action
  // function is a reference to the current Seneca instance, tha
  // should always be used for subsequent `seneca.act` calls, as this
  // enables accurate tracing of actions.
  //
  // If the pattern added has been added previously, then the new
  // action function overrides the old action function. The old action
  // function is available via the `seneca.prior` method of the
  // current Seneca instance (`this` in the new action function).  A
  // chain of priors is formed if additional action functions with the
  // same pattern are added. There is a tutorial on [Seneca
  // priors](http://senecajs.org/tutorials/priors.html).
  root$.add = api_add

  // # Seneca.act
  //
  // Send a message. If the message matches a pattern, execute the
  // action function.
  //   * `msg` <small>_object_</small> &rarr;
  //   The message data. Only data that can be fully represented as JSON is valid.
  //   * `callback` <small>_function (optional)_</small> &rarr;
  //   The callback function that will receive the response to the
  //   message, generated by the action function.
  //
  // The message data may contain control properties, indicated by a
  // `$` suffix.  These are described in the [control properties
  // reference](http://senecajs.org/documentation/control-properties.html)
  //
  // **The callback function should not be a lambda (`=>`)**. The current
  // Seneca instance is provided via `this`, and should be used for
  // subsequent `seneca.act` calls, as this enables accurate tracing
  // of actions.
  //
  // If the callback function is provided, then the message
  // interaction is assumed to be synchronous, and a response from the
  // action function will be expected. If the callback function is not
  // provided, the interaction is assumed to be asynchronous, and no
  // response is expected.
  //
  // The callback function has parameters:
  //   * `error` <small>_Error_</small> &rarr; If an error occurred,
  //   an Error object will be provided, otherwise this is `null`. If
  //   the action times out, an error will be provided.
  //   * `response` <small>_object|array_</small> &rarr;
  //   The response data from the action function, if any.
  //
  // For convenience, you can build the full message from separate
  // parts, including [jsonic](https://github.com/rjrodger/jsonic)
  // strings. The full set of parameters to `seneca.act` is:
  //   * `jsonic` <small>_string (optional)_</small> &rarr;
  //   Message properties in jsonic format. These have precedence over
  //   other message parts.
  //   * `part1` <small>_object (optional)_</small> &rarr;
  //   Message data having precedence over `part2`.
  //   * `part2` <small>_object (optional)_</small> &rarr;
  //   Message data.
  //   * `callback` <small>_function (optional)_</small> &rarr;
  //   As previously described.
  root$.act = api_act

  root$.has = API.has
  root$.find = API.find
  root$.list = API.list
  root$.status = API.status
  root$.reply = API.reply

  root$.sub = api_sub // Subscribe to a message pattern.
  root$.use = api_use // Define a plugin.
  root$.listen = API.listen(callpoint) // Listen for inbound messages.
  root$.client = API.client(callpoint) // Send outbound messages.
  root$.export = api_export // Export plain objects from a plugin.
  root$.ready = api_ready // Callback when plugins initialized.
  root$.close = api_close // Close and shutdown plugins.
  root$.options = api_options // Get and set options.
  root$.error = api_error // Set global error handler.
  root$.decorate = api_decorate // Decorate seneca object with functions
  root$.inward = api_inward // Add a modifier function for messages inward
  root$.outward = api_outward // Add a modifier function for responses outward
  root$.test = api_test // Set test mode.

  root$.hasact = Legacy.hasact

  // Non-API methods.
  root$.register = Plugins.register(opts, callpoint)
  root$.depends = api_depends
  root$.act_if = api_act_if
  root$.wrap = api_wrap
  root$.seneca = api_seneca
  root$.fix = api_fix
  root$.delegate = api_delegate

  // Legacy API; Deprecated.
  root$.findact = root$.find

  // DEPRECATED
  root$.fail = Legacy.fail(opts.$)

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

  // setup status log
  if (opts.$.status.interval > 0 && opts.$.status.running) {
    private$.stats = private$.stats || {}
    setInterval(function status() {
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

  private$.action_modifiers = []
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
    //.add(Outward.make_error)
    .add(Outward.act_stats)
    .add(Outward.act_cache)
    .add(Outward.res_object)

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

  function api_sub() {
    var self = this

    var subargs = Common.parsePattern(self, arguments, 'action:f actdef:o?')
    var pattern = subargs.pattern
    if (
      pattern.in$ == null &&
      pattern.out$ == null &&
      pattern.error$ == null &&
      pattern.cache$ == null &&
      pattern.default$ == null &&
      pattern.client$ == null
    ) {
      pattern.in$ = true
    }

    if (!private$.handle_sub) {
      private$.handle_sub = function handle_sub(args, result) {
        if (!args.meta$) {
          Common.setmeta(args, {})
        }

        var subfuncs = private$.subrouter.find(args)

        if (subfuncs) {
          args.meta$.sub = subfuncs.pattern

          _.each(subfuncs, function subfunc(subfunc) {
            try {
              subfunc.call(self, args, result)
            } catch (ex) {
              // TODO: not really satisfactory
              var err = error(ex, 'sub_function_catch', {
                args: args,
                result: result
              })
              self.log.error(
                errlog(err, {
                  kind: 'sub',
                  msg: args,
                  actid: args.meta$.id
                })
              )
            }
          })
        }
      }

      // TODO: other cases

      // Subs are triggered via events
      self.on('act-in', annotate('in$', private$.handle_sub))
      self.on('act-out', annotate('out$', private$.handle_sub))
    }

    function annotate(prop, handle_sub) {
      return function annotation(args, result) {
        args = _.clone(args)
        result = _.clone(result)
        args[prop] = true
        handle_sub(args, result)
      }
    }

    var subs = private$.subrouter.find(pattern)
    if (!subs) {
      private$.subrouter.add(pattern, (subs = []))
      subs.pattern = Common.pattern(pattern)
    }
    subs.push(subargs.action)

    return self
  }

  // See [`seneca.add`](#seneca.add)
  function api_add() {
    var self = this
    var args = Common.parsePattern(self, arguments, 'action:f? actdef:o?')

    var raw_pattern = args.pattern

    var pattern = self.util.clean(raw_pattern)

    if (!_.keys(pattern)) {
      throw error('add_empty_pattern', { args: Common.clean(args) })
    }

    var action =
      args.action ||
      function default_action(msg, done) {
        done.call(this, null, msg.meta$.dflt || null)
      }

    var actdef = args.actdef || {}

    actdef.raw = _.cloneDeep(raw_pattern)

    // TODO: refactor plugin name, tag and fullname handling.
    actdef.plugin_name = actdef.plugin_name || 'root$'
    actdef.plugin_fullname =
      actdef.plugin_fullname ||
      actdef.plugin_name +
        ((actdef.plugin_tag === '-' ? void 0 : actdef.plugin_tag)
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

    var strict_add = raw_pattern.strict$ && raw_pattern.strict$.add !== null
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

    // TODO: deprecate
    actdef.args = _.clone(pattern)

    actdef.rules = pattern_rules

    //actdef.id = refnid(action.name)
    actdef.id = action.name + '_' + next_action_id()
    actdef.name = action.name
    actdef.func = action

    // Canonical string form of the action pattern.
    actdef.pattern = Common.pattern(pattern)

    // Canonical object form of the action pattern.
    actdef.msgcanon = Jsonic(actdef.pattern)

    var priormeta = self.find(pattern)

    if (priormeta) {
      if ('' === priormeta.pattern) {
        priormeta = null
      } else if (strict_add && priormeta.pattern !== actdef.pattern) {
        // only exact action patterns are overridden
        // use .wrap for pin-based patterns
        priormeta = null
      }
    }

    if (priormeta) {
      if (_.isFunction(priormeta.handle)) {
        priormeta.handle(args.pattern, action)
        addroute = false
      } else {
        actdef.priormeta = priormeta
      }
      actdef.priorpath = priormeta.id + ';' + priormeta.priorpath
    } else {
      actdef.priorpath = ''
    }

    // FIX: need a much better way to support layered actions
    // this ".handle" hack is just to make seneca.close work
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
      actdef = actmod.call(seneca, actdef)
    })

    return actdef
  }

  // TODO: deprecate
  root$.findpins = root$.pinact = function findpins() {
    var argsarr = new Array(arguments.length)
    for (var l = 0; l < argsarr.length; ++l) {
      argsarr[l] = arguments[l]
    }

    var pins = []
    var patterns = _.flatten(argsarr)

    _.each(patterns, function(pattern) {
      pattern = _.isString(pattern) ? Jsonic(pattern) : pattern
      pins = pins.concat(
        _.map(private$.actrouter.list(pattern), function(desc) {
          return desc.match
        })
      )
    })

    return pins
  }

  // DEPRECATED
  function api_act_if() {
    var self = this
    var args = Norma('{execute:b actargs:.*}', arguments)

    if (args.execute) {
      return self.act.apply(self, args.actargs)
    } else return self
  }

  // Perform an action. The properties of the first argument are matched against
  // known patterns, and the most specific one wins.
  function api_act() {
    var argsarr = new Array(arguments.length)
    for (var l = 0; l < argsarr.length; ++l) {
      argsarr[l] = arguments[l]
    }

    var self = this
    var spec = Common.parsePattern(self, argsarr, 'reply:f?')
    var msg = spec.pattern
    var reply = spec.reply

    msg = self.fixedargs ? Object.assign(msg, self.fixedargs) : msg

    /*    
    if(self.fixedargs) {
      for( var p in self.fixedargs) {
        msg[p] = self.fixedargs[p]
      }
    }
*/

    if (opts.$.debug.act_caller || opts.$.test) {
      msg.caller$ =
        '\n    Action call arguments and location: ' +
        (new Error(Util.inspect(msg).replace(/\n/g, '')).stack + '\n')
          .replace(/Error: /, '')
          .replace(/.*\/gate-executor\.js:.*\n/g, '')
          .replace(/.*\/seneca\.js:.*\n/g, '')
          .replace(/.*\/seneca\/lib\/.*\.js:.*\n/g, '')
    }

    do_act(self, opts, msg, reply)
    return self
  }

  function api_wrap(pin, meta, wrapper) {
    var pinthis = this

    wrapper = _.isFunction(meta) ? meta : wrapper
    meta = _.isFunction(meta) ? {} : meta

    pin = _.isArray(pin) ? pin : [pin]
    _.each(pin, function(p) {
      _.each(pinthis.findpins(p), function(actpattern) {
        pinthis.add(actpattern, meta, wrapper)
      })
    })

    return this
  }

  var handleClose = function() {
    root$.close(function(err) {
      if (err) {
        Print.err(err)
      }

      process.exit(err ? err.exit === null ? 1 : err.exit : 0)
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
      _.each(opts.$.internal.close_signals, function(active, signal) {
        if (active) {
          process.removeListener(signal, handleClose)
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

        if (_.isFunction(done)) {
          return done.call(seneca, err)
        }
      })
    }
  }

  // useful when defining services!
  // note: has EventEmitter.once semantics
  // if using .on('ready',fn) it will be be called for each ready event
  function api_ready(ready) {
    var self = this

    setImmediate(function register_ready() {
      if (root$.private$.ge.isclear()) {
        ready.call(self)
      } else {
        root$.private$.ready_list.push(ready.bind(self))
      }
    })

    return self
  }

  // use('pluginname') - built-in, or provide calling code 'require' as seneca opt
  // use(require('pluginname')) - plugin object, init will be called
  // if first arg has property senecaplugin
  function api_use(arg0, arg1, arg2) {
    var self = this
    var plugindesc

    // DEPRECATED: Remove when Seneca >= 4.x
    // Allow chaining with seneca.use('options', {...})
    // see https://github.com/rjrodger/seneca/issues/80
    if (arg0 === 'options') {
      self.options(arg1)
      return self
    }

    try {
      plugindesc = private$.use(arg0, arg1, arg2)
    } catch (e) {
      self.die(error(e, 'plugin_' + e.code))
      return self
    }

    self.register(plugindesc)

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

  function do_act(instance, opts, origmsg, origreply) {
    var actstart = Date.now()
    var act_callpoint = callpoint()
    var is_sync = _.isFunction(origreply)
    var execute_instance = instance
    var timedout = false
    var action_ctxt = {}
    var reply = origreply || _.noop

    // copy only non-directives
    var metaproto = { meta$: {} }
    metaproto.__proto__ = origmsg.__proto__
    var actmsg = Object.create(metaproto)

    var pn = Object.getOwnPropertyNames(origmsg)
    for (var i = 0; i < pn.length; i++) {
      var p = pn[i]

      if ('$' != p[p.length - 1]) {
        actmsg[p] = origmsg[p]
      }
    }

    var origmeta = origmsg.meta$
    if (origmeta) {
      if (origmeta.dflt) {
        actmsg.meta$.dflt = origmeta.dflt
      }
      if (origmeta.custom) {
        actmsg.meta$.custom = origmeta.custom
      }
      if (origmeta.closing) {
        actmsg.meta$.closing = origmeta.closing
      }
    }

    resolve_msg_id_tx(execute_instance, actmsg, origmsg)

    actmsg.meta$.instance = root$.id

    actmsg.meta$.start = actstart

    actmsg.meta$.timeout = Math.max(
      0,
      'number' === typeof origmsg.timeout$ ? origmsg.timeout$ : opts.$.timeout
    )

    if (origmsg.gate$) {
      actmsg.meta$.gate = true
    }
    if (origmsg.fatal$) {
      actmsg.meta$.fatal = true
    }
    if (origmsg.closing$) {
      actmsg.meta$.closing = true
    }
    if (origmsg.local$) {
      actmsg.meta$.local = true
    }

    if (origmsg.plugin$) {
      actmsg.meta$.plugin = origmsg.plugin$
    }
    if (origmsg.default$) {
      actmsg.meta$.dflt = origmsg.default$
    }
    if (origmsg.prior$) {
      actmsg.meta$.prior = origmsg.prior$
    }
    if (origmsg.custom$) {
      actmsg.meta$.custom = origmsg.custom$
    }
    if (origmsg.parents$) {
      actmsg.meta$.parents = origmsg.parents$
    }

    // backwards compatibility for Seneca 3.x transports
    if (origmsg.transport$) {
      actmsg.transport$ = origmsg.transport$
    }

    if (actmsg.meta$.gate) {
      execute_instance = instance.delegate()
      execute_instance.private$.ge = execute_instance.private$.ge.gate()
    }

    var execspec = {
      dn: actmsg.meta$.id,
      fn: function act_fn(done) {
        try {
          execute_action(execute_instance, actmsg, function reply() {
            if (!timedout) {
              handle_result.apply(this, arguments)
            }
            done()
          })
        } catch (e) {
          var ex = Util.isError(e) ? e : new Error(Util.inspect(e))
          handle_result.call(execute_instance, ex)
          done()
        }
      },
      ontm: function act_tm() {
        timedout = true
        handle_result.call(execute_instance, new Error('[TIMEOUT]'))
      },
      tm: actmsg.meta$.timeout
    }

    execute_instance.private$.ge.add(execspec)

    function execute_action(act_instance, msg, reply) {
      var private$ = act_instance.private$

      var actdef = msg.meta$.prior
        ? private$.actdef[msg.meta$.prior]
        : act_instance.find(msg)

      var delegate = make_act_delegate(act_instance, opts, msg.meta$, actdef)

      action_ctxt.start = actstart
      action_ctxt.sync = is_sync
      action_ctxt.seneca = delegate
      action_ctxt.actdef = actdef
      action_ctxt.options = delegate.options()
      action_ctxt.callpoint = act_callpoint

      var data = { msg: msg, reply: reply }
      var inward = private$.inward.process(action_ctxt, data)

      if (handle_inward_break(inward, act_instance, data, actdef, origmsg)) {
        return
      }

      if (!actdef.sub) {
        delegate.log.debug(
          actlog(actdef, msg, origmsg, { kind: 'act', case: 'IN' })
        )
      }

      data.id = data.msg.meta$.id
      data.result = []
      data.timelimit = Date.now() + data.msg.meta$.timeout
      private$.history.add(data)

      actdef.func.call(delegate, data.msg, data.reply)
    }

    function handle_result(err, out) {
      var delegate = this
      var actdef = action_ctxt.actdef

      var actend = Date.now()
      action_ctxt.duration = actend - action_ctxt.start

      var call_cb = true

      var data = {
        msg: actmsg,
        res: err || out
      }

      var outward = private$.outward.process(action_ctxt, data)

      if (outward) {
        if ('error' === outward.kind) {
          data.res = outward.error || error(outward.code, outward.info)
        } else if ('result' === outward.kind) {
          data.res = outward.result
        }
      }

      var meta = actmsg.meta$ || {}
      meta.end = actend

      if (data.res) {
        if (data.res.trace$ && data.res.meta$) {
          data.res.__proto__.trace$ = false

          var res_meta = data.res.meta$

          meta.trace = meta.trace || []
          meta.trace.push({
            desc: make_trace_desc(res_meta),
            trace: res_meta.trace || []
          })
        }

        Common.setmeta(data.res, meta)
      }

      var parent_meta = delegate.private$.act && delegate.private$.act.parent
      if (parent_meta) {
        parent_meta.trace = parent_meta.trace || []
        parent_meta.trace.push({
          desc: make_trace_desc(meta),
          trace: meta.trace || []
        })
      }

      if (_.isError(data.res)) {
        var errordesc = act_error(
          instance,
          data.res,
          actdef,
          [err, out],
          reply,
          actend - actstart,
          actmsg,
          origmsg,
          act_callpoint
        )

        if (actmsg.meta$.fatal) {
          return instance.die(errordesc.err)
        }

        call_cb = errordesc.call_cb

        if (delegate && _.isFunction(delegate.on_act_err)) {
          delegate.on_act_err(actdef, data.res)
        }
      } else {
        delegate.log.debug(
          actlog(actdef, actmsg, origmsg, {
            kind: 'act',
            case: 'OUT',
            duration: actend - actstart,
            result: data.res
          })
        )

        instance.emit('act-out', actmsg, data.res)

        if (_.isFunction(delegate.on_act_out)) {
          delegate.on_act_out(actdef, data.res)
        }
      }

      try {
        if (call_cb) {
          var rout = data.res || null
          var rerr = null

          if (_.isError(data.res)) {
            rerr = errordesc.err
            rout = null
          }

          reply.call(delegate, rerr, rout, meta)
        }
      } catch (e) {
        var ex = Util.isError(e) ? e : new Error(Util.inspect(e))

        callback_error(
          instance,
          ex,
          actdef,
          [err, out],
          reply,
          actend - actstart,
          actmsg,
          origmsg,
          act_callpoint
        )
      }
    }
  }

  function resolve_msg_id_tx(act_instance, actmsg, origmsg) {
    var id_tx = (origmsg.id$ ||
      origmsg.actid$ ||
      actmsg.meta$.id ||
      act_instance.idgen())
      .split('/')

    var tx =
      id_tx[1] ||
      origmsg.tx$ ||
      actmsg.meta$.tx$ ||
      act_instance.fixedargs.tx$ ||
      act_instance.idgen()

    var mi = id_tx[0] || act_instance.idgen()

    actmsg.meta$.mi = mi
    actmsg.meta$.tx = tx
    actmsg.meta$.id = mi + '/' + tx
  }

  function handle_inward_break(inward, act_instance, data, actdef, origmsg) {
    if (!inward) return false

    var msg = data.msg
    var reply = data.reply

    if ('error' === inward.kind) {
      var err = inward.error || error(inward.code, inward.info)

      if (inward.log && inward.log.level) {
        act_instance.log[inward.log.level](
          errlog(
            err,
            errlog(actdef || {}, msg.meta$.prior, msg, origmsg, inward.log.data)
          )
        )
      }

      reply.call(act_instance, err)
      return true
    } else if ('result' === inward.kind) {
      if (inward.log && inward.log.level) {
        act_instance.log[inward.log.level](
          actlog(actdef || {}, msg, origmsg, inward.log.data)
        )
      }

      reply.call(act_instance, null, inward.result)
      return true
    }
  }

  function act_error(
    instance,
    origerr,
    actdef,
    result,
    cb,
    duration,
    msg,
    origmsg,
    act_callpoint
  ) {
    var call_cb = true
    actdef = actdef || {}

    var err = origerr

    if (!err.seneca) {
      var details = _.extend({}, err.details, {
        message: err.eraro && err.orig ? err.orig.message : err.message,
        pattern: actdef.pattern,
        fn: actdef.func,
        cb: cb,
        instance: instance.toString(),
        callpoint: act_callpoint
      })

      if (opts.$.legacy.error) {
        err = error(origerr, 'act_execute', details)
      } else {
        var seneca_err = error('act_execute', {
          pattern: actdef.pattern,
          message: origerr.message,
          callpoint: act_callpoint
        })
        delete seneca_err.stack

        err.meta$ = err.meta$ || msg.meta$ || {}
        err.meta$.data = instance.util.clean(origmsg)

        if (err.meta$.err) {
          var errmeta = _.clone(msg.meta$)
          errmeta.err = seneca_err
          err.meta$.err_trace = err.meta$.err_trace || []
          err.meta$.err_trace.push(errmeta)
        } else {
          err.meta$.err = seneca_err
        }
      }

      result[0] = err
    } else if (
      err.orig &&
      _.isString(err.orig.code) &&
      err.orig.code.indexOf('perm/') === 0
    ) {
      // Special legacy case for seneca-perm
      err = err.orig
      result[0] = err
    }

    if (opts.$.legacy.error) {
      err.details = err.details || {}
      err.details.plugin = err.details.plugin || {}
    }

    var entry = actlog(actdef, msg, origmsg, {
      // kind is act as this log entry relates to an action
      kind: 'act',
      case: 'ERR',
      duration: duration
    })
    entry = errlog(err, entry)

    instance.log.error(entry)
    instance.emit('act-err', msg, err)

    // when fatal$ is set, prefer to die instead
    if (opts.$.errhandler && (!msg || !msg.meta$.fatal)) {
      call_cb = !opts.$.errhandler.call(instance, err)
    }

    return {
      call_cb: call_cb,
      err: err
    }
  }

  function callback_error(
    instance,
    err,
    actdef,
    result,
    cb,
    duration,
    msg,
    origmsg,
    act_callpoint
  ) {
    actdef = actdef || {}

    if (!err.seneca) {
      err = error(
        err,
        'act_callback',
        _.extend({}, err.details, {
          message: err.message,
          pattern: actdef.pattern,
          fn: actdef.func,
          cb: cb,
          instance: instance.toString(),
          callpoint: act_callpoint
        })
      )

      result[0] = err
    }

    err.details = err.details || {}
    err.details.plugin = err.details.plugin || {}

    instance.log.error(
      actlog(actdef, msg, origmsg, {
        // kind is act as this log entry relates to an action
        kind: 'act',
        case: 'ERR',
        info: err.message,
        code: err.code,
        err: err,
        duration: duration
      })
    )

    instance.emit('act-err', msg, err, result[1])

    if (opts.$.errhandler) {
      opts.$.errhandler.call(instance, err)
    }
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

  function api_delegate(fixedargs) {
    var self = this
    fixedargs = fixedargs || {}

    var delegate = Object.create(self)
    delegate.private$ = Object.create(self.private$)

    delegate.did = refnid()

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

    delegate.delegate = function delegate(further_fixedargs) {
      var args = _.extend({}, delegate.fixedargs, further_fixedargs || {})
      return self.delegate.call(this, args)
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

    opts.$ = private$.exports.options = options == null
      ? private$.optioner.get()
      : private$.optioner.set(options)

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

  // TODO: should set all system.close_signals to false
  function api_test(errhandler, logspec) {
    if (opts.$.tag) {
      root$.id = opts.$.tag
    }

    if ('function' !== typeof errhandler && null !== errhandler) {
      logspec = errhandler
      errhandler = null
    }

    this.options({
      errhandler: null === errhandler ? null : errhandler || Print.log,
      test: true,
      log: logspec || 'test'
    })

    private$.logger = load_logger(root$, opts.$.internal.logger)

    return this
  }

  // Inspired by https://github.com/hapijs/hapi/blob/master/lib/plugin.js decorate
  function api_decorate() {
    var args = Norma('property:s value:.', arguments)

    // TODO: review; needs to be more universally applicable
    // also messages should not be embedded directly
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

  // DEPRECATED
  // for use with async
  root$.next_act = function next_act() {
    var argsarr = new Array(arguments.length)
    for (var l = 0; l < argsarr.length; ++l) {
      argsarr[l] = arguments[l]
    }

    var si = this || root$

    si.log.warn({
      kind: 'notice',
      case: 'DEPRECATION',
      notice: Errors.deprecation.seneca_next_act
    })

    return function(next) {
      argsarr.push(next)
      si.act.apply(si, argsarr)
    }
  }

  // TODO: follow api_ convention
  root$.gate = function gate() {
    return this.delegate({ gate$: true })
  }

  // TODO: follow api_ convention
  root$.ungate = function ungate() {
    this.fixedargs.gate$ = false
    return this
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

  _.each(opts.$.internal.close_signals, function(active, signal) {
    if (active) {
      process.once(signal, handleClose)
    }
  })

  function load_logger(instance, log_plugin) {
    log_plugin = log_plugin || require('./lib/logging')

    return log_plugin.preload.call(instance).extend.logger
  }

  function action_queue_clear() {
    root$.emit('ready')

    var ready = root$.private$.ready_list.shift()
    if (ready) {
      ready()
    }

    if (root$.private$.ge.isclear()) {
      while (0 < root$.private$.ready_list.length) {
        root$.private$.ready_list.shift()()
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

function make_act_delegate(instance, opts, meta, actdef) {
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

  delegate.prior = function(msg, reply) {
    if (actdef.priormeta) {
      msg.prior$ = actdef.priormeta.id
      this.act(msg, reply)
    } else {
      var meta = msg.meta$ || {}
      var out = msg.default$ || meta.dflt || null
      if (out) {
        Common.setmeta(out, meta)
      }

      return reply.call(delegate, null, out)
    }
  }

  return delegate
}

function make_trace_desc(meta) {
  return [
    meta.pattern,
    meta.id,
    meta.instance,
    meta.start,
    meta.end,
    meta.sync,
    meta.action
  ]
}
