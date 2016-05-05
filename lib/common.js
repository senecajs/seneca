/* Copyright (c) 2010-2015 Richard Rodger, MIT License */
'use strict'

var _ = require('lodash')
var Jsonic = require('jsonic')
var Nid = require('nid')
var Norma = require('norma')

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

// string args override object args
exports.parsePattern = function parse_pattern (instance, args, normaspec, fixed) {
  args = Norma('{strargs:s? objargs:o? moreobjargs:o? ' + (normaspec || '') + '}', args)

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
