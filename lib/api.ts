/* Copyright © 2010-2023 Richard Rodger and other contributors, MIT License. */

import { MakeArgu, Any, Check, Rest, Skip, One, Empty } from 'gubu'

import {
  each,
  make_standard_err_log_entry,
  make_callpoint,
  promiser,
  error as common_error,
  make_plugin_key,
  pincanon,
  pattern,
  clean,
  jsonic_stringify,
  parse_jsonic,
} from './common'


const Argu = MakeArgu('seneca')

const errlog = make_standard_err_log_entry

const intern: any = {}


function wrap(this: any, pin: any, actdef: any, wrapper: any) {
  const pinthis = this

  wrapper = 'function' === typeof actdef ? actdef : wrapper
  actdef = 'function' === typeof actdef ? {} : actdef

  pin = Array.isArray(pin) ? pin : [pin]
  each(pin, function(p: any) {
    each(pinthis.list(p), function(actpattern: any) {
      pinthis.add(actpattern, wrapper, actdef)
    })
  })

  return this
}


function fix(this: any, patargs: any, msgargs: any, custom: any) {
  const self = this

  patargs = self.util.Jsonic(patargs || {})

  const fix_delegate = self.delegate(patargs)

  // TODO: attach msgargs and custom to delegate.private$ in some way for debugging

  // TODO: this is very brittle. Use a directive instead. 
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


function options(this: any, options: any, chain: any) {
  const self = this
  const private$ = self.private$

  if (null == options) {
    return private$.optioner.get()
  }

  // self.log may not exist yet as .options() used during construction
  if (self.log) {
    self.log.debug({
      kind: 'options',
      case: 'SET',
      data: options,
    })
  }

  let out_opts = (private$.exports.options = private$.optioner.set(options))

  if ('string' === typeof options.tag) {
    const oldtag = self.root.tag
    self.root.tag = options.tag
    self.root.id =
      self.root.id.substring(0, self.root.id.indexOf('/' + oldtag)) +
      '/' +
      options.tag
  }

  // Update logging configuration
  if (options.log) {
    const logspec = private$.logging.build_log(self)
    out_opts = private$.exports.options = private$.optioner.set({
      log: logspec,
    })
  }

  // Update callpoint
  if (out_opts.debug.callpoint) {
    private$.callpoint = make_callpoint(out_opts.debug.callpoint)
  }

  // DEPRECATED
  if (out_opts.legacy.logging) {
    if (options && options.log && Array.isArray(options.log.map)) {
      for (let i = 0; i < options.log.map.length; ++i) {
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
function close(callpoint: any) {
  return function api_close(this: any, done: any) {
    const seneca = this

    if (false !== done && null == done) {
      return promiser(intern.close.bind(seneca, callpoint))
    }

    return intern.close.call(seneca, callpoint, done)
  }
}


// Describe this instance using the form: Seneca/VERSION/ID
function toString(this: any) {
  return this.fullname
}


function seneca(this: any) {
  // Return self. Mostly useful as a check that this is a Seneca instance.
  return this
}


function explain(this: any, toggle: any) {
  if (true === toggle) {
    return (this.private$.explain = [])
  } else if (false === toggle) {
    const out = this.private$.explain
    delete this.private$.explain
    return out
  }
}


// Create a Seneca Error, OR set a global error handler function
function error(this: any, first: any) {
  if ('function' === typeof first) {
    this.options({ errhandler: first })
    return this
  }
  else {
    if (null == first) {
      throw this.util.error('no_error_code')
    }

    const plugin_fullname =
      this.fixedargs && this.fixedargs.plugin$ && this.fixedargs.plugin$.full

    const plugin =
      null != plugin_fullname
        ? this.private$.plugins[plugin_fullname]
        : this.context.plugin

    let err = null
    if (plugin && plugin.eraro && plugin.eraro.has(first)) {
      err = plugin.eraro.apply(this, arguments)
    }
    else {
      err = common_error.apply(this, arguments)
    }

    return err
  }
}


// NOTE: plugin error codes are in their own namespaces
function fail(this: any, ...args: any[]) {
  if (args.length <= 2) {
    return failIf(this, true, args[0], args[1])
  }

  if (args.length === 3) {
    return failIf(this, args[0], args[1], args[2])
  }

  throw this.util.error('fail_wrong_number_of_args', { num_args: args.length })

  function failIf(self: any, cond: any, code: any, args: any) {
    if (typeof cond !== 'boolean') {
      throw self.util.error('fail_cond_must_be_bool')
    }

    if (!cond) {
      return
    }

    const error = self.error(code, args)

    if (args && false === args.throw$) {
      return error
    } else {
      throw error
    }
  }
}


function inward(this: any) {
  const args = Argu(arguments, { inward: Function })
  this.root.order.inward.add(args.inward)
  return this
}


function outward(this: any) {
  const args = Argu(arguments, { outward: Function })
  this.root.order.outward.add(args.outward)
  return this
}


// TODO: rename fixedargs
function delegate(this: any, fixedargs: any, fixedmeta: any) {
  const self = this
  const root = this.root
  const opts = this.options()

  fixedargs = fixedargs || {}
  fixedmeta = fixedmeta || {}

  const delegate = Object.create(self)

  delegate.private$ = Object.create(self.private$)

  delegate.did =
    (delegate.did ? delegate.did + '/' : '') + self.private$.didnid()

  function delegate_log() {
    return root.log.apply(delegate, arguments)
  }

  Object.assign(delegate_log, root.log)
  delegate_log.self = () => delegate

  let strdesc: any

  function delegate_toString() {
    if (strdesc) return strdesc
    const vfa: any = {}
    Object.keys(fixedargs).forEach((k) => {
      const v = fixedargs[k]
      if (~k.indexOf('$')) return
      vfa[k] = v
    })

    strdesc =
      self.toString() +
      (Object.keys(vfa).length ? '/' + jsonic_stringify(vfa) : '')

    return strdesc
  }

  const delegate_fixedargs = opts.strict.fixedargs
    ? Object.assign({}, fixedargs, self.fixedargs)
    : Object.assign({}, self.fixedargs, fixedargs)

  const delegate_fixedmeta = opts.strict.fixedmeta
    ? Object.assign({}, fixedmeta, self.fixedmeta)
    : Object.assign({}, self.fixedmeta, fixedmeta)

  function delegate_delegate(
    this: any,
    further_fixedargs: any,
    further_fixedmeta: any
  ) {
    const args = Object.assign({}, delegate.fixedargs, further_fixedargs || {})
    const meta = Object.assign({}, delegate.fixedmeta, further_fixedmeta || {})
    return self.delegate.call(this, args, meta)
  }

  // Somewhere to put contextual data for this delegate.
  // For example, data for individual web requests.
  const delegate_context = Object.assign({}, self.context)

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


// TODO: should be a configuration param so we can handle plugin name resolution
function depends(this: any) {
  const self = this
  const private$ = this.private$
  const error = this.util.error

  const args = Argu(arguments, {
    pluginname: String,
    deps: Skip([String]),
    moredeps: Rest(String),
  })

  const deps = args.deps || args.moredeps || []

  for (let i = 0; i < deps.length; i++) {
    const depname = deps[i]

    if (
      !private$.plugin_order.byname.includes(depname) &&
      !private$.plugin_order.byname.includes('seneca-' + depname)
    ) {
      self.die(
        error('plugin_required', {
          name: args.pluginname,
          dependency: depname,
        })
      )
      break
    }
  }
}


function export$(this: any, key: any) {
  const self = this
  const private$ = this.private$
  const error = this.util.error
  const opts = this.options()

  // Legacy aliases
  if (key === 'util') {
    key = 'basic'
  }

  const exportval = private$.exports[key]

  if (!exportval && opts.strict.exports) {
    return self.die(error('export_not_found', { key: key }))
  }

  return exportval
}


function quiet(this: any, flags: any) {
  flags = flags || {}

  const quiet_opts = {
    test: false,
    quiet: true,
    log: 'none',
    reload$: true, // TODO: obsolete?
  }

  const opts = this.options(quiet_opts)

  // An override from env or args is possible.
  // Only flip to test mode if called from test() method
  if (opts.test && 'test' !== flags.from) {
    return this.test()
  } else {
    this.private$.logging.build_log(this)

    return this
  }
}


function test(this: any, errhandler: any, logspec: any) {
  const opts = this.options()

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

  const test_opts = {
    errhandler: null == errhandler ? null : errhandler,
    test: true,
    quiet: false,
    reload$: true, // TODO: obsolete?
    log: logspec || 'test',
    debug: { callpoint: true },
  }

  const set_opts = this.options(test_opts)

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


function ping(this: any) {
  const now = Date.now()
  return {
    now: now,
    uptime: now - this.private$.stats.start,
    id: this.id,
    cpu: process.cpuUsage(),
    mem: process.memoryUsage(),
    act: this.private$.stats.act,
    tr: this.private$.transport.register.map(function(x: any) {
      return Object.assign({ when: x.when, err: x.err }, x.config)
    }),
  }
}


function translate(
  this: any,
  from_in: any,
  to_in: any,
  pick_in?: any,
  flags?: {
    add?: boolean
  }
) {
  const from = 'string' === typeof from_in ? this.util.Jsonic(from_in) : from_in
  const to = 'string' === typeof to_in ? this.util.Jsonic(to_in) : to_in

  let pick: any = {}

  if ('string' === typeof pick_in) {
    pick_in = pick_in.split(/\s*,\s*/)
  }
  if (Array.isArray(pick_in)) {
    pick_in.forEach(function(prop) {
      if (prop.startsWith('-')) {
        pick[prop.substring(1)] = false
      } else {
        pick[prop] = true
      }
    })
  } else if (pick_in && 'object' === typeof pick_in) {
    pick = Object.assign({}, pick_in)
  } else {
    pick = null
  }

  let translate = function(msg: any) {
    let pick_msg: any

    if (pick) {
      pick_msg = {}
      Object.keys(pick).forEach(function(prop) {
        if (pick[prop]) {
          pick_msg[prop] = msg[prop]
        }
      })
    }
    else {
      pick_msg = clean(msg)
    }

    let transmsg = Object.assign(pick_msg, to)

    for (let pn in transmsg) {
      if (null == transmsg[pn]) {
        delete transmsg[pn]
      }
    }

    return transmsg
  }

  this.private$.translationrouter.add(from, translate)


  let translation_action = function(this: any, msg: any, reply: any) {
    let transmsg = translate(msg)
    this.act(transmsg, reply)
  }

  Object.defineProperty(translation_action, 'name', {
    value: 'translation__' + jsonic_stringify(from) + '__' + jsonic_stringify(to)
  })

  from.translate$ = false
  this.add(from, translation_action)

  return this
}


function gate(this: any) {
  return this.delegate({ gate$: true })
}


function ungate(this: any) {
  this.fixedargs.gate$ = false
  return this
}


// TODO this needs a better name
function list_plugins(this: any) {
  return Object.assign({}, this.private$.plugins)
}


function find_plugin(this: any, plugindesc: any, tag: any) {
  const plugin_key = make_plugin_key(plugindesc, tag)
  return this.private$.plugins[plugin_key]
}


function has_plugin(this: any, plugindesc: any, tag: any) {
  const plugin_key = make_plugin_key(plugindesc, tag)
  return !!this.private$.plugins[plugin_key]
}


function ignore_plugin(this: any, plugindesc: any, tag: any, ignore: any) {
  if ('boolean' === typeof tag) {
    ignore = tag
    tag = null
  }
  const plugin_key = make_plugin_key(plugindesc, tag)
  const resolved_ignore = (this.private$.ignore_plugins[plugin_key] =
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
function find(this: any, pattern: any, flags: any) {
  const seneca = this

  let pat = 'string' === typeof pattern ? seneca.util.Jsonic(pattern) : pattern
  pat = seneca.util.clean(pat)
  pat = pat || {}

  let actdef = seneca.private$.actrouter.find(pat, flags && flags.exact)

  if (!actdef) {
    actdef = seneca.private$.actrouter.find({})
  }

  return actdef
}


// True if an action matching the pattern exists.
function has(this: any, pattern: any) {
  return !!this.find(pattern, { exact: true })
}


// List all actions that match the pattern.
function list(this: any, pattern: any) {
  return this.private$.actrouter
    .list(null == pattern ? {} : this.util.Jsonic(pattern))
    .map((x: any) => x.match)
}


// Get the current status of the instance.
function status(this: any, flags: any) {
  flags = flags || {}

  const hist = this.private$.history.stats()
  hist.log = this.private$.history.list()

  const status = {
    stats: this.stats(flags.stats),
    history: hist,
    transport: this.private$.transport,
  }

  return status
}


// Reply to an action that is waiting for a result.
// Used by transports to decouple sending messages from receiving responses.
function reply(this: any, spec: any) {
  const instance = this
  let actctxt = null

  if (spec && spec.meta) {
    actctxt = instance.private$.history.get(spec.meta.id)
    if (actctxt) {
      actctxt.reply(spec.err, spec.out, spec.meta)
    }
  }

  return !!actctxt
}


// Listen for inbound messages.
function listen(this: any, callpoint: any) {
  return function api_listen(this: any, ...argsarr: any[]) {
    const private$ = this.private$
    const self = this

    let done = argsarr[argsarr.length - 1]
    if (typeof done === 'function') {
      argsarr.pop()
    }
    else {
      done = () => { }
    }

    self.log.info({
      kind: 'listen',
      case: 'INIT',
      data: argsarr,
      callpoint: callpoint(true),
    })

    const opts = self.options().transport || {}
    const config = intern.resolve_config(intern.parse_config(argsarr), opts)

    self.act(
      'role:transport,cmd:listen',
      { config: config, gate$: true },
      function(err: any, result: any) {
        if (err) {
          return self.die(private$.error(err, 'transport_listen', config))
        }

        done(null, result)
        done = () => { }
      }
    )

    return self
  }
}


// Send outbound messages.
function client(this: any, callpoint: any) {
  return function api_client(this: any) {
    const private$ = this.private$
    const argsarr = Array.prototype.slice.call(arguments)
    const self = this

    self.log.info({
      kind: 'client',
      case: 'INIT',
      data: argsarr,
      callpoint: callpoint(true),
    })

    const legacy = self.options().legacy || {}
    const opts = self.options().transport || {}

    const raw_config = intern.parse_config(argsarr)

    // pg: pin group
    raw_config.pg = pincanon(raw_config.pin || raw_config.pins)

    const config = intern.resolve_config(raw_config, opts)

    config.id = config.id || pattern(raw_config)

    let pins =
      config.pins ||
      (Array.isArray(config.pin) ? config.pin : [config.pin || ''])

    pins = pins.map((pin: any) => {
      return 'string' === typeof pin ? self.util.Jsonic(pin) : pin
    })

    // TODO: review - this feels like a hack
    // perhaps we should instantiate a virtual plugin to represent the client?
    // ... but is this necessary at all?
    const task_res = self.order.plugin.task.delegate.exec({
      ctx: {
        seneca: self,
      },
      data: {
        plugin: {
          // TODO: make this unique with a counter
          name: 'seneca_internal_client',
          tag: void 0,
        },
      },
    })

    const sd = task_res.out.delegate

    let sendclient: any

    const transport_client: any =
      function transport_client(this: any, msg: any, reply: any, meta: any) {
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

    pins.forEach((pin: any) => {
      pin = Object.assign({}, pin)

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
      function(err: any, liveclient: any) {
        if (err) {
          return sd.die(private$.error(err, 'transport_client', config))
        }

        if (null == liveclient) {
          return sd.die(
            private$.error('transport_client_null', clean(config))
          )
        }

        sendclient = liveclient
      }
    )

    return self
  }
}


function decorate(this: any) {
  let args = Argu(arguments, {
    property: Check(/^[^_]/, String)
      .Fault('Decorate property cannot start with underscore (was $VALUE)'),
    value: Any()
  })

  let property = args.property

  if (this.private$.decorations[property]) {
    throw new Error('seneca: Decoration already exists: ' + property)
  }
  if (this.root[property]) {
    throw new Error('seneca: Decoration overrides core property:' + property)
  }

  this.root[property] = this.private$.decorations[property] = args.value
}


function prepare(this: any, prepareAction: Function) {
  if (null == prepareAction || 'function' != typeof prepareAction) {
    throw new Error('seneca: first argument to prepare must be a function')
  }

  async function prepare_wrapper(this: any, msg: any) {
    await prepareAction.call(this, msg)
    return this.prior(msg)
  }

  if ('' != prepareAction.name) {
    Object.defineProperty(prepare_wrapper, 'name', {
      value: 'prepare_' + prepareAction.name,
    })
  }

  const plugin = this.plugin

  let pat = {
    role: 'seneca',
    plugin: 'init',
    init: plugin.name,
    tag: undefined,
  }

  if (null != plugin.tag && '-' != plugin.tag) {
    pat.tag = plugin.tag
  }

  this.message(pat, prepare_wrapper)

  this.plugin.prepare = this.plugin.prepare || []
  this.plugin.prepare.push(prepareAction)

  return this
}


function destroy(this: any, destroyAction: any) {
  async function destroy_wrapper(this: any, msg: any) {
    await destroyAction.call(this, msg)
    return this.prior(msg)
  }

  if ('' != destroyAction.name) {
    Object.defineProperty(destroy_wrapper, 'name', {
      value: 'destroy_' + destroyAction.name,
    })
  }

  this.message('role:seneca,cmd:close', destroy_wrapper)

  this.plugin.destroy = this.plugin.destroy || []
  this.plugin.destroy.push(destroyAction)

  return this
}





intern.parse_config = function(args: any) {
  let out: any = {}

  const config = args.filter((x: any) => null != x)

  const arglen = config.length

  // TODO: use Gubu for better error msgs

  if (arglen === 1) {
    if (config[0] && 'object' === typeof config[0]) {
      out = Object.assign({}, config[0])
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


intern.resolve_config = function(config: any, options: any) {
  let out = Object.assign({}, config)

  Object.keys(options).forEach((key) => {
    const value = options[key]
    if (value && 'object' === typeof value) {
      return
    }
    out[key] = out[key] === void 0 ? value : out[key]
  })

  // Default transport is web
  out.type = out.type || 'web'

  const base = options[out.type] || {}

  out = Object.assign({}, base, out)

  if (out.type === 'web' || out.type === 'tcp') {
    out.port = out.port == null ? base.port : out.port
    out.host = out.host == null ? base.host : out.host
    out.path = out.path == null ? base.path : out.path
  }

  return out
}


intern.close = function(this: any, callpoint: any, done: any) {
  const seneca = this
  const options = seneca.options()

  let done_called = false
  const safe_done: any = function safe_done(err: any) {
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
  const close_timeout = setTimeout(do_close, options.close_delay)

  function do_close() {
    clearTimeout(close_timeout)

    if (seneca.flags.closed) {
      return safe_done()
    }

    // TODO: remove in 4.x
    seneca.closed = true

    seneca.flags.closed = true

    // cleanup process event listeners
    each(options.system.close_signals, function(active: any, signal: any) {
      if (active) {
        process.removeListener(signal, seneca.private$.exit_close)
      }
    })

    seneca.log.debug({
      kind: 'close',
      notice: 'start',
      callpoint: callpoint(true),
    })

    seneca.act('role:seneca,cmd:close,closing$:true', function(err: any) {
      seneca.log.debug(errlog(err, { kind: 'close', notice: 'end' }))

      seneca.removeAllListeners('act-in')
      seneca.removeAllListeners('act-out')
      seneca.removeAllListeners('act-err')
      seneca.removeAllListeners('pin')
      seneca.removeAllListeners('after-pin')
      seneca.removeAllListeners('ready')

      // Seneca 4 variant
      seneca.removeAllListeners('act-err-4')

      seneca.private$.history.close()

      if (seneca.private$.status_interval) {
        clearInterval(seneca.private$.status_interval)
      }

      return safe_done(err)
    })
  }

  return seneca
}


const FixArgu: any = Argu('fix', {
  props: One(Empty(String), Object),
  moreprops: Skip(Object),
  rest: Rest(Any()),
})


// TODO; this should happen inside .add using a directive
intern.fix_args =
  function(this: any, origargs: any, patargs: any, msgargs: any, custom: any) {
    const args = FixArgu(origargs)

    args.pattern = Object.assign(
      {},
      args.moreprops ? args.moreprops : null,
      'string' === typeof args.props ?
        parse_jsonic(args.props, 'add_string_pattern_syntax') :
        args.props,
      patargs,
    )

    const fixargs = [args.pattern]
      .concat({
        fixed$: Object.assign({}, msgargs, args.pattern.fixed$),
        custom$: Object.assign({}, custom, args.pattern.custom$),
      })
      .concat(args.rest)

    return fixargs
  }




let API = {
  wrap,
  fix,
  options,
  close,
  toString,
  seneca,
  explain,
  error,
  fail,
  inward,
  outward,
  delegate,
  depends,
  export: export$,
  quiet,
  test,
  ping,
  translate,
  gate,
  ungate,
  list_plugins,
  find_plugin,
  has_plugin,
  ignore_plugin,
  find,
  has,
  list,
  status,
  reply,
  listen,
  client,
  decorate,
  prepare,
  destroy,
}


export { API }
