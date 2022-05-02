/* Copyright © 2010-2022 Richard Rodger and other contributors, MIT License. */
'use strict'


import Util from 'util'


import Errors from './errors'


const Stringify = require('fast-safe-stringify')
const Eraro = require('eraro')
const Jsonic = require('jsonic')
const Nid = require('nid')
const Norma = require('norma')
const DefaultsDeep = require('lodash.defaultsdeep')

const { Print } = require('./print')




// TODO: make more useful by including more context - plugin, msg, etc
const error =
  (exports.error =
    exports.eraro =
    Eraro({
      package: 'seneca',
      msgmap: Errors,
      override: true,
    }))


function promiser(context: any, callback: any) {
  if ('function' === typeof context && null == callback) {
    callback = context
  } else {
    callback = callback.bind(context)
  }

  return new Promise((resolve, reject) => {
    callback((err: any, out: any) => {
      return err ? reject(err) : resolve(out)
    })
  })
}


function stringify() {
  return Stringify(...arguments)
}


function wrap_error(err: any) {
  if (err.seneca) {
    throw err
  } else {
    throw error.call(null, ...arguments)
  }
}


function make_plugin_key(plugin: any, origtag: any) {
  if (null == plugin) {
    throw error('missing_plugin_name')
  }

  let name = null == plugin.name ? plugin : plugin.name
  let tag = null == plugin.tag ? (null == origtag ? '' : origtag) : plugin.tag

  if ('number' === typeof name) {
    name = '' + name
  }

  if ('number' === typeof tag) {
    tag = '' + tag
  }

  if ('' == name || 'string' !== typeof name) {
    throw error('bad_plugin_name', { name: name })
  }

  let m = name.match(/^([a-zA-Z@][a-zA-Z0-9.~_\-/]*)\$([a-zA-Z0-9.~_-]+)$/)
  if (m) {
    name = m[1]
    tag = m[2]
  }

  // Allow file paths, but ...
  if (!name.match(/^(\.|\/|\\|\w:)/)) {
    // ... anything else should be well-formed
    if (!name.match(/^[a-zA-Z@][a-zA-Z0-9.~_\-/]*$/) || 1024 < name.length) {
      throw error('bad_plugin_name', { name: name })
    }
  }

  if ('' != tag && (!tag.match(/^[a-zA-Z0-9.~_-]+$/) || 1024 < tag.length)) {
    throw error('bad_plugin_tag', { tag: tag })
  }

  let key = name + (tag ? '$' + tag : '')

  return key
}


function boolify(v: any) {
  try {
    return !!JSON.parse(v)
  } catch (e) {
    return false
  }
}


const tagnid = Nid({ length: 3, alphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' })


function parse_jsonic(str: any, code: any) {
  code = code || 'bad_jsonic'

  try {
    return null == str ? null : Jsonic(str)
  } catch (e: any) {
    let col = 1 === e.line ? e.column - 1 : e.column
    throw error(code, {
      argstr: str,
      syntax: e.message,
      line: e.line,
      col: col,
    })
  }
}


// string args override object args
// TODO: fix name

function parse_pattern(
  instance: any,
  rawargs: any,
  normaspec: any,
  fixed?: any
) {
  let args = Norma(
    '{strargs:s? objargs:o? moreobjargs:o? ' + (normaspec || '') + '}',
    rawargs
  )

  // Precedence of arguments in add,act is left-to-right
  args.pattern = Object.assign(
    {},
    args.moreobjargs ? args.moreobjargs : null,
    args.objargs ? args.objargs : null,
    parse_jsonic(args.strargs, 'add_string_pattern_syntax'),
    fixed
  )

  return args
}

const parsePattern = parse_pattern


function build_message(
  instance: any,
  rawargs: any,
  normaspec: any,
  fixed: any
) {
  let args = Norma(
    '{strargs:s? objargs:o? moreobjargs:o? ' + (normaspec || '') + '}',
    rawargs
  )

  // Precedence of arguments in add,act is left-to-right
  args.msg = Object.assign(
    {},
    args.moreobjargs,
    args.objargs,
    parse_jsonic(args.strargs, 'msg_jsonic_syntax'),
    fixed
  )

  return args
}

// Convert pattern object into a normalized jsonic String.
function pattern(patobj: any) {
  if ('string' === typeof patobj) {
    return patobj
  }

  patobj = patobj || {}
  let sb: any = []

  Object.keys(patobj).forEach((k) => {
    let v = patobj[k]
    if (!~k.indexOf('$') && 'function' != typeof v && 'object' != typeof v) {
      sb.push(k + ':' + v)
    }
  })

  sb.sort()

  return sb.join(',')
}


function pincanon(inpin: any) {
  if ('string' == typeof inpin) {
    return pattern(Jsonic(inpin))
  } else if (Array.isArray(inpin)) {
    let pin: any = inpin.map(pincanon)
    pin.sort()
    return pin.join(';')
  } else {
    return pattern(inpin)
  }
}


function noop() { }


// remove any props containing $
function clean(obj: any, opts?: any) {
  if (null == obj) return obj

  let out: any = Array.isArray(obj) ? [] : {}

  let pn = Object.getOwnPropertyNames(obj)
  for (let i = 0; i < pn.length; i++) {
    let p = pn[i]

    if ('$' != p[p.length - 1]) {
      out[p] = obj[p]
    }
  }

  return out
}


// rightmost wins
function deep(...argsarr: any) {
  // Lodash uses the reverse order to apply defaults than the deep API.
  argsarr = argsarr.reverse()

  // Add an empty object to the front of the args.  Defaults will be written
  // to this empty object.
  argsarr.unshift({})

  return DefaultsDeep.apply(null, argsarr)
}


// Print action result
const print = Print.print


// Iterate over arrays or objects
function each(collect: any, func: any) {
  if (null == collect || null == func) {
    return null
  }

  if (Array.isArray(collect)) {
    return collect.forEach(func)
  } else {
    Object.keys(collect).forEach((k) => func(collect[k], k))
  }
}


function makedie(instance: any, ctxt: any) {
  ctxt = Object.assign(ctxt, instance.die ? instance.die.context : {})

  let diecount = 0

  let die = function(this: any, err: any) {
    let so = instance.options()
    let test = so.test

    // undead is only for testing, do not use in production
    let undead = (so.debug && so.debug.undead) || (err && err.undead)
    let full =
      (so.debug && so.debug.print && 'full' === so.debug.print.fatal) || false
    let print_env = (so.debug && so.debug.print.env) || false

    if (0 < diecount) {
      if (!undead) {
        throw error(err, '[DEATH LOOP] die count: ' + diecount)
      }
      return
    } else {
      diecount++
    }

    try {
      if (!err) {
        err = new Error('unknown')
      } else if (!Util.isError(err)) {
        err = new Error('string' === typeof err ? err : Util.inspect(err))
      }

      err.fatal$ = true

      let logdesc = {
        kind: ctxt.txt || 'fatal',
        level: ctxt.level || 'fatal',
        plugin: ctxt.plugin,
        tag: ctxt.tag,
        id: ctxt.id,
        code: err.code || 'fatal',
        notice: err.message,
        err: err,
        callpoint: ctxt.callpoint && ctxt.callpoint(),
      }

      instance.log.fatal(logdesc)

      let stack = err.stack || ''
      stack = stack
        .substring(stack.indexOf('\n') + 5)
        .replace(/\n\s+/g, '\n               ')

      let procdesc =
        'pid=' +
        process.pid +
        ', arch=' +
        process.arch +
        ', platform=' +
        process.platform +
        (!full ? '' : ', path=' + process.execPath) +
        ', argv=' +
        Util.inspect(process.argv).replace(/\n/g, '') +
        (!full
          ? ''
          : !print_env
            ? ''
            : ', env=' + Util.inspect(process.env).replace(/\n/g, ''))

      let when = new Date()

      let clean_details = null

      let stderrmsg =
        '\n\n' +
        '=== SENECA FATAL ERROR ===' +
        '\nMESSAGE   :::  ' +
        err.message +
        '\nCODE      :::  ' +
        err.code +
        '\nINSTANCE  :::  ' +
        instance.toString() +
        '\nDETAILS   :::  ' +
        Util.inspect(
          full
            ? err.details
            : ((clean_details = clean(err.details) || {}),
              delete clean_details.instance,
              clean_details),
          { depth: so.debug.print.depth }
        ).replace(/\n/g, '\n               ') +
        '\nSTACK     :::  ' +
        stack +
        '\nWHEN      :::  ' +
        when.toISOString() +
        ', ' +
        when.getTime() +
        '\nLOG       :::  ' +
        Jsonic.stringify(logdesc) +
        '\nNODE      :::  ' +
        process.version +
        ', ' +
        process.title +
        (!full
          ? ''
          : ', ' +
          Util.inspect(process.versions).replace(/\s+/g, ' ') +
          ', ' +
          Util.inspect(process.features).replace(/\s+/g, ' ') +
          ', ' +
          Util.inspect((process as any).moduleLoadList).replace(/\s+/g, ' ')) +
        '\nPROCESS   :::  ' +
        procdesc +
        '\nFOLDER    :::  ' +
        process.env.PWD

      if (so.errhandler) {
        so.errhandler.call(instance, err)
      }

      if (instance.flags.closed) {
        return
      }

      if (!undead) {
        instance.act('role:seneca,info:fatal,closing$:true', { err: err })

        instance.close(
          // terminate process, err (if defined) is from seneca.close
          function(close_err: any) {
            if (!undead) {
              process.nextTick(function() {
                if (close_err) {
                  instance.log.fatal({
                    kind: 'close',
                    err: Util.inspect(close_err),
                  })
                }

                if (test) {
                  if (close_err) {
                    Print.internal_err(close_err)
                  }

                  Print.internal_err(stderrmsg)
                  Print.internal_err(
                    '\nSENECA TERMINATED at ' +
                    new Date().toISOString() +
                    '. See above for error report.\n'
                  )
                }

                so.system.exit(1)
              })
            }
          }
        )
      }

      // make sure we close down within options.death_delay seconds
      if (!undead) {
        let killtimer = setTimeout(function() {
          instance.log.fatal({ kind: 'close', timeout: true })

          if (so.test) {
            Print.internal_err(stderrmsg)
            Print.internal_err(
              '\n\nSENECA TERMINATED (on timeout) at ' +
              new Date().toISOString() +
              '.\n\n'
            )
          }

          so.system.exit(2)
        }, so.death_delay)

        if (killtimer.unref) {
          killtimer.unref()
        }
      }
    } catch (panic: any) {
      this.log.fatal({
        kind: 'panic',
        panic: Util.inspect(panic),
        orig: arguments[0],
      })

      if (so.test) {
        let msg =
          '\n\n' +
          'Seneca Panic\n' +
          '============\n\n' +
          panic.stack +
          '\n\nOriginal Error:\n' +
          (arguments[0] && arguments[0].stack
            ? arguments[0].stack
            : arguments[0])
        Print.internal_err(msg)
      }
    }
  }

    ; (die as any).context = ctxt

  return die
}

function make_standard_act_log_entry(
  actdef: any,
  msg: any,
  meta: any,
  origmsg: any,
  ctxt: any
) {
  let transport = origmsg.transport$ || {}
  let callmeta = meta || msg.meta$ || {}
  let prior = callmeta.prior || {}
  actdef = actdef || {}

  return Object.assign(
    {
      actid: callmeta.id,
      msg: msg,
      meta: meta,
      entry: prior.entry,
      prior: prior.chain,
      gate: origmsg.gate$,
      caller: origmsg.caller$,
      actdef: actdef,

      // these are transitional as need to be updated
      // to standard transport metadata
      client: actdef.client,
      listen: !!transport.origin,
      transport: transport,
    },
    ctxt
  )
}

function make_standard_err_log_entry(err: any, ctxt: any) {
  if (!err) return ctxt

  if (err.details && ctxt && ctxt.caller) {
    err.details.caller = ctxt.caller
  }

  let entry = Object.assign(
    {
      notice: err.message,
      code: err.code,
      err: err,
    },
    ctxt
  )

  return entry
}


function resolve_option(value: any, options: any) {
  return 'function' === typeof value ? value(options) : value
}


function autoincr() {
  let counter = 0
  return function() {
    return counter++
  }
}


function isError(x: any) {
  return Util.isError(x)
}


function inspect(x: any) {
  return Util.inspect(x)
}


// Callpoint resolver. Indicates location in calling code.
function make_callpoint(active: any) {
  return function callpoint(override: any) {
    if (active || override) {
      return error.callpoint(new Error(), [
        '/ordu.js',
        '/seneca/seneca.js',
        '/seneca/lib/',
        '/lodash.js',
      ])
    } else {
      return void 0
    }
  }
}


// Stringify message for logs, debugging and errors. 
function msgstr(msg: any, len: number = 111): string {
  let str =
    inspect(clean(msg))
      .replace(/\n/g, '')

  str = str.substring(0, len) +
    (len < str.length ? '...' : '')

  return str
}


function make_trace_desc(meta: any) {
  return [
    meta.pattern,
    meta.id,
    meta.instance,
    meta.tag,
    meta.version,
    meta.start,
    meta.end,
    meta.sync,
    meta.action,
  ]
}

const TRACE_PATTERN = 0
const TRACE_ID = 1
const TRACE_INSTANCE = 2
const TRACE_TAG = 3
const TRACE_VERSION = 4
const TRACE_START = 5
const TRACE_END = 6
const TRACE_SYNC = 7
const TRACE_ACTION = 8


function history(opts: any) {
  return new ActHistory(opts)
}


class ActHistory {

  _total: number = 0
  _list: any = []
  _map: any = {}
  _prune_interval: any


  constructor(opts: any) {
    let self = this
    opts = opts || {}

    if (opts.prune) {
      this._prune_interval = setInterval(function() {
        self.prune(Date.now())
      }, opts.interval || 100)
      if (this._prune_interval.unref) {
        this._prune_interval.unref()
      }
    }
  }

  stats(this: any) {
    return {
      total: this._total,
    }
  }

  add(this: any, obj: any) {
    this._map[obj.id] = obj

    let i = this._list.length - 1

    if (i < 0 || this._list[i].timelimit <= obj.timelimit) {
      this._list.push(obj)
    } else {
      i = this.place(obj.timelimit)
      this._list.splice(i, 0, obj)
    }
  }

  place(this: any, timelimit: any) {
    let i = this._list.length
    let s = 0
    let e = i

    if (0 === this._list.length) {
      return 0
    }

    do {
      i = Math.floor((s + e) / 2)

      if (timelimit > this._list[i].timelimit) {
        s = i + 1
        i = s
      } else if (timelimit < this._list[i].timelimit) {
        e = i
      } else {
        i++
        break
      }
    } while (s < e)

    return i
  }

  prune(this: any, timelimit: any) {
    let i = this.place(timelimit)
    if (0 <= i && i <= this._list.length) {
      for (let j = 0; j < i; j++) {
        delete this._map[this._list[j].id]
      }
      this._list = this._list.slice(i)
    }
  }

  get(this: any, id: any) {
    return this._map[id] || null
  }

  list(this: any) {
    return this._list
  }

  close(this: any) {
    if (this._prune_interval) {
      clearInterval(this._prune_interval)
    }
  }

  toString(this: any) {
    return Util.inspect({
      total: this._total,
      map: this._map,
      list: this._list,
    })
  }

  [Util.inspect.custom](this: any) {
    return this.toString()
  }
}


export {
  promiser,
  stringify,
  wrap_error,
  make_plugin_key,
  boolify,
  parse_jsonic,
  parse_pattern,
  build_message,
  pattern,
  pincanon,
  noop,
  clean,
  deep,
  each,
  makedie,
  make_standard_act_log_entry,
  make_standard_err_log_entry,
  resolve_option,
  autoincr,
  make_callpoint,
  make_trace_desc,
  history,
  print,
  parsePattern,
  tagnid,
  isError,
  inspect,
  error,
  msgstr,
  TRACE_PATTERN,
  TRACE_ID,
  TRACE_INSTANCE,
  TRACE_TAG,
  TRACE_VERSION,
  TRACE_START,
  TRACE_END,
  TRACE_SYNC,
  TRACE_ACTION,
}



