/* Copyright (c) 2016 Richard Rodger and other contributors, MIT License */
'use strict'


var _ = require('lodash')
var Patrun = require('patrun')


var loglevels = ['debug', 'info', 'warn', 'error', 'fatal']


module.exports = logging


function logging (options) {
  // Everything is in preload as logging plugins are
  // a special case that need to be loaded asap.
}


logging.preload = function () {
  var seneca = this
  var logrouter
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

  // level property needs to be set to see any logs
  if (null !== logspec.level && 'none' !== logspec.level) {
    // this should be optional, need to allow for pure pass-through
    logrouter = Patrun({ gex: true })

    var logpatterns = _.isArray(logspec) ? logspec : [logspec]

    for (var i = 0; i < logpatterns.length; ++i) {
      var logpat = logpatterns[i]
      var sublogpats = []

      // level+ syntax: info+ means info and above: info, warn, error, fatal
      if (logpat.level && logpat.level.match(/\+$/)) {
        var level = logpat.level.substring(0, logpat.level.length - 1)

        if (-1 < loglevels.indexOf(level)) {
          var levels = [].concat(loglevels.slice(loglevels.indexOf(level)))
          for (var k = 0; k < levels.length; ++k) {
            sublogpats.push(_.extend({}, logpat, {level: levels[k]}))
          }
        }
      }
      else {
        sublogpats.push(logpat)
      }

      for (var j = 0; j < sublogpats.length; ++j) {
        logrouter.add(sublogpats[j], true)
      }
    }
  }

  var logger = function (seneca, data) {
    if (logrouter && logrouter.find(data)) {
      console.log(JSON.stringify(data))
    }
  }

  return {
    extend: {
      logger: logger
    }
  }
}
