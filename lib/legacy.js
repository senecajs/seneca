/* Copyright © 2010-2018 Richard Rodger and other contributors, MIT License. */
'use strict'

var _ = require('lodash')
var Eraro = require('eraro')
var Norma = require('norma')
var Jsonic = require('jsonic')

var Common = require('./common')
var Errors = require('./errors')

var internals = {
  error: Eraro({
    package: 'seneca',
    msgmap: Errors,
    override: true
  })
}

// All methods here are DEPRECATED
// To be marked as DEPRECATED in Seneca 4.x
// To be REMOVED in Seneca 5.x

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
    : _.isString(omits)
    ? omits.split(/\s*,\s*/)
    : '' + omits

  // a little pre omit to avoid entities named in omits
  var usedargs = _.omit(args, omits)

  // don't support $ args
  usedargs = Common.clean(usedargs)

  return _.omit(Common.deepextend(defaults, usedargs, fixed), omits)
}

exports.next_act = function next_act() {
  var argsarr = new Array(arguments.length)
  for (var l = 0; l < argsarr.length; ++l) {
    argsarr[l] = arguments[l]
  }

  var si = this

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

exports.findpins = function findpins() {
  var self = this

  var argsarr = new Array(arguments.length)
  for (var l = 0; l < argsarr.length; ++l) {
    argsarr[l] = arguments[l]
  }

  var pins = []
  var patterns = _.flatten(argsarr)

  _.each(patterns, function(pattern) {
    pattern = _.isString(pattern) ? Jsonic(pattern) : pattern
    pins = pins.concat(
      _.map(self.private$.actrouter.list(pattern), function(desc) {
        return desc.match
      })
    )
  })

  return pins
}

exports.act_if = function act_if() {
  var self = this
  var args = Norma('{execute:b actargs:.*}', arguments)

  if (args.execute) {
    return self.act.apply(self, args.actargs)
  } else return self
}

exports.hasact = function hasact(pattern) {
  return !!this.find(pattern, { exact: false })
}

exports.make_legacy_fail = function make_legacy_fail(so) {
  return function() {
    var argsarr = new Array(arguments.length)
    for (var l = 0; l < argsarr.length; ++l) {
      argsarr[l] = arguments[l]
    }

    var cb = _.isFunction(argsarr[argsarr.length - 1])
      ? argsarr[argsarr.length - 1]
      : null

    if (cb) {
      argsarr.pop()
    }

    if (_.isObject(argsarr[0])) {
      var code = argsarr[0].code
      if (_.isString(code)) {
        argsarr.unshift(code)
      }
    }

    var err = internals.error.apply(null, argsarr)
    err.callpoint = new Error().stack.match(/^.*\n.*\n\s*(.*)/)[1]
    err.seneca = { code: err.code, valmap: err.details }

    this.log.error(Common.make_standard_err_log_entry(err))
    if (so.errhandler) {
      so.errhandler.call(this, err)
    }

    if (cb) {
      cb.call(this, err)
    }

    return err
  }
}
