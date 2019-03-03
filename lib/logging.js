/* Copyright © 2016-2018 Richard Rodger and other contributors, MIT License. */
'use strict'

var Util = require('util')

var Stringify = require('json-stringify-safe')
var _ = require('lodash')

var Print = require('./print')

module.exports = logging

function logging() {
  // Everything is in preload as logging plugins are
  // a special case that need to be loaded before any calls to seneca.log.
}

logging.preload = function() {
  var seneca = this

  // TODO: temporary for seneca-repl
  seneca.__build_test_log__$$ = build_test_log

  var so = seneca.options()
  var logspec = so.log.basic || so.log || {}

  var origspec = logspec

  if (_.isString(logspec)) {
    if ('quiet' === logspec) {
      logspec = { level: 'none' }
    } else if ('silent' === logspec) {
      logspec = { level: 'none' }
    } else if ('any' === logspec) {
      logspec = { level: 'debug+' }
    } else if ('all' === logspec) {
      logspec = { level: 'debug+' }
    } else if ('print' === logspec) {
      logspec = { level: 'debug+' }
    } else if ('standard' === logspec) {
      logspec = { level: 'info+' }
    } else if ('test' === logspec) {
      logspec = { level: 'warn+' }
    }
  }

  var logrouter = logfilter(logspec)

  var logger = function(seneca, data) {
    if (logrouter(data)) {
      var logstr = Stringify(data)
      Print.log(logstr)
    }
  }

  // Test mode prints more readable logs
  if (so.test) {
    logger = function(seneca, data) {
      if (logrouter(data)) {
        try {
          var logstr = build_test_log(seneca, origspec, data)
          Print.log(logstr)
        } catch (e) {
          Print.log(data)
        }
      }
    }
  }

  return {
    extend: {
      logger: logger
    }
  }
}

function build_test_log(seneca, origspec, data) {
  var logstr
  var time = data.when - seneca.start_time
  var datalen = seneca.private$.exports.options.debug.datalen

  if ('test' === origspec || 'print' === origspec) {
    var logb = [
      time +
        '/' +
        seneca.id.substring(0, 2) +
        '/' +
        seneca.tag +
        ' ' +
        data.level.toUpperCase(),
      (data.kind || 'data') +
        (data.case ? '/' + data.case : '') +
        (data.meta ? (data.meta.sync ? '/s' : '/a') : '')
    ]

    if ('act' === data.kind) {
      if (data.meta) {
        logb.push(
          data.meta.id
            .split('/')
            .map(function(s) {
              return s.substring(0, 2)
            })
            .join('/')
        )

        logb.push(data.meta.pattern)
      }

      logb.push(
        Util.inspect(seneca.util.clean(data.result || data.msg))
          .replace(/\s+/g, '')
          .substring(0, datalen)
      )

      logb.push(data.actdef.id)

      if (data.notice) {
        logb.push(data.notice)
      }

      if ('ERR' === data.case) {
        logb.push('\n\n' + data.err.stack + '\n' + data.caller + '\n')
      }
    } else if ('add' === data.kind) {
      logb.push(data.pattern)
      logb.push(data.name)
    } else if ('plugin' === data.kind) {
      logb.push(
        data.plugin_name + (data.plugin_tag ? '$' + data.plugin_tag : '')
      )
    } else if ('options' === data.kind) {
      // deliberately omit
    } else if ('notice' === data.kind) {
      logb.push(data.notice)
    } else if ('listen' === data.kind || 'client' === data.kind) {
      var config = data.options && data.options[0]
      logb.push(
        [
          config.type,
          config.pin,
          config.host,
          _.isFunction(config.port) ? '' : config.port
        ].join(';')
      )
    } else {
      logb.push(
        Util.inspect(data)
          .replace(/\n/g, ' ')
          .substring(0, datalen)
      )
    }

    if (data.did) {
      logb.push(data.did)
    }

    logstr = logb.join('\t')
  } else {
    logstr = Util.inspect(data, { depth: null })
    logstr =
      time +
      ':\n\t' +
      logstr.replace(/\n/g, '\n\t') +
      '\n------------------------------------------------\n\n'
  }

  return logstr
}

// TODO: needs massive refactor

function logfilter(options) {
  let level = options.level || 'info+'

  let calculatedLevels = []

  if (level_exists(level)) {
    calculatedLevels.push(level)
  } else if (_.endsWith(level, '+')) {
    // Level + notation
    calculatedLevels = log_level_plus(level.substring(0, level.length - 1))
  } else {
    // No level nor level+... it must be a custom alias
    let processedAliases = Object.assign({}, aliases, options.aliases)
    let aliasInfo = processedAliases[level]
    if (aliasInfo) {
      let handled = _.get(aliasInfo, 'handled', true)
      if (handled) {
        calculatedLevels = aliasInfo.handler(options)
      }
    }
  }

  return function filter(data) {
    if (calculatedLevels.indexOf(data.level) !== -1) {
      return data
      /*
      let cloned = _.clone(data)
      if (options['omit-metadata']) {
        cloned = _.omit(cloned, ['seneca', 'level', 'when'])
      }

      if (options.omit && _.isArray(options.omit)) {
        cloned = _.omit(cloned, options.omit)
      }
      return cloned
*/
    }
    return null
  }
}

var aliases = {
  silent: {
    handled: true,
    handler: function() {
      return []
    }
  },
  all: {
    handled: true,
    handler: function() {
      return ['debug', 'info', 'warn', 'error', 'fatal']
    }
  },
  test: {
    handled: true,
    handler: function() {
      return ['error', 'fatal']
    }
  }
}

const log_levels = ['debug', 'info', 'warn', 'error', 'fatal']

/**
 * It returns the levels above the argument
 * @param  {String} logLevel the log level to calculate
 * @return {Array}           the list of logs above the argument
 */
function log_level_plus(logLevel) {
  let index = log_levels.indexOf(logLevel)
  if (index < 0) {
    return []
  } else {
    return log_levels.slice(index, log_levels.length)
  }
}

/**
 * Checks if a log level exists
 * @param  {string} level the level itself
 * @return {boolean}      true if the level exists
 */
function level_exists(level) {
  return log_levels.indexOf(level) !== -1
}

module.exports.log_level_plus = log_level_plus
module.exports.level_exists = level_exists
