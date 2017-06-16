/* Copyright (c) 2017 Richard Rodger and other contributors, MIT License */
'use strict'

var _ = require('lodash')
var Jsonic = require('jsonic')

var Common = require('./common')
var Plugins = require('./plugins')

var errlog = Common.make_standard_err_log_entry

var intern = {}

exports.gate = function gate() {
  return this.delegate({ gate$: true })
}

exports.ungate = function ungate() {
  this.fixedargs.gate$ = false
  return this
}

exports.list_plugins = function list_plugins() {
  return _.clone(this.private$.plugins)
}

exports.find_plugin = function find_plugin(plugindesc, origtag) {
  var name = plugindesc.name || plugindesc
  var tag = plugindesc.tag || origtag

  var key = name + (tag ? '/' + tag : '')
  return this.private$.plugins[key]
}

exports.has_plugin = function has_plugin(plugindesc, origtag) {
  var tag = origtag === '' || origtag === '-' ? null : origtag
  return !!this.find_plugin(plugindesc, tag)
}

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

// Get the current status of the instance.
exports.status = function(flags) {
  flags = flags || {}

  var hist = this.private$.history.stats()
  hist.log = this.private$.history.list()

  var status = {
    stats: this.stats(flags.stats),
    history: hist,
    transport: this.private$.transport
  }

  return status
}

// Reply to an action that is waiting for a result.
// Used by transports to decouple sending messages from receiving responses.
exports.reply = function(spec) {
  var instance = this

  var item = null

  if (spec && spec.meta) {
    item = instance.private$.history.get(spec.meta.id)
    if (item) {
      item.reply(spec.err, spec.out, spec.meta)
    }
  }

  return !!item
}

// Listen for inbound messages.
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
    var config = intern.resolve_config(intern.parse_config(argsarr), opts)

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

// Send outbound messages.
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

    var legacy = self.options().legacy || {}
    var opts = self.options().transport || {}

    var raw_config = intern.parse_config(argsarr)

    // pg: pin group
    raw_config.pg = Common.pincanon(raw_config.pin || raw_config.pins)

    var config = intern.resolve_config(raw_config, opts)

    config.id = config.id || Common.pattern(raw_config)

    var pins =
      config.pins || (_.isArray(config.pin) ? config.pin : [config.pin || ''])

    pins = _.map(pins, function(pin) {
      return _.isString(pin) ? Jsonic(pin) : pin
    })

    var sd = Plugins.make_delegate(self, { name: 'client$', tag: void 0 })

    var sendclient

    var transport_client = function transport_client(msg, reply, meta) {
      if (legacy.meta) {
        meta = meta || msg.meta$
      }

      // Undefined plugin init actions pass through here when
      // there's a catchall client, as they have local$:true
      if (meta.local) {
        this.prior(msg, reply, meta)
      } else if (sendclient && sendclient.send) {
        if (legacy.meta) {
          msg.meta$ = meta
        }

        sendclient.send.call(this, msg, reply, meta)
      } else {
        // TODO: proper eraro
        console.log('CL MISSING', msg)
      }
    }

    transport_client.id = config.id

    if (config.makehandle) {
      transport_client.handle = config.makehandle(config)
    }

    _.each(pins, function(pin) {
      pin = _.clone(pin)
      pin.client$ = true

      sd.add(pin, transport_client)
    })

    // Create client.
    sd.act(
      'role:transport,cmd:client',
      { config: config, gate$: true },
      function(err, liveclient) {
        //console.log(this.id,'CL RES',err,liveclient)

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

// Subscribe to messages.
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
    private$.handle_sub = function handle_sub(msg, result, meta) {
      // only entry msg of prior chain is published
      if (meta && meta.prior) {
        return
      }

      var subfuncs = private$.subrouter.find(msg)

      if (subfuncs) {
        meta.sub = subfuncs.pattern

        _.each(subfuncs, function subfunc(subfunc) {
          try {
            subfunc.call(self, msg, result, meta)
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
                actid: meta.id
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
    return function annotation(origmsg, result, meta) {
      //console.log('SUBANNO',arguments)

      var msg = _.clone(origmsg)
      result = _.clone(result)
      msg[prop] = true
      handle_sub(msg, result, meta)
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

intern.parse_config = function(args) {
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

intern.resolve_config = function(config, options) {
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
