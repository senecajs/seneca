/* Copyright (c) 2016 Richard Rodger and other contributors, MIT License */
'use strict'

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
  var logspec = so.log.basic || so.log

  // Default logging level is info+
  if (0 === _.keys(logspec).length) {
    logspec = {level: 'info+'}
  }
  // Some convenience shortcuts
  else if ('silent' === logspec) {
    logspec = {level: 'none'}
  }
  else if ('test' === logspec) {
    logspec = {level: 'error+'}
  }

  logspec.aliases = {
    'quiet': {
      handled: true,
      handler: function () { return ['none'] }
    },
    'silent': {
      handled: true,
      handler: function () { return ['none'] }
    },
    'all': {
      handled: true,
      handler: function () { return ['debug+'] }
    },
    'any': {
      handled: true,
      handler: function () { return ['debug+'] }
    },
    'print': {
      handled: true,
      handler: function () { return ['debug+'] }
    },
    'test': {
      handled: true,
      handler: function () { return ['error+'] }
    },
    'standard': {
      handled: true,
      handler: function () { return ['info+'] }
    }
  }
  var logrouter = LogFilter(logspec)

  var logger = function (seneca, data) {
    if (logrouter && logrouter(data)) {
      console.log(JSON.stringify(data))
    }
  }

  return {
    extend: {
      logger: logger
    }
  }
}
