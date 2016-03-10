/* Copyright (c) 2010-2015 Richard Rodger, MIT License */
'use strict'

var _ = require('lodash')
var Eraro = require('eraro')
var Jsonic = require('jsonic')
var Common = require('./common')
var Errors = require('./errors')
var Plugins = require('./plugins')

// Shortcuts
var arrayify = Function.prototype.apply.bind(Array.prototype.slice)

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
    var args = arrayify(arguments)
    var lastArg = args[args.length - 1]
    if (typeof lastArg === 'function') {
      args[args.length - 1] = undefined
    }

    self.log.info.apply(self, _.flatten([
      'listen', args[0], args.slice(1), callpoint()
    ]))

    var opts = self.options().transport || {}
    var config = internals.resolveConfig(internals.parse_config(args), opts)

    self.act(
      'role:transport,cmd:listen',
      { config: config, gate$: true },
      function (err, result) {
        if (err) {
          return self.die(internals.error(err, 'transport_listen', config))
        }

        if (typeof lastArg === 'function') {
          lastArg(null, result)
          lastArg = _.noop
        }
      })

    return self
  }
}

exports.client = function (callpoint) {
  return function api_client () {
    var self = this
    var args = arrayify(arguments)

    self.log.info.apply(self, _.flatten([
      'client', args[0], args.slice(1), callpoint()
    ]))

    var opts = self.options(null, 'client').transport || {}

    var raw_config = internals.parse_config(args)

    // pg: pin group
    raw_config.pg = Common.pincanon(raw_config.pin || raw_config.pins)

    var config = internals.resolveConfig(raw_config, opts)

    config.id = config.id || Common.pattern(raw_config)

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

    var pins = config.pins ||
          (_.isArray(config.pin) ? config.pin : [config.pin || ''])

    pins = _.map(pins, function (pin) {
      return _.isString(pin) ? Jsonic(pin) : pin
    })

    var sd = Plugins.make_delegate(self, { name: 'client$', tag: void 0 })

    var transport_client = function transport_client (msg, done) {
      if (msg.local$) {
        this.prior(msg, done)
      }
      else {
        sendclient.send.call(this, msg, done)
      }
    }

    transport_client.id = config.id

    if (config.makehandle) {
      transport_client.handle = config.makehandle(config)
    }

    _.each(pins, function (pin) {
      pin = _.clone(pin)
      pin.client$ = true
      pin.internal$ = {catchall: true}

      sd.add(pin, transport_client)
    })

    // Create client.
    sd.act(
      'role:transport,cmd:client',
      { config: config, gate$: true },
      function (err, liveclient) {
        if (err) {
          return sd.die(internals.error(err, 'transport_client', config))
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


internals.parse_config = function (args) {
  var out = {}

  var config = args
  var arglen = config.length

  if (arglen === 1) {
    if (_.isObject(config[0])) {
      out = config[0]
    }
    else {
      out.port = parseInt(config[0], 10)
    }
  }
  else if (arglen === 2) {
    out.port = parseInt(config[0], 10)
    out.host = config[1]
  }
  else if (arglen === 3) {
    out.port = parseInt(config[0], 10)
    out.host = config[1]
    out.path = config[2]
  }

  return out
}

internals.resolveConfig = function (config, options) {
  var out = _.clone(config)

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
    out.port = out.port == null ? base.port : out.port
    out.host = out.host == null ? base.host : out.host
    out.path = out.path == null ? base.path : out.path
  }

  return out
}
