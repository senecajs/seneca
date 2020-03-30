/* Copyright © 2010-2018 Richard Rodger and other contributors, MIT License. */
'use strict'

const Assert = require('assert')

var _ = require('lodash')
var Jsonic = require('jsonic')
var Norma = require('norma')

var Common = require('./common')
var Plugins = require('./plugins')

var errlog = Common.make_standard_err_log_entry

var intern = {}

exports.wrap = function (pin, actdef, wrapper) {
  var pinthis = this

  wrapper = 'function' === typeof actdef ? actdef : wrapper
  actdef = 'function' === typeof actdef ? {} : actdef

  pin = Array.isArray(pin) ? pin : [pin]
  Common.each(pin, function (p) {
    Common.each(pinthis.list(p), function (actpattern) {
      pinthis.add(actpattern, wrapper, actdef)
    })
  })

  return this
}

exports.fix = function (patargs, msgargs, custom) {
  var self = this

  patargs = Jsonic(patargs || {})

  var fix_delegate = self.delegate(patargs)

  fix_delegate.add = function fix_add() {
    return self.add.apply(
      this,
      intern.fix_args(arguments, patargs, msgargs, custom)
    )
  }

  fix_delegate.sub = function fix_sub() {
    return self.sub.apply(
      this,
      intern.fix_args(arguments, patargs, msgargs, custom)
    )
  }

  return fix_delegate
}

exports.options = function (options, chain) {
  var self = this
  var private$ = self.private$

  if (null == options) {
    return private$.optioner.get()
  }

  // self.log may not exist yet as .options() used during construction
  if (null != options && self.log) {
    self.log.debug({
      kind: 'options',
      case: 'SET',
      data: options,
    })
  }

  var out_opts = (private$.exports.options = private$.optioner.set(options))

  if ('string' === typeof options.tag) {
    var oldtag = self.root.tag
    self.root.tag = options.tag
    self.root.id =
      self.root.id.substring(0, self.root.id.indexOf('/' + oldtag)) +
      '/' +
      options.tag
  }

  // Update logging configuration
  if (null != options && options.log) {
    var logspec = private$.logging.build_log(self)
    out_opts = private$.exports.options = private$.optioner.set({
      log: logspec,
    })
  }

  // DEPRECATED
  if (out_opts.legacy.logging) {
    if (options && options.log && Array.isArray(options.log.map)) {
      for (var i = 0; i < options.log.map.length; ++i) {
        self.logroute(options.log.map[i])
      }
    }
  }

  // TODO: in 4.x, when given options, it should chain
  // Allow chaining with seneca.options({...}, true)
  // see https://github.com/rjrodger/seneca/issues/80
  return chain ? self : out_opts
}

// close seneca instance
// sets public seneca.closed property
exports.close = function (callpoint) {
  return function api_close(done) {
    var seneca = this

    if (null == done && false !== done) {
      return Common.promiser(intern.close.bind(seneca, callpoint))
    }

    return intern.close.call(seneca, callpoint, done)
  }
}

// Describe this instance using the form: Seneca/VERSION/ID
exports.toString = function () {
  return this.fullname
}

exports.seneca = function () {
  // Return self. Mostly useful as a check that this is a Seneca instance.
  return this
}

exports.explain = function (toggle) {
  if (true === toggle) {
    return (this.private$.explain = [])
  } else if (false === toggle) {
    var out = this.private$.explain
    delete this.private$.explain
    return out
  }
}

// Create a Seneca Error, OR set a global error handler function
exports.error = function (first) {
  if ('function' === typeof first) {
    this.options({ errhandler: first })
    return this
  } else {
    if (null == first) {
      throw this.util.error('no_error_code')
    }

    var plugin_fullname =
      this.fixedargs && this.fixedargs.plugin$ && this.fixedargs.plugin$.full

    var plugin =
      null != plugin_fullname
        ? this.private$.plugins[plugin_fullname]
        : this.context.plugin

    var error = null
    if (plugin && plugin.eraro && plugin.eraro.has(first)) {
      error = plugin.eraro.apply(this, arguments)
    } else {
      error = Common.eraro.apply(this, arguments)
    }

    return error
  }
}

// NOTE: plugin error codes are in their own namespaces
exports.fail = function (code, args) {
  var error = this.error(code, args)

  if (args && false === args.throw$) {
    return error
  } else {
    throw error
  }
}

exports.inward = function () {
  // TODO: norma should support f/x where x = # args
  var args = Norma('inward:f', arguments)
  this.private$.inward.add(args.inward)
  return this
}

exports.outward = function () {
  var args = Norma('outward:f', arguments)
  this.private$.outward.add(args.outward)
  return this
}

exports.prior = function () {
  if (null == this.private$.act) {
    // TODO: should be a top level api method: seneca.fail
    throw this.util.error('no_prior_action', { args: arguments })
  }

  // Get definition of prior action
  var priordef = this.private$.act.def.priordef

  var spec = Common.build_message(this, arguments, 'reply:f?', this.fixedargs)

  // TODO: clean sufficiently so that seneca.util.clean not needed
  var msg = spec.msg
  var reply = spec.reply

  if (priordef) {
    msg.prior$ = priordef.id
    this.act(msg, reply)
  } else {
    var meta = msg.meta$ || {}
    var out = _.clone(msg.default$ || meta.dflt || null)
    return reply.call(this, null, out, meta)
  }
}

// TODO: rename fixedargs
exports.delegate = function (fixedargs, fixedmeta) {
  var self = this
  var root = this.root
  var opts = this.options()

  fixedargs = fixedargs || {}
  fixedmeta = fixedmeta || {}

  var delegate = Object.create(self)

  delegate.private$ = Object.create(self.private$)

  delegate.did =
    (delegate.did ? delegate.did + '/' : '') + self.private$.didnid()

  function delegate_log() {
    return root.log.apply(delegate, arguments)
  }

  Object.assign(delegate_log, root.log)
  delegate_log.self = () => delegate

  var strdesc

  function delegate_toString() {
    if (strdesc) return strdesc
    var vfa = {}
    _.each(fixedargs, function (v, k) {
      if (~k.indexOf('$')) return
      vfa[k] = v
    })

    strdesc =
      self.toString() + (_.keys(vfa).length ? '/' + Jsonic.stringify(vfa) : '')

    return strdesc
  }

  var delegate_fixedargs = opts.strict.fixedargs
    ? Object.assign({}, fixedargs, self.fixedargs)
    : Object.assign({}, self.fixedargs, fixedargs)

  var delegate_fixedmeta = opts.strict.fixedmeta
    ? Object.assign({}, fixedmeta, self.fixedmeta)
    : Object.assign({}, self.fixedmeta, fixedmeta)

  function delegate_delegate(further_fixedargs, further_fixedmeta) {
    var args = Object.assign({}, delegate.fixedargs, further_fixedargs || {})
    var meta = Object.assign({}, delegate.fixedmeta, further_fixedmeta || {})
    return self.delegate.call(this, args, meta)
  }

  // Somewhere to put contextual data for this delegate.
  // For example, data for individual web requests.
  var delegate_context = Object.assign({}, self.context)

  // Prevents incorrect prototype properties in mocha test contexts
  Object.defineProperties(delegate, {
    log: { value: delegate_log, writable: true },
    toString: { value: delegate_toString, writable: true },
    fixedargs: { value: delegate_fixedargs, writable: true },
    fixedmeta: { value: delegate_fixedmeta, writable: true },
    delegate: { value: delegate_delegate, writable: true },
    context: { value: delegate_context, writable: true },
  })

  return delegate
}

exports.depends = function () {
  var self = this
  var private$ = this.private$
  var error = this.util.error
  var args = Norma('{pluginname:s deps:a? moredeps:s*}', arguments)

  var deps = args.deps || args.moredeps

  _.every(deps, function (depname) {
    if (
      !_.includes(private$.plugin_order.byname, depname) &&
      !_.includes(private$.plugin_order.byname, 'seneca-' + depname)
    ) {
      self.die(
        error('plugin_required', {
          name: args.pluginname,
          dependency: depname,
        })
      )
      return false
    } else return true
  })
}

exports.export = function (key) {
  var self = this
  var private$ = this.private$
  var error = this.util.error
  var opts = this.options()

  // Legacy aliases
  if (key === 'util') {
    key = 'basic'
  }

  var exportval = private$.exports[key]

  if (!exportval && opts.strict.exports) {
    return self.die(error('export_not_found', { key: key }))
  }

  return exportval
}

exports.quiet = function (flags) {
  flags = flags || {}

  var quiet_opts = {
    test: false,
    quiet: true,
    log: 'none',
    reload$: true,
  }

  var opts = this.options(quiet_opts)

  // An override from env or args is possible.
  // Only flip to test mode if called from test() method
  if (opts.test && 'test' !== flags.from) {
    return this.test()
  } else {
    this.private$.logging.build_log(this)

    return this
  }
}

exports.test = function (errhandler, logspec) {
  var opts = this.options()

  if ('-' != opts.tag) {
    this.root.id =
      null == opts.id$
        ? this.private$.actnid().substring(0, 4) + '/' + opts.tag
        : '' + opts.id$
  }

  if ('function' !== typeof errhandler && null !== errhandler) {
    logspec = errhandler
    errhandler = null
  }

  logspec = true === logspec || 'true' === logspec ? 'test' : logspec

  var test_opts = {
    errhandler: null == errhandler ? null : errhandler,
    test: true,
    quiet: false,
    reload$: true,
    log: logspec || 'test',
  }

  var set_opts = this.options(test_opts)

  // An override from env or args is possible.
  if (set_opts.quiet) {
    return this.quiet({ from: 'test' })
  } else {
    this.private$.logging.build_log(this)

    // Manually set logger to test_logger (avoids infecting options structure),
    // unless there was an external logger defined by the options
    if (!this.private$.logger.from_options$) {
      this.root.private$.logger = this.private$.logging.test_logger
    }

    return this
  }
}

// use('pluginname') - built-in, or provide calling code 'require' as seneca opt
// use(require('pluginname')) - plugin object, init will be called
// if first arg has property senecaplugin
exports.use = function (arg0, arg1, arg2) {
  var self = this

  // DEPRECATED: Remove when Seneca >= 4.x
  // Allow chaining with seneca.use('options', {...})
  // see https://github.com/rjrodger/seneca/issues/80
  if (arg0 === 'options') {
    self.options(arg1)
    return self
  }

  try {
    // Plugin definition function is under property `define`.
    // `init` is deprecated from 4.x
    // TODO: use-plugin expects `init` - update use-plugin to make this customizable
    if (null != arg0 && 'object' === typeof arg0) {
      arg0.init = arg0.define || arg0.init
    }

    // TODO: use-plugin needs better error message for malformed plugin desc
    var desc = self.private$.use.build_plugin_desc(arg0, arg1, arg2)

    if (this.private$.ignore_plugins[desc.full]) {
      this.log.info({
        kind: 'plugin',
        case: 'ignore',
        plugin_full: desc.full,
        plugin_name: desc.name,
        plugin_tag: desc.tag,
      })

      return self
    }

    var plugin = self.private$.use.use_plugin_desc(desc)

    self.register(plugin)
  } catch (e) {
    self.die(self.private$.error(e, 'plugin_' + e.code))
  }

  return self
}

exports.ping = function () {
  var now = Date.now()
  return {
    now: now,
    uptime: now - this.private$.stats.start,
    id: this.id,
    cpu: process.cpuUsage(),
    mem: process.memoryUsage(),
    act: this.private$.stats.act,
    tr: this.private$.transport.register.map(function (x) {
      return Object.assign({ when: x.when, err: x.err }, x.config)
    }),
  }
}

exports.translate = function (from_in, to_in, pick_in) {
  var from = 'string' === typeof from_in ? Jsonic(from_in) : from_in
  var to = 'string' === typeof to_in ? Jsonic(to_in) : to_in

  var pick = {}

  if ('string' === typeof pick_in) {
    pick_in = pick_in.split(/\s*,\s*/)
  }

  if (Array.isArray(pick_in)) {
    pick_in.forEach(function (prop) {
      if (prop.startsWith('-')) {
        pick[prop.substring(1)] = false
      } else {
        pick[prop] = true
      }
    })
  } else if ('object' === typeof pick_in) {
    pick = Object.assign({}, pick_in)
  } else {
    pick = null
  }

  this.add(from, function (msg, reply) {
    var pick_msg

    if (pick) {
      pick_msg = {}
      Object.keys(pick).forEach(function (prop) {
        if (pick[prop]) {
          pick_msg[prop] = msg[prop]
        }
      })
    } else {
      pick_msg = this.util.clean(msg)
    }

    var transmsg = Object.assign(pick_msg, to)
    this.act(transmsg, reply)
  })

  return this
}

exports.gate = function () {
  return this.delegate({ gate$: true })
}

exports.ungate = function () {
  this.fixedargs.gate$ = false
  return this
}

// TODO this needs a better name
exports.list_plugins = function () {
  return _.clone(this.private$.plugins)
}

exports.find_plugin = function (plugindesc, tag) {
  var plugin_key = Common.make_plugin_key(plugindesc, tag)
  return this.private$.plugins[plugin_key]
}

exports.has_plugin = function (plugindesc, tag) {
  var plugin_key = Common.make_plugin_key(plugindesc, tag)
  return !!this.private$.plugins[plugin_key]
}

exports.ignore_plugin = function (plugindesc, tag, ignore) {
  if ('boolean' === typeof tag) {
    ignore = tag
    tag = null
  }
  var plugin_key = Common.make_plugin_key(plugindesc, tag)
  var resolved_ignore = (this.private$.ignore_plugins[plugin_key] =
    null == ignore ? true : !!ignore)

  this.log.info({
    kind: 'plugin',
    case: 'ignore',
    full: plugin_key,
    ignore: resolved_ignore,
  })

  return this
}

// Find the action metadata for a given pattern, if it exists.
exports.find = function (pattern, flags) {
  var seneca = this

  var pat = _.isString(pattern) ? Jsonic(pattern) : pattern
  pat = seneca.util.clean(pat)
  pat = pat || {}

  var actdef = seneca.private$.actrouter.find(pat, flags && flags.exact)

  if (!actdef) {
    actdef = seneca.private$.actrouter.find({})
  }

  return actdef
}

// True if an action matching the pattern exists.
exports.has = function (pattern) {
  return !!this.find(pattern, { exact: true })
}

// List all actions that match the pattern.
exports.list = function (pattern) {
  return _.map(
    this.private$.actrouter.list(null == pattern ? {} : Jsonic(pattern)),
    'match'
  )
}

// Get the current status of the instance.
exports.status = function (flags) {
  flags = flags || {}

  var hist = this.private$.history.stats()
  hist.log = this.private$.history.list()

  var status = {
    stats: this.stats(flags.stats),
    history: hist,
    transport: this.private$.transport,
  }

  return status
}

// Reply to an action that is waiting for a result.
// Used by transports to decouple sending messages from receiving responses.
exports.reply = function (spec) {
  var instance = this
  var actctxt = null

  if (spec && spec.meta) {
    actctxt = instance.private$.history.get(spec.meta.id)
    if (actctxt) {
      actctxt.reply(spec.err, spec.out, spec.meta)
    }
  }

  return !!actctxt
}

// Listen for inbound messages.
exports.listen = function (callpoint) {
  return function api_listen() {
    var private$ = this.private$
    var argsarr = Array.prototype.slice.call(arguments)
    var self = this

    var done = _.last(argsarr)
    if (typeof done === 'function') {
      argsarr.pop()
    } else {
      done = _.noop
    }

    self.log.info({
      kind: 'listen',
      case: 'INIT',
      data: argsarr,
      callpoint: callpoint(true),
    })

    var opts = self.options().transport || {}
    var config = intern.resolve_config(intern.parse_config(argsarr), opts)

    self.act(
      'role:transport,cmd:listen',
      { config: config, gate$: true },
      function (err, result) {
        if (err) {
          return self.die(private$.error(err, 'transport_listen', config))
        }

        done(null, result)
        done = _.noop
      }
    )

    return self
  }
}

// Send outbound messages.
exports.client = function (callpoint) {
  return function api_client() {
    var private$ = this.private$
    var argsarr = Array.prototype.slice.call(arguments)
    var self = this

    self.log.info({
      kind: 'client',
      case: 'INIT',
      data: argsarr,
      callpoint: callpoint(true),
    })

    var legacy = self.options().legacy || {}
    var opts = self.options().transport || {}

    var raw_config = intern.parse_config(argsarr)

    // pg: pin group
    raw_config.pg = Common.pincanon(raw_config.pin || raw_config.pins)

    var config = intern.resolve_config(raw_config, opts)

    config.id = config.id || Common.pattern(raw_config)

    var pins =
      config.pins || (_.isArray(config.pin) ? config.pin : [config.pin || ''])

    pins = _.map(pins, function (pin) {
      return _.isString(pin) ? Jsonic(pin) : pin
    })

    var sd = Plugins.make_delegate(self, {
      // TODO: make this unique with a counter
      name: 'seneca_internal_client',
      tag: void 0,
    })

    var sendclient

    var transport_client = function transport_client(msg, reply, meta) {
      if (legacy.meta) {
        meta = meta || msg.meta$
      }

      // Undefined plugin init actions pass through here when
      // there's a catchall client, as they have local$:true
      if (meta.local) {
        this.prior(msg, reply)
      } else if (sendclient && sendclient.send) {
        if (legacy.meta) {
          msg.meta$ = meta
        }

        sendclient.send.call(this, msg, reply, meta)
      } else {
        this.log.error('no-transport-client', { config: config, msg: msg })
      }
    }

    transport_client.id = config.id

    if (config.makehandle) {
      transport_client.handle = config.makehandle(config)
    }

    _.each(pins, function (pin) {
      pin = _.clone(pin)

      // Override local actions, including those more specific than
      // the client pattern
      if (config.override) {
        sd.wrap(
          sd.util.clean(pin),
          { client_pattern: sd.util.pattern(pin) },
          transport_client
        )
      }

      pin.client$ = true
      pin.strict$ = { add: true }

      sd.add(pin, transport_client)
    })

    // Create client.
    sd.act(
      'role:transport,cmd:client',
      { config: config, gate$: true },
      function (err, liveclient) {
        if (err) {
          return sd.die(private$.error(err, 'transport_client', config))
        }

        if (null == liveclient) {
          return sd.die(
            private$.error('transport_client_null', Common.clean(config))
          )
        }

        sendclient = liveclient
      }
    )

    return self
  }
}

/*
// Subscribe to messages.
exports.sub = function() {
  var self = this
  //var private$ = self.private$
  var private_sub = self.private$.sub

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

  if (!private_sub.handler) {
    private_sub.handler = function handle_sub(msg, result, meta) {
      // only entry msg of prior chain is published
      if (meta && meta.prior) {
        return
      }

      var subfuncs = self.private$.subrouter.find(msg)

      if (subfuncs) {
        meta.sub = subfuncs.pattern
        var actdef = subfuncs.actdef

        _.each(subfuncs, function subfunc(subfunc) {
          try {
            for (
              var stI = 0, stlen = private_sub.tracers.length;
              stI < stlen;
              stI++
            ) {
              private_sub.tracers[stI].call(
                self,
                subfunc.instance$,
                msg,
                result,
                meta,
                actdef
              )
            }

            subfunc.call(subfunc.instance$, msg, result, meta)

            // TODO: this should in it's own function
          } catch (ex) {
            // TODO: not really satisfactory
            var err = self.private$.error(ex, 'sub_function_catch', {
              args: msg,
              result: result
            })
            self.log.error(
              errlog(err, {
                kind: 'sub',
                msg: msg,
                actid: meta.id
              })
            )
          }
        })
      }
    }

    // TODO: other cases

    // Subs are triggered via events
    self.on('act-in', annotate('in$', private_sub.handler))
    self.on('act-out', annotate('out$', private_sub.handler))
  }

  function annotate(prop, handle_sub) {
    return function annotation(origmsg, result, meta) {
      var msg = _.clone(origmsg)
      result = _.clone(result)
      msg[prop] = true
      handle_sub(msg, result, meta)
    }
  }

  var subs = self.private$.subrouter.find(pattern)
  if (!subs) {
    self.private$.subrouter.add(pattern, (subs = []))
    subs.pattern = Common.pattern(pattern)
    subs.actdef = self.find(pattern)
  }
  subs.push(subargs.action)
  subargs.action.instance$ = self

  return self
}
  */

// Inspired by https://github.com/hapijs/hapi/blob/master/lib/plugin.js decorate
// TODO: convert to plugin configuration, with standard errors
exports.decorate = function () {
  var args = Norma('property:s value:.', arguments)

  var property = args.property
  Assert(property[0] !== '_', 'property cannot start with _')
  Assert(
    this.private$.decorations[property] === undefined,
    'seneca is already decorated with the property: ' + property
  )
  Assert(
    this.root[property] === undefined,
    'cannot override a core seneca property: ' + property
  )

  this.root[property] = this.private$.decorations[property] = args.value
}

intern.parse_config = function (args) {
  var out = {}

  var config = _.compact(args)

  var arglen = config.length

  // TODO: use Joi for better error msgs

  if (arglen === 1) {
    if (_.isObject(config[0])) {
      out = _.clone(config[0])
    } else {
      out.port = parseInt(config[0], 10)
    }
  } else if (arglen === 2) {
    out.port = parseInt(config[0], 10)
    out.host = config[1]
  } else if (arglen === 3) {
    out.port = parseInt(config[0], 10)
    out.host = config[1]
    out.path = config[2]
  }

  return out
}

intern.resolve_config = function (config, options) {
  var out = _.clone(config)

  _.each(options, function (value, key) {
    if (_.isObject(value)) {
      return
    }
    out[key] = out[key] === void 0 ? value : out[key]
  })

  // Default transport is web
  out.type = out.type || 'web'

  // DEPRECATED: Remove in 4.0
  if (out.type === 'direct' || out.type === 'http') {
    out.type = 'web'
  }

  var base = options[out.type] || {}

  out = Object.assign({}, base, out)

  if (out.type === 'web' || out.type === 'tcp') {
    out.port = out.port == null ? base.port : out.port
    out.host = out.host == null ? base.host : out.host
    out.path = out.path == null ? base.path : out.path
  }

  return out
}

intern.close = function (callpoint, done) {
  var seneca = this
  var options = seneca.options()

  var done_called = false
  var safe_done = function safe_done(err) {
    if (!done_called && 'function' === typeof done) {
      done_called = true
      return done.call(seneca, err)
    }
  }

  // don't try to close twice
  if (seneca.flags.closed) {
    return safe_done()
  }

  seneca.ready(do_close)
  var close_timeout = setTimeout(do_close, options.close_delay)

  function do_close() {
    clearTimeout(close_timeout)

    if (seneca.flags.closed) {
      return safe_done()
    }

    // TODO: remove in 4.x
    seneca.closed = true

    seneca.flags.closed = true

    // cleanup process event listeners
    Common.each(options.system.close_signals, function (active, signal) {
      if (active) {
        process.removeListener(signal, seneca.private$.exit_close)
      }
    })

    seneca.log.debug({
      kind: 'close',
      notice: 'start',
      callpoint: callpoint(true),
    })

    seneca.act('role:seneca,cmd:close,closing$:true', function (err) {
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

      return safe_done(err)
    })
  }

  return seneca
}

intern.fix_args = function (origargs, patargs, msgargs, custom) {
  var args = Common.parsePattern(this, origargs, 'rest:.*', patargs)
  var fixargs = [args.pattern]
    .concat({
      fixed$: Object.assign({}, msgargs, args.pattern.fixed$),
      custom$: Object.assign({}, custom, args.pattern.custom$),
    })
    .concat(args.rest)
  return fixargs
}
