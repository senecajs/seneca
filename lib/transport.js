/* Copyright © 2015-2018 Richard Rodger and other contributors, MIT License. */
'use strict'

var Http = require('http')
var Https = require('https')
var Qs = require('qs')
var Url = require('url')

var _ = require('lodash')
var Jsonic = require('jsonic')
var Wreck = require('wreck')
var JSS = require('json-stringify-safe')

var Common = require('./common')

// THIS IS NOT A PLUGIN
// DO NOT COPY TO CREATE TRANSPORT PLUGINS
// USE THIS INSTEAD: [TODO github example]

// TODO: handle lists properly, without losing meta data

module.exports = function(seneca) {
  seneca.add('role:transport,cmd:listen', action_listen)
  seneca.add('role:transport,cmd:client', action_client)

  seneca.add('role:transport,hook:listen,type:web', hook_listen_web)
  seneca.add('role:transport,hook:client,type:web', hook_client_web)

  var tu = {}

  tu.stringifyJSON = stringifyJSON
  tu.parseJSON = parseJSON

  tu.externalize_msg = externalize_msg
  tu.externalize_reply = externalize_reply
  tu.internalize_msg = internalize_msg
  tu.internalize_reply = internalize_reply
  tu.close = close

  tu.info = function() {
    var pats = seneca.list()
    var acts = { local: {}, remote: {} }
    pats.forEach(function(pat) {
      var def = seneca.find(pat, { exact: true })
      if (def.client) {
        acts.remote[def.pattern] = def.id
      } else {
        acts.local[def.pattern] = def.id
      }
    })
    return acts
  }

  seneca.private$.exports['transport/utils'] = tu
}

function externalize_msg(seneca, msg, meta) {
  if (!msg) return

  if (msg instanceof Error) {
    msg = Common.copydata(msg)
  }

  msg.meta$ = meta

  return msg
}

function externalize_reply(seneca, err, out, meta) {
  var rep = err || out

  if (!rep) {
    rep = {}
    meta.empty = true
  }

  rep.meta$ = meta

  if (_.isError(rep)) {
    rep = Common.copydata(rep)
    rep.meta$.error = true
  }

  return rep
}

function internalize_msg(seneca, msg) {
  if (!msg) return

  msg = handle_entity(seneca, msg)

  var meta = msg.meta$ || {}
  delete msg.meta$

  // You can't send fatal msgs
  delete msg.fatal$

  msg.id$ = meta.id
  msg.sync$ = meta.sync
  msg.custom$ = meta.custom

  msg.parents$ = meta.parents || []
  msg.parents$.unshift(Common.make_trace_desc(meta))

  msg.remote$ = true

  return msg
}

function internalize_reply(seneca, data) {
  var meta = {}
  var err = null
  var out = null

  if (data) {
    meta = data.meta$

    if (meta) {
      delete data.meta$

      meta.remote = true

      if (meta.error) {
        err = new Error(data.message)
        Object.assign(err, data)
      } else if (!meta.empty) {
        out = handle_entity(seneca, data)
      }
    }
  }

  return {
    err: err,
    out: out,
    meta: meta
  }
}

function stringifyJSON(obj) {
  if (!obj) return

  try {
    return JSON.stringify(obj)
  } catch (e) {
    return JSS(obj)
  }
}

function parseJSON(data) {
  if (!data) return

  var str = data.toString()

  try {
    return JSON.parse(str)
  } catch (e) {
    e.input = str
    return e
  }
}

function handle_entity(seneca, msg) {
  if (seneca.make$) {
    if (msg.entity$) {
      msg = seneca.make$(msg)
    }

    Object.keys(msg).forEach(function(key) {
      var value = msg[key]
      if (_.isObject(value) && value.entity$) {
        msg[key] = seneca.make$(value)
      }
    })
  }

  return msg
}

function register(config, reply) {
  return function(err, out) {
    this.private$.transport.register.push({
      when: Date.now(),
      config: config,
      err: err,
      res: out
    })

    reply(err, out)
  }
}

function close(seneca, closer) {
  seneca.add('role:seneca,cmd:close', function(msg, reply) {
    var seneca = this

    closer.call(seneca, function(err) {
      if (err) {
        seneca.log.error(err)
      }

      seneca.prior(msg, reply)
    })
  })
}

function action_listen(msg, reply) {
  var seneca = this

  var config = _.extend({}, msg.config, { role: 'transport', hook: 'listen' })
  var listen_msg = seneca.util.clean(_.omit(config, 'cmd'))
  //listen_msg.seneca = seneca.root.delegate()

  seneca.act(listen_msg, register(listen_msg, reply))
}

function action_client(msg, reply) {
  var seneca = this

  var config = _.extend({}, msg.config, { role: 'transport', hook: 'client' })
  var client_msg = seneca.util.clean(_.omit(config, 'cmd'))

  seneca.act(client_msg, register(client_msg, reply))
}

function hook_listen_web(msg, reply) {
  //var seneca = msg.seneca
  var seneca = this.root.delegate()
  var config = _.clone(msg)

  config.modify_response = config.modify_response || web_modify_response

  var server =
    'https' === config.protocol
      ? Https.createServer(config.custom || config.serverOptions)
      : Http.createServer()

  server.on('request', handle_request)

  server.on('error', reply)

  server.on('listening', function() {
    config.port = server.address().port
    reply(config)
  })

  var listener = listen()

  close(seneca, function(reply) {
    if (listener) {
      listener.close()
    }
    reply()
  })

  function listen() {
    return server.listen(
      (config.port = seneca.util.resolve_option(config.port, config)),
      (config.host = seneca.util.resolve_option(config.host, config))
    )
  }

  function handle_request(req, res) {
    req.setEncoding('utf8')
    req.query = Qs.parse(Url.parse(req.url).query)

    var buf = []

    req.on('data', function(chunk) {
      buf.push(chunk)
    })

    req.on('end', function() {
      var msg
      var json = buf.join('')
      var body = parseJSON(json)

      if (_.isError(body)) {
        msg = {
          json: json,
          role: 'seneca',
          make: 'error',
          code: 'parseJSON',
          err: body
        }
      } else {
        msg = _.extend(
          body,
          req.query && req.query.msg$ ? Jsonic(req.query.msg$) : {},
          req.query || {}
        )
      }

      // backwards compatibility with seneca-transport
      var backwards_compat_origin
      var backwards_compat_msgid = !msg.meta$ && req.headers['seneca-id']
      if (backwards_compat_msgid) {
        msg.meta$ = { id: req.headers['seneca-id'] }
        backwards_compat_origin = req.headers['seneca-origin']
      }

      msg = internalize_msg(seneca, msg)

      seneca.act(msg, function(err, out, meta) {
        var spec = {
          err: err,
          out: out,
          meta: meta,
          config: config
        }

        spec.headers = {
          'Content-Type': 'application/json',
          'Cache-Control': 'private, max-age=0, no-cache, no-store'
        }

        spec.status = err ? 500 : 200

        spec = config.modify_response(seneca, spec)

        // backwards compatibility with seneca-transport
        if (backwards_compat_msgid) {
          spec.headers['seneca-id'] = backwards_compat_msgid
          spec.headers['seneca-origin'] = backwards_compat_origin
        }

        res.writeHead(spec.status, spec.headers)
        res.end(spec.body)
      })
    })
  }
}

function web_modify_response(seneca, spec) {
  spec.body = stringifyJSON(
    externalize_reply(seneca, spec.err, spec.out, spec.meta)
  )
  spec.headers['Content-Length'] = Buffer.byteLength(spec.body)
  return spec
}

function makeWreck() {
  return Wreck.defaults({
    agents: {
      http: new Http.Agent({ keepAlive: true, maxFreeSockets: Infinity }),
      https: new Https.Agent({ keepAlive: true, maxFreeSockets: Infinity }),
      httpsAllowUnauthorized: new Https.Agent({
        keepAlive: true,
        maxFreeSockets: Infinity,
        rejectUnauthorized: false
      })
    }
  })
}

function hook_client_web(msg, hook_reply) {
  var seneca = this.root.delegate()
  var config = _.clone(msg)

  config.modify_request = config.modify_request || web_modify_request
  ;(config.port = seneca.util.resolve_option(config.port, config)),
    (config.host = seneca.util.resolve_option(config.host, config))

  config.wreck = seneca.util.resolve_option(config.wreck || makeWreck, config)

  hook_reply({
    config: config,
    send: function(msg, reply, meta) {
      var sending_instance = this

      var spec = {
        msg: msg,
        meta: meta,
        url:
          config.protocol +
          '://' +
          config.host +
          ':' +
          config.port +
          config.path,
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        }
      }

      spec = config.modify_request(seneca, spec)

      config.wreck.request(spec.method, spec.url, spec.wreck, function(
        err,
        res
      ) {
        // TODO: should use seneca.reply
        if (err) {
          return reply(err)
        }

        Wreck.read(res, spec.wreck.read, function(err, body) {
          // TODO: how is this error handled?
          var data = err || parseJSON(body)

          // backwards compatibility with seneca-transport
          if (!data.meta$) {
            data.meta$ = {
              id: meta.id
            }
          }

          seneca.reply(internalize_reply(sending_instance, data))
        })
      })
    }
  })
}

function web_modify_request(seneca, spec) {
  spec.body = stringifyJSON(externalize_msg(seneca, spec.msg, spec.meta))
  spec.headers['Content-Length'] = Buffer.byteLength(spec.body)

  spec.wreck = {
    json: false,
    headers: spec.headers,
    payload: spec.body,
    read: {}
  }

  return spec
}
