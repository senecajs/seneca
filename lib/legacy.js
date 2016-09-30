/* Copyright (c) 2010-2016 Richard Rodger and other contributors, MIT License */
'use strict'

var _ = require('lodash')
var Eraro = require('eraro')
var Common = require('./common')
var Errors = require('./errors')

var internals = {
  error: Eraro({
    package: 'seneca',
    msgmap: Errors,
    override: true
  })
}

exports.fail = function make_legacy_fail (so) {
  return function () {
    var argsarr = new Array(arguments.length)
    for (var l = 0; l < argsarr.length; ++l) { argsarr[l] = arguments[l] }

    var cb = _.isFunction(argsarr[argsarr.length - 1])
      ? argsarr[argsarr.length - 1] : null

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
