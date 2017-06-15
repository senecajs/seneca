/* Copyright (c) 2010-2017 Richard Rodger and other contributors, MIT License */
'use strict'

var Util = require('util')
//var Assert = require('assert')

var _ = require('lodash')
var Eraro = require('eraro')
var Jsonic = require('jsonic')
var Nid = require('nid')
var Norma = require('norma')
var Errors = require('./errors')
var Print = require('./print')

var internals = {
  error: Eraro({
    package: 'seneca',
    msgmap: Errors,
    override: true
  })
}

exports.boolify = function(v) {
  try {
    return !!JSON.parse(v)
  } catch (e) {
    return false
  }
}

exports.tagnid = Nid({ length: 3, alphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' })

var parse_jsonic = (exports.parse_jsonic = function(str, code) {
  try {
    return null == str ? null : Jsonic(str)
  } catch (e) {
    var col = e.line === 1 ? e.column - 1 : e.column
    throw internals.error(code, {
      argstr: str,
      syntax: e.message,
      line: e.line,
      col: col
    })
  }
})

// use args properties as fields
// defaults: map of default values
// args: args object
// fixed: map of fixed values - cannot be overriden
// omits: array of prop names to exclude
// defaults, args, and fixed are deepextended together in that order
exports.argprops = function argprops(defaults, args, fixed, omits) {
  omits = _.isArray(omits)
    ? omits
    : _.isObject(omits)
        ? _.keys(omits)
        : _.isString(omits) ? omits.split(/\s*,\s*/) : '' + omits

  // a little pre omit to avoid entities named in omits
  var usedargs = _.omit(args, omits)

  // don't support $ args
  usedargs = clean(usedargs)

  return _.omit(deepextend(defaults, usedargs, fixed), omits)
}

// string args override object args
// TODO: fix name
exports.parsePattern = function parse_pattern(
  instance,
  rawargs,
  normaspec,
  fixed
) {
  var args = Norma(
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

exports.build_message = function build_message(
  instance,
  rawargs,
  normaspec,
  fixed
) {
  var args = Norma(
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

var copydata = (exports.copydata = function(obj) {
  var copy

  // Handle the 3 simple types, and null or undefined
  if (obj === null || typeof obj !== 'object') return obj

  // Handle Error
  if (_.isError(obj)) {
    copy = {}
    Object.getOwnPropertyNames(obj).forEach(function(key) {
      copy[key] = obj[key]
    })
    return copy
  }

  // Handle Date
  if (_.isDate(obj)) {
    copy = new Date()
    copy.setTime(obj.getTime())
    return copy
  }

  // Handle Array
  if (_.isArray(obj)) {
    copy = []
    for (var i = 0, len = obj.length; i < len; ++i) {
      copy[i] = copydata(obj[i])
    }
    return copy
  }

  copy = {}
  for (var attr in obj) {
    if (obj.hasOwnProperty(attr)) copy[attr] = copydata(obj[attr])
  }
  return copy
})

// Convert pattern object into a normalized jsonic String.
var pattern = (exports.pattern = function pattern(patobj) {
  if (_.isString(patobj)) {
    return patobj
  }

  patobj = patobj || {}
  var sb = []
  _.each(patobj, function(v, k) {
    if (!~k.indexOf('$') && !_.isFunction(v)) {
      sb.push(k + ':' + v)
    }
  })

  sb.sort()

  return sb.join(',')
})

exports.pincanon = function pincanon(inpin) {
  if (_.isString(inpin)) {
    return pattern(Jsonic(inpin))
  } else if (_.isArray(inpin)) {
    var pin = _.map(inpin, pincanon)
    pin.sort()
    return pin.join(';')
  } else {
    return pattern(inpin)
  }
}

// noop for callbacks
exports.nil = function nil() {
  _.each(arguments, function(arg) {
    if (_.isFunction(arg)) {
      return arg()
    }
  })
}

// remove any props containing $
function clean(obj, opts) {
  if (null == obj) return obj

  var out = Array.isArray(obj) ? [] : {}

  var pn = Object.getOwnPropertyNames(obj)
  for (var i = 0; i < pn.length; i++) {
    var p = pn[i]

    if ('$' != p[p.length - 1]) {
      out[p] = obj[p]
    }
  }

  if (opts && false !== opts.proto) {
    //out.__proto__ = obj.__proto__
  }

  return out
}
exports.clean = clean

function deepextend() {
  var argsarr = new Array(arguments.length)
  for (var l = 0; l < argsarr.length; ++l) {
    argsarr[l] = arguments[l]
  }

  // Lodash uses the reverse order to apply defaults than the deepextend API.
  argsarr = argsarr.reverse()

  // Add an empty object to the front of the args.  Defaults will be written
  // to this empty object.
  argsarr.unshift({})

  return _.defaultsDeep.apply(_, argsarr)
}
exports.deepextend = deepextend

// loop over a list of items recursively
// list can be an integer - number of times to recurse
exports.recurse = function recurse(list, work, done) {
  var ctxt = this

  if (_.isNumber(list)) {
    list = _.range(0, list)
  } else {
    list = _.clone(list)
  }

  function next(err, out) {
    if (err) return done(err, out)

    var item = list.shift()

    if (void 0 !== item) {
      work.call(ctxt, item, next)
    } else {
      done.call(ctxt, err, out)
    }
  }
  next.call(ctxt)
}

// Print action result
exports.print = Print.print

exports.makedie = function(instance, ctxt) {
  ctxt = _.extend(ctxt, instance.die ? instance.die.context : {})

  var diecount = 0

  var die = function(err) {
    var so = instance.options()

    // undead is only for testing, do not use in production
    var undead = (so.debug && so.debug.undead) || (err && err.undead)

    if (0 < diecount) {
      if (!undead) {
        throw new Error('[DEATH LOOP]')
      }
      return
    } else {
      diecount++
    }

    var die_trace =
      '\n' + new Error('die trace').stack.match(/^.*?\n.*\n(.*)/)[1]

    try {
      if (!err) {
        err = new Error('unknown')
      } else if (!Util.isError(err)) {
        err = new Error(_.isString(err) ? err : Util.inspect(err))
      }

      err.fatal$ = true

      var logdesc = {
        kind: ctxt.txt,
        plugin: ctxt.plugin,
        tag: ctxt.tag,
        id: ctxt.id,
        code: err.code,
        notice: err.message,
        err: err,
        callpoint: ctxt.callpoint && ctxt.callpoint()
      }

      instance.log.fatal.apply(instance, logdesc)

      var stack = err.stack || ''
      stack = stack.replace(/^.*?\n/, '\n')

      var procdesc =
        '\n  pid=' +
        process.pid +
        ', arch=' +
        process.arch +
        ', platform=' +
        process.platform +
        ',\n  path=' +
        process.execPath +
        ',\n  argv=' +
        Util.inspect(process.argv).replace(/\n/g, '') +
        ',\n  env=' +
        Util.inspect(process.env).replace(/\n/g, '')

      var fatalmodemsg = instance.fixedargs.fatal$
        ? '\n  ALL ERRORS FATAL: action called with argument fatal$:true ' +
            '(probably a plugin init error, or using a plugin seneca instance)'
        : ''

      var stderrmsg =
        '\n\n' +
        'Seneca Fatal Error\n' +
        '==================\n\n' +
        'Message: ' +
        err.message +
        '\n\n' +
        'Code: ' +
        err.code +
        '\n\n' +
        'Details: ' +
        Util.inspect(err.details, { depth: null }) +
        '\n\n' +
        'Stack: ' +
        stack +
        '\n\n' +
        'Instance: ' +
        instance.toString() +
        fatalmodemsg +
        die_trace +
        '\n\n' +
        'When: ' +
        new Date().toISOString() +
        '\n\n' +
        'Log: ' +
        Jsonic.stringify(logdesc) +
        '\n\n' +
        'Node:\n  ' +
        Util.inspect(process.versions).replace(/\s+/g, ' ') +
        ',\n  ' +
        Util.inspect(process.features).replace(/\s+/g, ' ') +
        ',\n  ' +
        Util.inspect(process.moduleLoadList).replace(/\s+/g, ' ') +
        '\n\n' +
        'Process: ' +
        procdesc +
        '\n\n'

      if (so.errhandler) {
        so.errhandler.call(instance, err)
      }

      if (instance.closed) {
        return
      }

      if (!undead) {
        instance.act('role:seneca,info:fatal,closing$:true', { err: err })

        instance.close(
          // terminate process, err (if defined) is from seneca.close
          function(err) {
            if (!undead) {
              process.nextTick(function() {
                if (err) {
                  Print.err(err)
                }

                Print.err(stderrmsg)
                Print.err(
                  '\n\nSENECA TERMINATED at ' +
                    new Date().toISOString() +
                    '. See above for error report.\n\n'
                )

                so.system.exit(1)
              })
            }
          }
        )
      }

      // make sure we close down within options.deathdelay seconds
      if (!undead) {
        var killtimer = setTimeout(function() {
          Print.err(stderrmsg)
          Print.err(
            '\n\nSENECA TERMINATED (on timeout) at ' +
              new Date().toISOString() +
              '.\n\n'
          )

          so.system.exit(2)
        }, so.deathdelay)

        if(killtimer.unref) {
          killtimer.unref()
        }
      }
    } catch (panic) {
      var msg =
        '\n\n' +
        'Seneca Panic\n' +
        '============\n\n' +
        panic.stack +
        '\n\nOriginal Error:\n' +
        (arguments[0] && arguments[0].stack ? arguments[0].stack : arguments[0])
      Print.err(msg)
    }
  }

  die.context = ctxt

  return die
}

exports.make_standard_act_log_entry = function(
  actdef,
  msg,
  meta,
  origmsg,
  ctxt
) {
  // TODO: callmeta not needed

  var transport = origmsg.transport$ || {}
  var callmeta = meta || msg.meta$ || {}
  var prior = callmeta.prior || {}
  actdef = actdef || {}

  return _.extend(
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
      transport: transport
    },
    ctxt
  )
}

exports.make_standard_err_log_entry = function(err, ctxt) {
  if (!err) return ctxt

  return _.extend(
    {
      notice: err.message,
      code: err.code,
      err: err
    },
    ctxt
  )
}

exports.resolve_option = function(value, options) {
  return _.isFunction(value) ? value(options) : value
}

exports.flatten = function(obj, prop) {
  var out = []
  while (null != obj && 0 < obj.length) {
    out.push(_.omit(obj[0], [prop]))
    obj = obj[0][prop]
  }
  return out
}

exports.autoincr = function() {
  var counter = 0
  return function() {
    return counter++
  }
}

/*
exports.setmeta = function(obj, meta) {
  //if (_.isObject(obj)) {
  if (obj instanceof Object) {
    obj.meta$ = meta
  }

  return obj
}
*/

exports.make_trace_desc = function(meta) {
  return [
    meta.pattern,
    meta.id,
    meta.instance,
    meta.tag,
    meta.version,
    meta.start,
    meta.end,
    meta.sync,
    meta.action
  ]
}

exports.TRACE_PATTERN = 0
exports.TRACE_ID = 1
exports.TRACE_INSTANCE = 2
exports.TRACE_TAG = 3
exports.TRACE_VERSION = 4
exports.TRACE_START = 5
exports.TRACE_END = 6
exports.TRACE_SYNC = 7
exports.TRACE_ACTION = 8

exports.history = function history(opts) {
  return new History(opts)
}

function History(opts) {
  opts = opts || {}

  this._total = 0
  this._list = []
  this._map = {}

  if (opts.prune) {
    this._prunehist = []
    this._prune_interval = setInterval(
      this.prune.bind(this),
      opts.interval || 100
    )
    if(this._prune_interval.unref) {
      this._prune_interval.unref()
    }
  }
}

History.prototype.stats = function stats() {
  return {
    total: this._total
  }
}

History.prototype.add = function add(obj) {
  this._map[obj.id] = obj

  var i = this._list.length - 1

  if (i < 0 || this._list[i].timelimit <= obj.timelimit) {
    this._list.push(obj)
  } else {
    i = this.place(obj.timelimit)
    this._list.splice(i, 0, obj)
  }
}

History.prototype.place = function place(timelimit) {
  var i = this._list.length
  var s = 0
  var e = i
  //var c = 'u'

  if (0 === this._list.length) {
    return 0
  }

  do {
    i = Math.floor((s + e) / 2)
    //i = Math.ceil((s+e)/2)
    //console.log('S ',i,s,e)

    if (timelimit > this._list[i].timelimit) {
      s = i + 1
      i = s
      //c = 's'
    } else if (timelimit < this._list[i].timelimit) {
      e = i
      //i = e
      //c = 'e'
    } else {
      i++
      break
    }

    //console.log('E ',i,s,e,s<e,c)
  } while (s < e)

  return i
}

History.prototype.prune = function prune(timelimit) {
  var startlen = this._list.length

  var i = this.place(timelimit)
  if (0 <= i && i <= this._list.length) {
    for (var j = 0; j < i; j++) {
      delete this._map[this._list[j].id]
    }
    this._list = this._list.slice(i)
  }

  var endlen = this._list.length

  //console.log('PRUNE',startlen,endlen)
  if (this._prunehist) {
    this._prunehist.push([startlen, endlen])
  }
}

History.prototype.get = function get(id) {
  return this._map[id] || null
}

History.prototype.list = function list() {
  return this._list
}

History.prototype.close = function close() {
  if (this._prune_interval) {
    clearInterval(this._prune_interval)
  }
}

History.prototype.toString = function toString() {
  return Util.inspect({
    total: this._total,
    map: this._map,
    list: this._list
  })
}

History.prototype.inspect = History.prototype.toString
