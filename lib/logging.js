/* Copyright (c) 2016 Richard Rodger and other contributors, MIT License */
'use strict'

var Stringify = require('json-stringify-safe')
var LogFilter = require('seneca-log-filter')
var _ = require('lodash')

module.exports = logging

function logging (options) {
  // Everything is in preload as logging plugins are
  // a special case that need to be loaded asap.
}

logging.preload = function () {
  var seneca = this
  var so = seneca.options()
  var logspec = so.log.basic || so.log || {}

  if (_.isString(logspec)) {
    logspec = {level: logspec}
  }
  logspec.aliases = {
    'quiet': {
      handled: true,
      handler: function () { return ['none'] }
    },
    'any': {
      handled: true,
      handler: function () { return ['debug+'] }
    },
    'print': {
      handled: true,
      handler: function () { return ['debug+'] }
    },
    'standard': {
      handled: true,
      handler: function () { return ['info+'] }
    }
  }

  var logrouter = LogFilter(logspec)

  var logger = function (seneca, data) {
    if (logrouter && logrouter(data)) {
      console.log(Stringify(data))
    }
  }

  return {
    extend: {
      logger: logger
    }
  }
}
