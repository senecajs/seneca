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
var Lrucache = require('lru-cache')


// Internal modules.
var Actions = require('./lib/actions')
var Common = require('./lib/common')
var Errors = require('./lib/errors')
var Legacy = require('./lib/legacy')
var Optioner = require('./lib/optioner')
var Package = require('./package.json')
var Plugins = require('./lib/plugins')
var Print = require('./lib/print')
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
    maxloop: 11
  },

  // Action cache. Makes inbound messages idempotent.
  actcache: {
    active: false,
    size: 11111
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
    // seneca.add uses catchall (pattern='') prior
    catchall: false,

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

  // Backwards compatibility settings.
  legacy: {

    // Action callback must always have signature callback(error, result).
    action_signature: false,

    // Logger can be changed by options method.
    logging: false,

    // Use old error codes.
    error_codes: false
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
  router: function router () { return Patrun() },
  argprops: Common.argprops
}


// Seneca is an EventEmitter.
function Seneca () {
  Events.EventEmitter.call(this)
  this.setMaxListeners(0)
}
Util.inherits(Seneca, Events.EventEmitter)


// Create a Seneca instance.
module.exports = function init (seneca_options, more_options) {
  var initial_options = _.isString(seneca_options)
        ? _.extend({}, {from: seneca_options}, more_options)
      : _.extend({}, seneca_options, more_options)

  var seneca = make_seneca(initial_options)
  var options = seneca.options()

  // The 'internal' key of options is reserved for objects and functions
  // that provide functionality, and are thus not really printable
  seneca.log.debug({kind: 'notice', options: _.omit(options, ['internal'])})

  Print.print_options(options)

  // TODO: these are core API and should not be decorations
  seneca.decorate('hasplugin', Plugins.api_decorations.hasplugin)
  seneca.decorate('findplugin', Plugins.api_decorations.findplugin)
  seneca.decorate('plugins', Plugins.api_decorations.plugins)

  // Register default plugins, unless turned off by options.
  if (options.default_plugins.transport) {
    seneca.use(require('seneca-transport'))
  }

  // Register plugins specified in options.
  _.each(options.plugins, function (plugindesc) {
    seneca.use(plugindesc)
  })

  seneca.ready(function () {
    this.log.info({kind: 'notice', notice: 'hello seneca ' + seneca.id})
  })

  return seneca
}

// Expose Seneca prototype for easier monkey-patching
module.exports.Seneca = Seneca

// To reference builtin loggers when defining logging options.
module.exports.loghandler = Legacy.loghandler

// Makes require('seneca').use(...) work by creating an on-the-fly instance.
module.exports.use = function top_use () {
  var argsarr = new Array(arguments.length)
  for (var l = 0; l < argsarr.length; ++l) { argsarr[l] = arguments[l] }

  var instance = module.exports()

  return instance.use.apply(instance, argsarr)
}

// Makes require('seneca').test() work.
module.exports.test = function top_test () {
  var argsarr = new Array(arguments.length)
  for (var l = 0; l < argsarr.length; ++l) { argsarr[l] = arguments[l] }

  var instance = module.exports({test: true, log: 'test'})
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
function make_seneca (initial_options) {
  initial_options = initial_options || {}

  // Create a private context.
  var private$ = make_private()

  // Create a new root Seneca instance.
  var root = new Seneca()
  root.make_log = make_log

  // Expose private data to plugins.
  root.private$ = private$

  // Resolve initial options.
  private$.optioner = Optioner(module, option_defaults, initial_options)
  var so = private$.optioner.get()

  // Create internal tools.
  var actnid = Nid({length: so.idlen})
  var refnid = function refnid () { return '(' + actnid() + ')' }

  // These need to come from options as required during construction.
  so.internal.actrouter = so.internal.actrouter || Patrun({ gex: true })
  so.internal.subrouter = so.internal.subrouter || Patrun({ gex: true })

  var callpoint = make_callpoint(so.debug.callpoint)

  // Define public member variables.
  root.root = root
  root.start_time = Date.now()
  root.fixedargs = {}
  root.context = {}
  root.version = Package.version

  private$.actcache = Lrucache({ max: so.actcache.size })


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
  root.add = api_add

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
  root.act = api_act // Perform action that matches pattern.

  root.sub = api_sub // Subscribe to a message pattern.
  root.use = api_use // Define a plugin.
  root.listen = Transport.listen(callpoint) // Listen for inbound messages.
  root.client = Transport.client(callpoint) // Send outbound messages.
  root.export = api_export // Export plain objects from a plugin.
  root.has = Actions.has // True if action pattern defined.
  root.find = Actions.find // Find action by pattern
  root.list = Actions.list // List (a subset of) action patterns.
  root.ready = api_ready // Callback when plugins initialized.
  root.close = api_close // Close and shutdown plugins.
  root.options = api_options // Get and set options.
  root.error = api_error // Set global error handler.
  root.decorate = api_decorate // Decorate seneca object with functions
  root.inward = api_inward // Add a modifier function for messages inward
  root.outward = api_outward // Add a modifier function for responses outward
  root.test = api_test // Set test mode.

  // Method aliases.
  root.hasact = root.has

  // Non-API methods.
  root.register = Plugins.register(so, callpoint)
  root.depends = api_depends
  root.act_if = api_act_if
  root.wrap = api_wrap
  root.seneca = api_seneca
  root.fix = api_fix
  root.delegate = api_delegate

  // Legacy API; Deprecated.
  root.findact = root.find

  // DEPRECATED
  root.fail = Legacy.fail(so)

  // Identifier generator.
  root.idgen = Nid({length: so.idlen})
  so.tag = so.tag || option_defaults.tag
  so.tag = so.tag === 'undefined' ? option_defaults.tag : so.tag

  // Create a unique identifer for this instance.
  root.id = root.idgen() +
    '/' +
    root.start_time +
    '/' +
    process.pid +
    '/' +
    root.version +
    '/' +
    so.tag

  // The instance tag, useful for grouping instances.
  root.tag = so.tag

  if (so.debug.short_logs || so.log.short) {
    so.idlen = 2
    root.idgen = Nid({length: so.idlen})
    root.id = root.idgen() + '/' + so.tag
  }

  root.fullname = 'Seneca/' + root.id

  root.die = Common.makedie(root, {
    type: 'sys',
    plugin: 'seneca',
    tag: root.version,
    id: root.id,
    callpoint: callpoint
  })

  root.util = seneca_util


  // Configure logging
  private$.exports = { options: Common.deepextend({}, so) }
  private$.decorations = {}

  private$.logger = load_logger(root, so.internal.logger)
  root.log = make_log(root, default_log_modifier)


  // Error events are fatal, unless you're undead.  These are not the
  // same as action errors, these are unexpected internal issues.
  root.on('error', root.die)

  private$.ge =
    GateExecutor({
      timeout: so.timeout
    })
    .clear(action_queue_clear)
    .start()

  // setup status log
  if (so.status.interval > 0 && so.status.running) {
    private$.stats = private$.stats || {}
    setInterval(function status () {
      root.log.info({
        kind: 'status',
        alive: (Date.now() - private$.stats.start),
        act: private$.stats.act
      })
    }, so.status.interval)
  }

  if (so.stats) {
    private$.timestats = new Stats.NamedStats(so.stats.size, so.stats.interval)

    if (so.stats.running) {
      setInterval(function stats () {
        private$.timestats.calculate()
      }, so.stats.interval)
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

  private$.actrouter = so.internal.actrouter
  private$.subrouter = so.internal.subrouter

  root.toString = api_toString

  private$.action_modifiers = []
  private$.ready_list = []


  private$.inward = Ordu({name: 'inward'})
    .add(Actions.inward.closed)
    .add(Actions.inward.resolve_msg_id)
    .add(Actions.inward.act_cache)
    .add(Actions.inward.act_default)
    .add(Actions.inward.act_not_found)
    .add(Actions.inward.act_stats)
    .add(Actions.inward.validate_msg)
    .add(Actions.inward.warnings)
    .add({tags: ['prior']}, Actions.inward.msg_meta)
    .add({tags: ['prior']}, Actions.inward.prepare_delegate)
    .add(Actions.inward.msg_modify)
    .add(Actions.inward.announce)

  private$.outward = Ordu({name: 'outward'})
    .add(Actions.outward.act_stats)
    .add(Actions.outward.act_cache)
    .add(Actions.outward.res_object)


  function api_depends () {
    var self = this

    var args = Norma('{pluginname:s deps:a? moredeps:s*}', arguments)

    var deps = args.deps || args.moredeps

    _.every(deps, function (depname) {
      if (!_.includes(private$.plugin_order.byname, depname) &&
        !_.includes(private$.plugin_order.byname, 'seneca-' + depname)) {
        self.die(error('plugin_required', { name: args.pluginname, dependency: depname }))
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

    // TODO: death should be optional
    if (!exportval) {
      return self.die(error('export_not_found', {key: key}))
    }

    return exportval
  }

  function api_sub () {
    var self = this

    var subargs = Common.parsePattern(self, arguments, 'action:f actmeta:o?')
    var pattern = subargs.pattern
    if (pattern.in$ == null &&
      pattern.out$ == null &&
      pattern.error$ == null &&
      pattern.cache$ == null &&
      pattern.default$ == null &&
      pattern.client$ == null) {
      pattern.in$ = true
    }

    if (!private$.handle_sub) {
      private$.handle_sub = function handle_sub (args, result) {
        args.meta$ = args.meta$ || {}

        if (!args.meta$.prior || !args.meta$.prior.entry) {
          return
        }

        var subfuncs = private$.subrouter.find(args)

        if (subfuncs) {
          args.meta$.sub = subfuncs.pattern

          _.each(subfuncs, function subfunc (subfunc) {
            try {
              subfunc.call(self, args, result)
            }
            catch (ex) {
              // TODO: not really satisfactory
              var err = error(ex, 'sub_function_catch', { args: args, result: result })
              self.log.error(errlog(err, {
                kind: 'sub',
                msg: args,
                actid: args.meta$.id
              }))
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
      return function annotation (args, result) {
        args = _.clone(args)
        result = _.clone(result)
        args[prop] = true
        handle_sub(args, result)
      }
    }

    var subs = private$.subrouter.find(pattern)
    if (!subs) {
      private$.subrouter.add(pattern, subs = [])
      subs.pattern = Common.pattern(pattern)
    }
    subs.push(subargs.action)

    return self
  }


  // See [`seneca.add`](#seneca.add)
  function api_add () {
    var self = this
    var args = Common.parsePattern(self, arguments, 'action:f? actmeta:o?')

    var raw_pattern = args.pattern

    var pattern = self.util.clean(raw_pattern)

    if (!_.keys(pattern)) {
      throw error('add_empty_pattern', {args: Common.clean(args)})
    }


    var action = args.action || function default_action (msg, done) {
      done.call(this, null, msg.default$ || null)
    }

    var actmeta = args.actmeta || {}

    actmeta.raw = _.cloneDeep(raw_pattern)

    // TODO: refactor plugin name, tag and fullname handling.
    actmeta.plugin_name = actmeta.plugin_name || 'root$'
    actmeta.plugin_fullname = actmeta.plugin_fullname ||
      actmeta.plugin_name +
      ((actmeta.plugin_tag === '-' ? void 0 : actmeta.plugin_tag)
       ? '/' + actmeta.plugin_tag : '')

    var add_callpoint = callpoint()
    if (add_callpoint) {
      actmeta.callpoint = add_callpoint
    }

    actmeta.sub = !!raw_pattern.sub$
    actmeta.client = !!raw_pattern.client$

    // Deprecate a pattern by providing a string message using deprecate$ key.
    actmeta.deprecate = raw_pattern.deprecate$

    var strict_add = (raw_pattern.strict$ && raw_pattern.strict$.add !== null)
      ? !!raw_pattern.strict$.add : !!so.strict.add

    var internal_catchall = (raw_pattern.internal$ && raw_pattern.internal$.catchall !== null)
      ? !!raw_pattern.internal$.catchall : !!so.internal.catchall

    var pattern_rules = _.clone(action.validate || {})
    _.each(pattern, function (v, k) {
      if (_.isObject(v)) {
        pattern_rules[k] = _.clone(v)
        delete pattern[k]
      }
    })

    var addroute = true

    // TODO: deprecate
    actmeta.args = _.clone(pattern)

    actmeta.rules = pattern_rules

    actmeta.id = refnid()
    actmeta.func = action

    // Canonical string form of the action pattern.
    actmeta.pattern = Common.pattern(pattern)

    // Canonical object form of the action pattern.
    actmeta.msgcanon = Jsonic(actmeta.pattern)


    var priormeta = self.find(pattern)

    if (priormeta) {
      if (!internal_catchall && '' === priormeta.pattern) {
        priormeta = null
      }

      // only exact action patterns are overridden
      // use .wrap for pin-based patterns
      else if (strict_add && priormeta.pattern !== actmeta.pattern) {
        priormeta = null
      }
    }

    if (priormeta) {
      if (_.isFunction(priormeta.handle)) {
        priormeta.handle(args.pattern, action)
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

    private$.stats.actmap[actmeta.pattern] =
      private$.stats.actmap[actmeta.pattern] || make_action_stats(actmeta)

    actmeta = modify_action(self, actmeta)

    if (addroute) {
      self.log.debug({
        kind: 'add',
        case: actmeta.sub ? 'SUB' : 'ADD',
        id: actmeta.id,
        pattern: actmeta.pattern,
        name: action.name,
        callpoint: callpoint
      })

      private$.actrouter.add(pattern, actmeta)
    }

    return self
  }


  function make_action_stats (actmeta) {
    return {
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
  }


  function modify_action (seneca, actmeta) {
    _.each(private$.action_modifiers, function (actmod) {
      actmeta = actmod.call(seneca, actmeta)
    })

    return actmeta
  }


  // TODO: deprecate
  root.findpins = root.pinact = function findpins () {
    var argsarr = new Array(arguments.length)
    for (var l = 0; l < argsarr.length; ++l) { argsarr[l] = arguments[l] }

    var pins = []
    var patterns = _.flatten(argsarr)

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


  // DEPRECATED
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
    var argsarr = new Array(arguments.length)
    for (var l = 0; l < argsarr.length; ++l) { argsarr[l] = arguments[l] }

    var self = this
    var spec = Common.parsePattern(self, argsarr, 'done:f?')
    var msg = _.extend(spec.pattern, self.fixedargs)
    var actdone = spec.done

    if (so.debug.act_caller || so.test) {

      // TODO: remove term 'Error' from generated string as confusing
      msg.caller$ = '\n    Action call arguments and location: ' +
        (new Error(Util.inspect(msg).replace(/\n/g, '')).stack)
          .replace(/.*\/seneca\.js:.*\n/g, '')
          .replace(/.*\/seneca\/lib\/.*\.js:.*\n/g, '')
    }

    do_act(self, msg, actdone)
    return self
  }


  function api_wrap (pin, meta, wrapper) {
    var pinthis = this

    wrapper = _.isFunction(meta) ? meta : wrapper
    meta = _.isFunction(meta) ? {} : meta

    pin = _.isArray(pin) ? pin : [pin]
    _.each(pin, function (p) {
      _.each(pinthis.findpins(p), function (actpattern) {
        pinthis.add(actpattern, meta, wrapper)
      })
    })
  }

  var handleClose = function () {
    root.close(function (err) {
      if (err) {
        Common.console_error(err)
      }

      process.exit(err ? (err.exit === null ? 1 : err.exit) : 0)
    })
  }

  // close seneca instance
  // sets public seneca.closed property
  function api_close (done) {
    var seneca = this

    seneca.ready(do_close)

    function do_close () {
      seneca.closed = true

      // cleanup process event listeners
      _.each(so.internal.close_signals, function (active, signal) {
        if (active) {
          process.removeListener(signal, handleClose)
        }
      })

      seneca.log.debug({kind: 'close', notice: 'start', callpoint: callpoint()})
      seneca.act('role:seneca,cmd:close,closing$:true', function (err) {
        seneca.log.debug(errlog(
          err, {kind: 'close', notice: 'end'}))

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
  function api_ready (ready) {
    var self = this

    setImmediate(function register_ready () {
      if (root.private$.ge.isclear()) {
        ready.call(self)
      }
      else {
        root.private$.ready_list.push(ready.bind(self))
      }
    })

    return self
  }

  // use('pluginname') - built-in, or provide calling code 'require' as seneca opt
  // use(require('pluginname')) - plugin object, init will be called
  // if first arg has property senecaplugin
  function api_use (arg0, arg1, arg2) {
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
    }
    catch (e) {
      self.die(error(e, 'plugin_' + e.code))
      return self
    }

    self.register(plugindesc)

    return self
  }

  // Return self. Mostly useful as a check that this is a Seneca instance.
  function api_seneca () {
    return this
  }

  // Describe this instance using the form: Seneca/VERSION/ID
  function api_toString () {
    return this.fullname
  }


  function api_inward (inward) {
    Assert('function' === typeof inward)
    Assert(2 === inward.length)

    private$.inward.add(inward)
    return this
  }


  function api_outward (outward) {
    Assert('function' === typeof outward)
    Assert(2 === outward.length)

    private$.outward.add(outward)
    return this
  }


  function do_act (instance, origmsg, actdone) {
    var actstart = Date.now()
    var msg = _.clone(origmsg)
    var act_callpoint = callpoint()
    var is_sync = _.isFunction(actdone)
    var execute_instance = instance
    var timedout = false

    actdone = actdone || _.noop

    if (msg.gate$) {
      execute_instance = instance.delegate()
      execute_instance.private$.ge =
        execute_instance.private$.ge.gate()
    }

    var execspec = {
      fn: function act_fn (done) {
        try {
          execute_action(execute_instance, msg, function reply () {
            if (!timedout) {
              handle_result.apply(this, arguments)
            }
            done()
          })
        }
        catch (e) {
          handle_result.call(execute_instance, e)
          done()
        }
      },
      ontm: function act_tm () {
        timedout = true
        handle_result.call(execute_instance, new Error('[TIMEOUT]'))
      },
      tm: 'number' === typeof msg.timeout$ ? msg.timeout$ : null
    }

    execute_instance.private$.ge.add(execspec)


    var action_ctxt = {}

    function execute_action (act_instance, msg, reply) {
      var actmeta = act_instance.find(msg, {catchall: so.internal.catchall})

      msg.meta$ = msg.meta$ || {}
      var delegate = act_make_delegate(act_instance, msg, actmeta)

      action_ctxt.start = actstart
      action_ctxt.sync = is_sync
      action_ctxt.seneca = delegate
      action_ctxt.actmeta = actmeta
      action_ctxt.options = delegate.options()
      action_ctxt.callpoint = act_callpoint

      var data = {msg: msg, reply: reply}
      var inward = private$.inward.process(action_ctxt, data)

      if (handle_inward_break(inward, act_instance, data, actmeta, origmsg)) {
        return
      }

      if (!actmeta.sub) {
        delegate.log.debug(actlog(
          actmeta, msg, origmsg,
          { kind: 'act', case: 'IN' }))
      }

      actmeta.func.call(delegate, data.msg, data.reply)
    }


    function handle_result () {
      var argsarr = new Array(arguments.length)
      for (var l = 0; l < argsarr.length; ++l) { argsarr[l] = arguments[l] }

      if (!so.legacy.action_signature &&
          1 === argsarr.length &&
          !_.isError(argsarr[0])) {
        argsarr.unshift(null)
      }

      var actmeta = action_ctxt.actmeta
      var delegate = this || instance

      var actend = Date.now()
      action_ctxt.duration = actend - action_ctxt.start

      var call_cb = true

      var data = {
        msg: msg,
        err: argsarr[0],
        res: argsarr[1]
      }

      var outward = private$.outward.process(action_ctxt, data)
      var err = data.err

      if (outward) {
        if ('error' === outward.kind) {
          err = outward.error ||
            error(outward.code, outward.info)
        }
      }

      if (err) {
        var out = act_error(instance, err, actmeta, argsarr, actdone,
                            actend - actstart, msg, origmsg, act_callpoint)

        if (msg.fatal$) {
          return instance.die(out.err)
        }

        call_cb = out.call_cb
        argsarr[0] = out.err

        if (delegate && _.isFunction(delegate.on_act_err)) {
          delegate.on_act_err(actmeta, argsarr[0])
        }
      }
      else {
        instance.emit('act-out', msg, argsarr[1])
        argsarr[0] = null

        delegate.log.debug(actlog(
          actmeta, msg, origmsg,
          { kind: 'act',
            case: 'OUT',
            duration: actend - actstart,
            result: argsarr[1]
          }))

        if (_.isFunction(delegate.on_act_out)) {
          delegate.on_act_out(actmeta, argsarr[1])
        }
      }

      try {
        if (call_cb) {
          actdone.apply(delegate, argsarr) // note: err == argsarr[0]
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

        callback_error(instance, formattedErr, actmeta, argsarr, actdone,
                       actend - actstart, msg, origmsg, act_callpoint)
      }
    }
  }


  function handle_inward_break (inward, act_instance, data, actmeta, origmsg) {
    if (!inward) return false

    var msg = data.msg
    var reply = data.reply

    if ('error' === inward.kind) {
      var err = inward.error ||
            error(inward.code, inward.info)

      if (inward.log && inward.log.level) {
        act_instance.log[inward.log.level](errlog(err, errlog(
          actmeta || {}, msg.meta$.prior, msg, origmsg, inward.log.data
        )))
      }

      reply.call(act_instance, err)
      return true
    }
    else if ('result' === inward.kind) {
      if (inward.log && inward.log.level) {
        act_instance.log[inward.log.level](actlog(
          actmeta || {}, msg, origmsg, inward.log.data
        ))
      }

      reply.call(act_instance, null, inward.result)
      return true
    }
  }


  function act_error (instance, err, actmeta, result, cb,
    duration, msg, origmsg, act_callpoint) {
    var call_cb = true
    actmeta = actmeta || {}

    if (!err.seneca) {
      err = error(err, 'act_execute', _.extend(
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
      err.orig.code.indexOf('perm/') === 0) {
      err = err.orig
      result[0] = err
    }

    err.details = err.details || {}
    err.details.plugin = err.details.plugin || {}

    var entry = actlog(
      actmeta, msg, origmsg,
      {
        // kind is act as this log entry relates to an action
        kind: 'act',
        case: 'ERR',
        duration: duration
      })
    entry = errlog(err, entry)

    instance.log.error(entry)
    instance.emit('act-err', msg, err)

    // when fatal$ is set, prefer to die instead
    if (so.errhandler && (!msg || !msg.fatal$)) {
      call_cb = !so.errhandler.call(instance, err)
    }

    return {
      call_cb: call_cb,
      err: err
    }
  }

  function callback_error (instance, err, actmeta, result, cb,
    duration, msg, origmsg, act_callpoint) {
    actmeta = actmeta || {}

    if (!err.seneca) {
      err = error(err, 'act_callback', _.extend(
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

    instance.log.error(actlog(
      actmeta, msg, origmsg,
      {
        // kind is act as this log entry relates to an action
        kind: 'act',
        case: 'ERR',
        info: err.message,
        code: err.code,
        err: err,
        duration: duration
      }))

    instance.emit('act-err', msg, err, result[1])

    if (so.errhandler) {
      so.errhandler.call(instance, err)
    }
  }


  function api_fix () {
    var self = this

    var defargs = Common.parsePattern(self, arguments)

    var fix = self.delegate(defargs.pattern)

    fix.add = function fix_add () {
      var args = Common.parsePattern(fix, arguments, 'rest:.*', defargs.pattern)
      var addargs = [args.pattern].concat(args.rest)
      return self.add.apply(fix, addargs)
    }

    return fix
  }


  function api_delegate (fixedargs) {
    var self = this
    fixedargs = fixedargs || {}

    var delegate = Object.create(self)
    delegate.private$ = Object.create(self.private$)

    delegate.did = refnid()

    var strdesc
    delegate.toString = function toString () {
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

    delegate.delegate = function delegate (further_fixedargs) {
      var args = _.extend({}, delegate.fixedargs, further_fixedargs || {})
      return self.delegate.call(this, args)
    }

    // Somewhere to put contextual data for this delegate.
    // For example, data for individual web requests.
    delegate.context = {}

    delegate.client = function client () {
      return self.client.apply(this, arguments)
    }

    delegate.listen = function listen () {
      return self.listen.apply(this, arguments)
    }

    return delegate
  }


  function api_options (options, chain) {
    var self = this

    if (options != null) {
      self.log.debug({
        kind: 'options',
        case: 'SET',
        options: options,
        callpoint: callpoint()})
    }

    so = private$.exports.options = ((options == null)
      ? private$.optioner.get()
      : private$.optioner.set(options))

    if (so.legacy.logging) {
      if (options && options.log && _.isArray(options.log.map)) {
        for (var i = 0; i < options.log.map.length; ++i) {
          self.logroute(options.log.map[i])
        }
      }
    }

    // Allow chaining with seneca.options({...}, true)
    // see https://github.com/rjrodger/seneca/issues/80
    return chain ? self : so
  }


  function api_error (errhandler) {
    this.options({ errhandler: errhandler })
    return this
  }


  // TODO: should set all system.close_signals to false
  function api_test (errhandler, logspec) {
    if ('function' !== typeof errhandler && null !== errhandler) {
      logspec = errhandler
      errhandler = null
    }

    this.options({
      errhandler: null === errhandler ? null : (errhandler || console.log),
      test: true,
      log: logspec || 'test'
    })

    private$.logger = load_logger(root, so.internal.logger)

    return this
  }

  // Inspired by https://github.com/hapijs/hapi/blob/master/lib/plugin.js decorate
  function api_decorate () {
    var args = Norma('property:s value:.', arguments)

    // TODO: review; needs to be more universally applicable
    // also messages should not be embedded directly
    var property = args.property
    Assert(property[0] !== '_', 'property cannot start with _')
    Assert(private$.decorations[property] === undefined, 'seneca is already decorated with the property')
    Assert(root[property] === undefined, 'cannot override a core seneca property: ' + property)

    root[property] = private$.decorations[property] = args.value
  }

  // DEPRECATED
  // for use with async
  root.next_act = function next_act () {
    var argsarr = new Array(arguments.length)
    for (var l = 0; l < argsarr.length; ++l) { argsarr[l] = arguments[l] }

    var si = this || root

    si.log.warn({
      kind: 'notice',
      case: 'DEPRECATION',
      notice: Errors.deprecation.seneca_next_act
    })


    return function (next) {
      argsarr.push(next)
      si.act.apply(si, argsarr)
    }
  }


  // TODO: follow api_ convention
  root.gate = function gate () {
    return this.delegate({gate$: true})
  }


  // TODO: follow api_ convention
  root.ungate = function ungate () {
    this.fixedargs.gate$ = false
    return this
  }


  // Add builtin actions.
  root.add({role: 'seneca', cmd: 'stats'}, action_seneca_stats)
  root.add({role: 'seneca', cmd: 'close'}, action_seneca_close)
  root.add({role: 'seneca', info: 'fatal'}, action_seneca_fatal)
  root.add({role: 'seneca', get: 'options'}, action_options_get)

  // Legacy builtin actions.
  // Remove in Seneca 4.x
  root.add({role: 'seneca', stats: true, deprecate$: true}, action_seneca_stats)
  root.add({role: 'options', cmd: 'get', deprecate$: true}, action_options_get)

  Print(root)

  // Define builtin actions.

  function action_seneca_fatal (args, done) {
    done()
  }

  function action_seneca_close (args, done) {
    this.emit('close')
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
      (args.summary == null) ||
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

  _.each(so.internal.close_signals, function (active, signal) {
    if (active) {
      process.once(signal, handleClose)
    }
  })

  function load_logger (instance, log_plugin) {
    log_plugin = log_plugin || require('./lib/logging')

    return log_plugin.preload.call(instance).extend.logger
  }

  function action_queue_clear () {
    root.emit('ready')

    var ready = root.private$.ready_list.shift()
    if (ready) {
      ready()
    }

    if (root.private$.ge.isclear()) {
      while (0 < root.private$.ready_list.length) {
        root.private$.ready_list.shift()()
      }
    }
  }

  return root
}


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


// Callpoint resolver. Indicates location in calling code.
function make_callpoint (active) {
  if (active) {
    return function () {
      return error.callpoint(
        new Error(),
        ['/seneca/seneca.js', '/seneca/lib/', '/lodash.js'])
    }
  }

  return _.noop
}


function make_log (instance, modifier) {
  var log = instance.log || function log (data) {
    instance.private$.logger(this, data)
  }

  log = prepare_log(instance, make_modified_log(log, modifier))
  make_log_levels(instance, log)

  return log
}

function prepare_log (instance, log) {
  return function prepare_log_data () {
    var argsarr = new Array(arguments.length)
    for (var l = 0; l < argsarr.length; ++l) { argsarr[l] = arguments[l] }

    var a0 = argsarr[0]
    var data = _.isArray(a0) ? a0
          : _.isObject(a0) ? a0
          : argsarr
    log.call(instance, data)
  }
}

function make_log_levels (instance, log) {
  function log_level (level) {
    return function (data) {
      data.level = level
    }
  }
  log.debug = prepare_log(instance, make_modified_log(log, log_level('debug')))
  log.info = prepare_log(instance, make_modified_log(log, log_level('info')))
  log.warn = prepare_log(instance, make_modified_log(log, log_level('warn')))
  log.error = prepare_log(instance, make_modified_log(log, log_level('error')))
  log.fatal = prepare_log(instance, make_modified_log(log, log_level('fatal')))
}

function make_modified_log (log, modifier) {
  return function log_modifier (data) {
    modifier(data)
    log.call(this, data)
  }
}

function default_log_modifier (data) {
  data.level = null == data.level ? 'debug' : data.level
  data.seneca = null == data.seneca ? root.id : data.seneca
  data.when = null == data.when ? Date.now() : data.when
}


function act_make_delegate (instance, msg, actmeta) {
  actmeta = actmeta || {}

  var delegate_args = {
    plugin$: {
      name: actmeta.plugin_name,
      tag: actmeta.plugin_tag
    }
  }

  var delegate = instance.delegate(delegate_args)

  // special overrides
  if (msg.meta$.tx) {
    delegate.fixedargs.tx$ = msg.meta$.tx
  }

  // automate actid log insertion

  delegate.log = make_log(delegate, function act_delegate_log_modifier (data) {
    data.actid = msg.meta$.id

    data.plugin_name = data.plugin_name || actmeta.plugin_name
    data.plugin_tag = data.plugin_tag || actmeta.plugin_tag
    data.pattern = data.pattern || actmeta.pattern
  })

  if (actmeta.priormeta) {
    // TODO: support Common.parsePattern
    delegate.prior = function (prior_msg, prior_cb) {
      prior_msg = _.clone(prior_msg)
      prior_msg.tx$ = msg.meta$.tx
      prior_msg.default$ = prior_msg.default$ || msg.default$

      delete prior_msg.id$
      delete prior_msg.gate$
      delete prior_msg.actid$
      delete prior_msg.meta$
      delete prior_msg.transport$

      prior_msg.meta$ = {}
      prior_msg.meta$.start = Date.now()
      prior_msg.meta$.sync = msg.meta$.sync

      prior_msg.meta$.prior = _.clone(msg.meta$.prior)
      prior_msg.meta$.prior.chain = _.clone(msg.meta$.prior.chain)
      prior_msg.meta$.prior.chain.push(actmeta.id)
      prior_msg.meta$.prior.entry = false
      prior_msg.meta$.prior.depth++

      var prior_action_ctxt = {
        actmeta: actmeta.priormeta,
        seneca: delegate
      }

      // TODO: handle inward result
      delegate.private$.inward.process(
        {tags: ['prior']},
        prior_action_ctxt,
        {msg: msg, reply: prior_cb})

      var pd = act_make_delegate(delegate, msg, actmeta.priormeta)
      actmeta.priormeta.func.call(pd, prior_msg, prior_cb.bind(pd))
    }

    delegate.parent = function (prior_msg, prior_cb) {
      delegate.log.warn({
        kind: 'notice',
        case: 'DEPRECATION',
        notice: Errors.deprecation.seneca_parent
      })
      delegate.prior(prior_msg, prior_cb)
    }
  }
  else {
    delegate.prior = function (msg, done) {
      var out = msg.default$ ? msg.default$ : null
      return done.call(delegate, null, out)
    }
  }

  return delegate
}
