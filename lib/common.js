/* Copyright (c) 2010-2015 Richard Rodger, MIT License */
'use strict'

var Util = require('util')
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

// Shortcuts
var arrayify = Function.prototype.apply.bind(Array.prototype.slice)


exports.tagnid = Nid({length: 3, alphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'})

exports.delegate = function (scope, func) {
  var args = Array.prototype.slice.call(arguments, 2)
  return function () {
    return func.apply(scope, args.concat(Array.prototype.slice.call(arguments)))
  }
}

// TODO: are any of the below used?

exports.conf = {}

exports.die = function (msg) {
  console.error(msg)
  process.exit(1)
}

// string args override object args
exports.parsePattern = function parse_pattern (instance, args, normaspec, fixed) {
  args = Norma('{strargs:s? objargs:o? moreobjargs:o? ' + (normaspec || '') + '}', args)

  try {
    return _.extend(
      args,
      { pattern: _.extend(
          {},

          // Precedence of arguments in add,act is left-to-right
          args.moreobjargs ? args.moreobjargs : {},
          args.objargs ? args.objargs : {},
          args.strargs ? Jsonic(args.strargs) : {},

          fixed || {})
      })
  }
  catch (e) {
    var col = (e.line === 1) ? e.column - 1 : e.column
    throw internals.error('add_string_pattern_syntax', {
      argstr: args,
      syntax: e.message,
      line: e.line,
      col: col
    })
  }
}

var copydata = exports.copydata = function (obj) {
  var copy

  // Handle the 3 simple types, and null or undefined
  if (obj === null || typeof obj !== 'object') return obj

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

  // Handle Object
  if (_.isObject(obj)) {
    copy = {}
    for (var attr in obj) {
      if (obj.hasOwnProperty(attr)) copy[attr] = copydata(obj[attr])
    }
    return copy
  }

  throw new Error("Unable to copy obj! Its type isn't supported.")
}

var pattern = exports.pattern = function pattern (args) {
  if (_.isString(args)) {
    return args
  }

  args = args || {}
  var sb = []
  _.each(args, function (v, k) {
    if (!~k.indexOf('$') && !_.isFunction(v)) {
      sb.push(k + ':' + v)
    }
  })

  sb.sort()

  return sb.join(',')
}

exports.pincanon = function pincanon (inpin) {
  if (_.isString(inpin)) {
    return pattern(Jsonic(inpin))
  }
  else if (_.isArray(inpin)) {
    var pin = _.map(inpin, pincanon)
    pin.sort()
    return pin.join(';')
  }
  else {
    return pattern(inpin)
  }
}


// noop for callbacks
exports.nil = function nil () {
  _.each(arguments, function (arg) {
    if (_.isFunction(arg)) {
      return arg()
    }
  })
}

// remove any props containing $
function clean (obj) {
  if (obj === null) return obj

  var out = {}
  if (obj) {
    for (var p in obj) {
      if (!~p.indexOf('$')) {
        out[p] = obj[p]
      }
    }
  }
  return out
}
exports.clean = clean

function deepextend () {
  var args = arrayify(arguments)

  // Lodash uses the reverse order to apply defaults than the deepextend API.
  args = args.reverse()
  // Add an empty object to the front of the args.  Defaults will be written
  // to this empty object.
  args.unshift({})

  return _.defaultsDeep.apply(_, args)
}
exports.deepextend = deepextend

// loop over a list of items recursively
// list can be an integer - number of times to recurse
exports.recurse = function recurse (list, work, done) {
  var ctxt = this

  if (_.isNumber(list)) {
    var size = list
    list = new Array(size)
    for (var i = 0; i < size; i++) {
      list[i] = i
    }
  }
  else {
    list = _.clone(list)
  }

  function next (err, out) {
    if (err) return done(err, out)

    var item = list.shift()

    if (void 0 !== item) {
      work.call(ctxt, item, next)
    }
    else {
      done.call(ctxt, err, out)
    }
  }
  next.call(ctxt)
}

// use args properties as fields
// defaults: map of default values
// args: args object
// fixed: map of fixed values - cannot be overriden
// omits: array of prop names to exclude
// defaults, args, and fixed are deepextended together in that order
exports.argprops = function argprops (defaults, args, fixed, omits) {
  omits = _.isArray(omits) ? omits
    : _.isObject(omits) ? _.keys(omits)
    : _.isString(omits) ? omits.split(/\s*,\s*/)
    : '' + omits

  // a little pre omit to avoid entities named in omits
  var usedargs = _.omit(args, omits)

  // don't support $ args
  usedargs = clean(usedargs)

  return _.omit(deepextend(defaults, usedargs, fixed), omits)
}

exports.print = function print (err, out) {
  if (err) throw err

  console.log(Util.inspect(out, {depth: null}))
  for (var i = 2; arguments.length > 2; i++) {
    console.dir(arguments[i])
  }
}


exports.makedie = function (instance, ctxt) {
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
      var undead = (so.debug && so.debug.undead) || (err && err.undead)

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

      if (instance.closed) {
        return
      }

      if (!undead) {
        instance.act('role:seneca,info:fatal,closing$:true', {err: err})

        instance.close(
          // terminate process, err (if defined) is from seneca.close
          function (err) {
            if (!undead) {
              process.nextTick(function () {
                if (err) {
                  exports.console_error(err)
                }

                exports.console_error(stderrmsg)
                exports.console_error('\n\nSENECA TERMINATED at ' + (new Date().toISOString()) +
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
          exports.console_error(stderrmsg)
          exports.console_error('\n\nSENECA TERMINATED (on timeout) at ' +
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
      exports.console_error(msg)
    }
  }

  die.context = ctxt

  return die
}


// Intentional console errors use this function. Helps to find spurious debugging.
exports.console_error = function () {
  console.error.apply(null, arguments)
}
