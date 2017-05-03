/* Copyright (c) 2010-2017 Richard Rodger and other contributors, MIT License */
/* eslint no-console: 0 */
'use strict'

var Util = require('util')
var Assert = require('assert')

var _ = require('lodash')
var Eraro = require('eraro')
var Jsonic = require('jsonic')
var Nid = require('nid')
var Norma = require('norma')
var Errors = require('./errors')

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
exports.parsePattern = function parse_pattern(
  instance,
  args,
  normaspec,
  fixed
) {
  args = Norma(
    '{strargs:s? objargs:o? moreobjargs:o? ' + (normaspec || '') + '}',
    args
  )

  try {
    return _.extend(args, {
      pattern: _.extend(
        {},
        // Precedence of arguments in add,act is left-to-right
        args.moreobjargs ? args.moreobjargs : {},
        args.objargs ? args.objargs : {},
        args.strargs ? Jsonic(args.strargs) : {},
        fixed || {}
      )
    })
  } catch (e) {
    var col = e.line === 1 ? e.column - 1 : e.column
    throw internals.error('add_string_pattern_syntax', {
      argstr: args,
      syntax: e.message,
      line: e.line,
      col: col
    })
  }
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
function clean(obj) {
  if (obj === null) return obj

  return _.pickBy(obj, function(val, prop) {
    return !_.includes(prop, '$')
  })
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
exports.print = function print(err, out) {
  if (err) {
    console.log('ERROR: ' + err.message)
  } else {
    console.log(Util.inspect(out, { depth: null }))
  }
}

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
        callpoint: ctxt.callpoint()
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
                  exports.console_error(err)
                }

                exports.console_error(stderrmsg)
                exports.console_error(
                  '\n\nSENECA TERMINATED at ' +
                    new Date().toISOString() +
                    '. See above for error report.\n\n'
                )
                process.exit(1)
              })
            }
          }
        )
      }

      // make sure we close down within options.deathdelay seconds
      if (!undead) {
        var killtimer = setTimeout(function() {
          exports.console_error(stderrmsg)
          exports.console_error(
            '\n\nSENECA TERMINATED (on timeout) at ' +
              new Date().toISOString() +
              '.\n\n'
          )
          process.exit(2)
        }, so.deathdelay)
        killtimer.unref()
      }
    } catch (panic) {
      var msg =
        '\n\n' +
        'Seneca Panic\n' +
        '============\n\n' +
        panic.stack +
        '\n\nOriginal Error:\n' +
        (arguments[0] && arguments[0].stack ? arguments[0].stack : arguments[0])
      exports.console_error(msg)
    }
  }

  die.context = ctxt

  return die
}

// Intentional console errors use this function. Helps to find spurious debugging.
exports.console_error = function() {
  console.error.apply(null, arguments)
}

exports.make_standard_act_log_entry = function(actmeta, msg, origmsg, ctxt) {
  var transport = origmsg.transport$ || {}
  var callmeta = msg.meta$ || {}
  var prior = callmeta.prior || {}
  actmeta = actmeta || {}

  return _.extend(
    {
      actid: callmeta.id,
      msg: msg,
      entry: prior.entry,
      prior: prior.chain,
      gate: origmsg.gate$,
      caller: origmsg.caller$,
      meta: actmeta,

      // these are transitional as need to be updated
      // to standard transport metadata
      client: actmeta.client,
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

exports.history = function history(size) {
  return new History(size)
}

function History(size) {
  size = parseInt(size, 10)
  Assert.ok(-1 < size)

  this.size = size
  this.next = 0
  this.laps = 0
  this.log = new Array(size)
  this.map = {}
  this.waitmap = {}
}

History.prototype.stats = function stats() {
  return {
    next: this.next,
    total: this.next + this.laps * this.size,
    size: this.size
  }
}

History.prototype.add = function add(obj) {
  if (0 === this.size) return

  if (null != obj && null != obj.id) {
    var prev = this.map[this.log[this.next]]

    if (prev) {
      delete this.map[prev.id]

      var now = Date.now()
      if (prev.result && 0 === prev.result.length && now < prev.timelimit) {
        this.waitmap[prev.id] = prev
        this.clean(now)
      }
    }

    obj.index$ = this.next
    ;(obj.seq$ = this.next + this.laps * this.size), (this.log[this.next] =
      obj.id)
    this.map[obj.id] = obj
    this.next = (1 + this.next) % this.size
    this.laps += 0 === this.next ? 1 : 0
  }
}

History.prototype.get = function get(id) {
  var obj = this.map[id]

  if (null == obj) {
    obj = this.waitmap[id]
    var now = Date.now()

    if (obj && obj.timelimit < now) {
      this.clean(now)

      // should be gone; this is for unit test
      obj = this.waitmap[id]
    }
  }

  return obj || null
}

History.prototype.list = function list(flags) {
  flags = flags || {}
  var len = flags.len

  Assert.ok(null == len || 0 <= len)
  len = null == len ? -1 : len

  if (0 === this.size || 0 === len) return []

  return _.values(this.waitmap)
    .sort(function(a, b) {
      return a.seq$ - b.seq$
    })
    .map(function(obj) {
      return obj.id
    })
    .concat(
      (0 === this.laps ? [] : this.log.slice(this.next, this.size))
        .concat(this.log.slice(0, this.next))
        .slice(len < 0 ? 0 : -len)
    )
}

History.prototype.clean = function clean(now) {
  now = now || Date.now()
  var waitmap = this.waitmap
  Object.keys(waitmap).forEach(function(id) {
    if (waitmap[id].timelimit < now) {
      delete waitmap[id]
    }
  })
}

History.prototype.toString = function toString() {
  return Util.inspect({
    next: this.next,
    laps: this.laps,
    size: this.size,
    log: this.list(10)
  })
}

History.prototype.inspect = History.prototype.toString
