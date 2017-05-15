/* Copyright (c) 2016-2017 Richard Rodger and other contributors, MIT License */
'use strict'

var Util = require('util')

var Stringify = require('json-stringify-safe')
var LogFilter = require('seneca-log-filter')
var _ = require('lodash')

var Print = require('./print')

module.exports = logging

function logging() {
  // Everything is in preload as logging plugins are
  // a special case that need to be loaded before any calls to seneca.log.
}

logging.preload = function() {
  var seneca = this
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

  var logrouter = LogFilter(logspec)

  var logger = function(seneca, data) {
    if (logrouter(data)) {
      Print.log(Stringify(data))
    }
  }

  // Test mode prints more readable logs
  if (so.test) {
    logger = function(seneca, data) {
      if (logrouter(data)) {
        try {
          var logstr
          var time = data.when - seneca.start_time

          if ('test' === origspec || 'print' === origspec) {
            var logb = [
              time + '/' + seneca.id.substring(0, 2),
              data.kind + (data.case ? '/' + data.case : '')
            ]

            if ('act' === data.kind) {
              if (data.msg) {
                logb.push(
                  data.msg.meta$.id
                    .split('/')
                    .map(function(s) {
                      return s.substring(0, 2)
                    })
                    .join('/')
                )

                logb.push(data.msg.meta$.pattern)
              }

              logb.push(
                Util.inspect(seneca.util.clean(data.result || data.msg))
                  .replace(/\s+/g, '')
                  .substring(0, 88)
              )

              logb.push(data.meta.id)

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
                data.plugin_name +
                  (data.plugin_tag ? '/' + data.plugin_tag : '')
              )
            } else if ('options' === data.kind) {
              // deliberately omit
            } else if ('notice' === data.kind) {
              logb.push(data.notice)
            } else if ('listen' === data.kind || 'client' === data.kind) {
              logb.push(Util.inspect(data.options).replace(/\n/g, ' '))
            } else if (null == data.kind) {
              // deliberately omit
            } else {
              logb.push(Util.inspect(data).replace(/\n/g, ' '))
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
