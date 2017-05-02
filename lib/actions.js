/* Copyright (c) 2017 Richard Rodger and other contributors, MIT License */
'use strict'

// var Assert = require('assert')

var _ = require('lodash')

var Common = require('./common')

module.exports = function(root) {
  root.stats = make_action_seneca_stats(root.private$)

  // Add builtin actions.
  root.add({ role: 'seneca', cmd: 'stats' }, root.stats)
  root.add({ role: 'seneca', cmd: 'close' }, action_seneca_close)
  root.add({ role: 'seneca', info: 'fatal' }, action_seneca_fatal)
  root.add({ role: 'seneca', get: 'options' }, action_options_get)

  // Legacy builtin actions.
  // Remove in Seneca 4.x
  root.add({ role: 'seneca', stats: true, deprecate$: true }, root.stats)
  root.add(
    { role: 'options', cmd: 'get', deprecate$: true },
    action_options_get
  )
}

function action_seneca_fatal(args, done) {
  done()
}

function action_seneca_close(args, done) {
  this.emit('close')
  done()
}

function make_action_seneca_stats(private$) {
  return function action_seneca_stats(args, done) {
    args = args || {}
    var stats

    if (args.pattern && private$.stats.actmap[args.pattern]) {
      stats = private$.stats.actmap[args.pattern]
      stats.time = private$.timestats.calculate(args.pattern)
    } else {
      stats = _.clone(private$.stats)
      stats.now = new Date()
      stats.uptime = stats.now - stats.start

      stats.now = new Date(stats.now).toISOString()
      stats.start = new Date(stats.start).toISOString()

      var summary =
        args.summary == null ||
        (/^false$/i.exec(args.summary) ? false : !!args.summary)

      if (summary) {
        stats.actmap = void 0
      } else {
        _.each(private$.stats.actmap, function(a, p) {
          private$.stats.actmap[p].time = private$.timestats.calculate(p)
        })
      }
    }

    if (done) {
      done(null, stats)
    }
    return stats
  }
}

function action_options_get(args, done) {
  var options = this.options()

  var base = args.base || null
  var root = base ? options[base] || {} : options
  var val = args.key ? root[args.key] : root

  done(null, Common.copydata(val))
}
