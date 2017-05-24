/* Copyright (c) 2017 Richard Rodger and other contributors, MIT License */
'use strict'

var _ = require('lodash')
var Jsonic = require('jsonic')

var Common = require('./common')
var Plugins = require('./plugins')

var errlog = Common.make_standard_err_log_entry

// Find the action metadata for a given pattern, if it exists.
exports.find = function(pattern, flags) {
  var seneca = this

  var pat = _.isString(pattern) ? Jsonic(pattern) : pattern
  pat = seneca.util.clean(pat)
  pat = pat || {}

  var actdef = seneca.private$.actrouter.find(pat, flags && flags.exact)

  if (!actdef) {
    actdef = seneca.private$.actrouter.find({})
  }

  return actdef
}

// True if an action matching the pattern exists.
exports.has = function(pattern) {
  return !!this.find(pattern, { exact: true })
}

// List all actions that match the pattern.
exports.list = function(pattern) {
  return _.map(
    this.private$.actrouter.list(null == pattern ? {} : Jsonic(pattern)),
    'match'
  )
}

exports.status = function(flags) {
  flags = flags || {}

  var hist = this.private$.history.stats(flags.history)
  hist.log = this.private$.history.list(flags.history)

  var status = {
    stats: this.stats(flags.stats),
    history: hist,
    transport: this.private$.transport
  }

  return status
}

exports.reply = function(rep) {
  var instance = this

  var item = null

  if (rep && rep.meta$) {
    item = instance.private$.history.get(rep.meta$.id)
    if (item) {
      item.reply(rep.empty$ || rep.meta$.empty ? null : rep)
    }
  }

  return !!item
}

exports.listen = function(callpoint) {
  return function api_listen() {
    var private$ = this.private$

    var argsarr = new Array(arguments.length)
    for (var l = 0; l < argsarr.length; ++l) {
      argsarr[l] = arguments[l]
    }

    var self = this
    var lastArg = _.last(argsarr)
    if (typeof lastArg === 'function') {
      argsarr.pop()
    }

    self.log.debug({
      kind: 'listen',
      options: argsarr,
      callpoint: callpoint()
    })

    var opts = self.options().transport || {}
    var config = resolveConfig(parse_config(argsarr), opts)

    self.act(
      'role:transport,cmd:listen',
      { config: config, gate$: true },
      function(err, result) {
        if (err) {
          return self.die(private$.error(err, 'transport_listen', config))
        }

        if (typeof lastArg === 'function') {
          lastArg(null, result)
          lastArg = _.noop
        }
      }
    )

    return self
  }
}

exports.client = function(callpoint) {
  return function api_client() {
    var private$ = this.private$

    var argsarr = new Array(arguments.length)
    for (var l = 0; l < argsarr.length; ++l) {
      argsarr[l] = arguments[l]
    }

    var self = this

    self.log.debug({
      kind: 'client',
      options: argsarr,
      callpoint: callpoint()
    })

    var opts = self.options(null).transport || {}

    var raw_config = parse_config(argsarr)

    // pg: pin group
    raw_config.pg = Common.pincanon(raw_config.pin || raw_config.pins)

    var config = resolveConfig(raw_config, opts)

    config.id = config.id || Common.pattern(raw_config)

    var pins =
      config.pins || (_.isArray(config.pin) ? config.pin : [config.pin || ''])

    pins = _.map(pins, function(pin) {
      return _.isString(pin) ? Jsonic(pin) : pin
    })

    var sd = Plugins.make_delegate(self, { name: 'client$', tag: void 0 })

    var sendclient

    var transport_client = function transport_client(msg, done) {
      if (msg.meta$.local) {
        this.prior(msg, done)
      } else if(sendclient && sendclient.send) {
        sendclient.send.call(this, msg, done)
      }
      else {
        // TODO: proper eraro
        console.log('CL MISSING', msg)
      }
    }

    transport_client.id = config.id

    if (config.makehandle) {
      transport_client.handle = config.makehandle(config)
    }

    //console.log('CL mid', pins, config, sd.list('role:transport'))

    _.each(pins, function(pin) {
      pin = _.clone(pin)
      pin.client$ = true

      //console.log('CL ADDPIN', pin)
      sd.add(pin, transport_client)
    })


    // Create client.
    sd.act(
      'role:transport,cmd:client',
      { config: config, gate$: true },
      function(err, liveclient) {
        //console.log('CL cmdres',err,liveclient)

        if (err) {
          return sd.die(private$.error(err, 'transport_client', config))
        }

        if (null == liveclient) {
          return sd.die(
            private$.error('transport_client_null', Common.clean(config))
          )
        }

        sendclient = liveclient
      }
    )

    return self
  }
}

exports.sub = function() {
  var self = this
  var private$ = self.private$

  var subargs = Common.parsePattern(self, arguments, 'action:f actdef:o?')
  var pattern = subargs.pattern
  if (
    pattern.in$ == null &&
    pattern.out$ == null &&
    pattern.error$ == null &&
    pattern.cache$ == null &&
    pattern.default$ == null &&
    pattern.client$ == null
  ) {
    pattern.in$ = true
  }

  if (!private$.handle_sub) {
    private$.handle_sub = function handle_sub(msg, result) {
      if (!msg.meta$) {
        Common.setmeta(msg, {})
      }

      // only entry msg of prior chain is published
      if (msg.meta$.prior) {
        return
      }

      var subfuncs = private$.subrouter.find(msg)

      if (subfuncs) {
        msg.meta$.sub = subfuncs.pattern

        _.each(subfuncs, function subfunc(subfunc) {
          try {
            subfunc.call(self, msg, result)
          } catch (ex) {
            // TODO: not really satisfactory
            var err = private$.error(ex, 'sub_function_catch', {
              args: msg,
              result: result
            })
            self.log.error(
              errlog(err, {
                kind: 'sub',
                msg: msg,
                actid: msg.meta$.id
              })
            )
          }
        })
      }
    }

    // TODO: other cases

    // Subs are triggered via events
    self.on('act-in', annotate('in$', private$.handle_sub))
    self.on('act-out', annotate('out$', private$.handle_sub))
  }

  function annotate(prop, handle_sub) {
    return function annotation(msg, result) {
      msg = _.clone(msg)
      result = _.clone(result)
      msg[prop] = true
      handle_sub(msg, result)
    }
  }

  var subs = private$.subrouter.find(pattern)
  if (!subs) {
    private$.subrouter.add(pattern, (subs = []))
    subs.pattern = Common.pattern(pattern)
  }
  subs.push(subargs.action)

  return self
}

function parse_config(args) {
  var out = {}

  var config = _.compact(args)

  var arglen = config.length

  if (arglen === 1) {
    if (_.isObject(config[0])) {
      out = _.clone(config[0])
    } else {
      out.port = parseInt(config[0], 10)
    }
  } else if (arglen === 2) {
    out.port = parseInt(config[0], 10)
    out.host = config[1]
  } else if (arglen === 3) {
    out.port = parseInt(config[0], 10)
    out.host = config[1]
    out.path = config[2]
  }

  return out
}

function resolveConfig(config, options) {
  var out = _.clone(config)

  _.each(options, function(value, key) {
    if (_.isObject(value)) {
      return
    }
    out[key] = out[key] === void 0 ? value : out[key]
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
