/* Copyright (c) 2010-2015 Richard Rodger, MIT License */
'use strict'

var _ = require('lodash')
var Eraro = require('eraro')
var Jsonic = require('jsonic')
var Common = require('./common')
var Errors = require('./errors')
var Plugins = require('./plugins')
var Nid = require('nid')


var internals = {
  error: Eraro({
    package: 'seneca',
    msgmap: Errors,
    override: true
  })
}


exports.listen = function (callpoint) {
  return function api_listen () {
    var self = this

    self.log.info.apply(self, _.flatten([
      'listen', arguments[0], Array.prototype.slice.call(arguments, 1), callpoint()
    ]))

    var opts = self.options().transport || {}
    var config = internals.parseConfig(Common.arrayify(arguments), opts)

    self.act(
      'role:transport,cmd:listen',
      { config: config, gate$: true },
      function (err) {
        if (err) {
          return self.die(internals.error(err, 'transport_listen', config))
        }
      })

    return self
  }
}

exports.client = function (callpoint) {
  return function api_client () {
    var self = this

    self.log.info.apply(self, _.flatten([
      'client', arguments[0], Array.prototype.slice.call(arguments, 1), callpoint()
    ]))

    var opts = self.options().transport || {}
    var config = internals.parseConfig(Common.arrayify(arguments), opts)

    config.id = config.id || Nid()

    // Queue messages while waiting for client to become active.
    var sendqueue = []
    var sendclient = {
      send: function (args, done) {
        var tosend = { instance: this, args: args, done: done }
        self.log.debug('client', 'sendqueue-add', sendqueue.length + 1,
                       config, tosend)
        sendqueue.push(tosend)
      }
    }

    // TODO: validate pin, pins args

    var pins = config.pins || [config.pin || '']

    pins = _.map(pins, function (pin) {
      return _.isString(pin) ? Jsonic(pin) : pin
    })

    var sd = Plugins.make_delegate(self, { name: 'client$', tag: void 0 })

    var transport_client = function transport_client (msg, done) {
      if (msg.local$) {
        this.prior(msg, done )
      }
      else {
        sendclient.send.call(this, msg, done )
      }
    }

    transport_client.id = config.id

    if (config.handle) {
      transport_client.handle = config.handle
    }

    _.each(pins, function (pin) {
      pin.client$ = true

      sd.add(pin, transport_client)
    })

    // Create client.
    sd.act(
      'role:transport,cmd:client',
      { config: config, gate$: true },
      function (err, liveclient) {
        if (err) {
          return sd.die(internals.error(err, 'transport_client', config) )
        }
        if (liveclient === null) {
          return sd.die(internals.error('transport_client_null',
                                         Common.clean(config)))
        }

        // Process any messages waiting for this client,
        // before bringing client online.
        function sendnext () {
          if (!sendqueue.length) {
            sendclient = liveclient
            sd.log.debug('client', 'sendqueue-clear', config)
          }
          else {
            var tosend = sendqueue.shift()
            sd.log.debug('client', 'sendqueue-processing',
              sendqueue.length + 1, config, tosend)
            sendclient.send.call(tosend.instance, tosend.args, tosend.done)
            setImmediate(sendnext)
          }
        }
        sendnext()
      })

    return self
  }
}


internals.parseConfig = function (args, options) {
  var out = {}

  var config = args
  var arglen = config.length

  if (1 === arglen) {
    if (_.isObject(config[0])) {
      out = config[0]
    }
    else {
      out.port = parseInt(config[0], 10)
    }
  }
  else if (2 === arglen) {
    out.port = parseInt(config[0], 10)
    out.host = config[1]
  }
  else if (3 === arglen) {
    out.port = parseInt(config[0], 10)
    out.host = config[1]
    out.path = config[2]
  }

  _.each(options, function (value, key) {
    if (_.isObject(value)) {
      return
    }
    out[key] = (out[key] === void 0 ? value : out[key])
  })

  // Default transport is web
  out.type = out.type || 'web'

  // Aliases.
  if (out.type === 'direct' || out.type === 'http') {
    out.type = 'web'
  }

  var base = options[out.type] || {}

  out = _.extend({}, base, out)

  if (out.type === 'web' || out.type === 'tcp') {
    out.port = out.port === null ? base.port : out.port
    out.host = out.host === null ? base.host : out.host
    out.path = out.path === null ? base.path : out.path
  }

  return out
}
