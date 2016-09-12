/* Copyright (c) 2016 Richard Rodger and other contributors, MIT License */
'use strict'

var LogFilter = require('seneca-log-filter')

module.exports = logging

function logging (options) {
  // Everything is in preload as logging plugins are
  // a special case that need to be loaded asap.
}

logging.preload = function () {
  var seneca = this
  var so = seneca.options()
  var logspec = so.log.basic || so.log
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
