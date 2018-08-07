/* Copyright © 2014-2018 Richard Rodger and other contributors, MIT License. */
'use strict'

var _ = require('lodash')

var Common = require('./common')

module.exports = function(instance) {
  instance.stats = make_action_seneca_stats(instance.private$)

  // Add builtin actions.
  instance.add({ role: 'seneca', cmd: 'ping' }, cmd_ping)
  instance.add({ role: 'seneca', cmd: 'stats' }, instance.stats)
  instance.add({ role: 'seneca', cmd: 'close' }, action_seneca_close)
  instance.add({ role: 'seneca', info: 'fatal' }, action_seneca_fatal)
  instance.add({ role: 'seneca', get: 'options' }, action_options_get)

  // TODO: review - is this used?
  //instance.add({ role: 'seneca', make: 'error' }, action_make_error)

  // Legacy builtin actions.
  // Remove in Seneca 4.x
  instance.add(
    { role: 'seneca', stats: true, deprecate$: true },
    instance.stats
  )
  instance.add(
    { role: 'options', cmd: 'get', deprecate$: true },
    action_options_get
  )
}

function cmd_ping(msg, reply) {
  reply(this.ping())
}

function action_seneca_fatal(msg, reply) {
  reply()
}

function action_seneca_close(msg, reply) {
  this.emit('close')
  reply()
}

function make_action_seneca_stats(private$) {
  return function action_seneca_stats(msg, reply) {
    msg = msg || {}
    var stats

    // TODO: review - this is sort of breaking the "type" of the stats result
    if (msg.pattern && private$.stats.actmap[msg.pattern]) {
      stats = private$.stats.actmap[msg.pattern]
      stats.time = private$.timestats.calculate(msg.pattern)
    } else {
      stats = _.clone(private$.stats)
      stats.now = new Date()
      stats.uptime = stats.now - stats.start

      stats.now = new Date(stats.now).toISOString()
      stats.start = new Date(stats.start).toISOString()

      var summary = null == msg.summary || Common.boolify(msg.summary)
      //(/^false$/i.exec(msg.summary) ? false : !!msg.summary)

      if (summary) {
        stats.actmap = void 0
      } else {
        _.each(private$.stats.actmap, function(a, p) {
          private$.stats.actmap[p].time = private$.timestats.calculate(p)
        })
      }
    }

    if (reply) {
      reply(stats)
    }
    return stats
  }
}

function action_options_get(msg, reply) {
  var options = this.options()

  var base = msg.base || null
  var top = base ? options[base] || {} : options
  var val = msg.key ? top[msg.key] : top

  reply(Common.copydata(val))
}
