/* Copyright (c) 2010-2017 Richard Rodger and other contributors, MIT License */
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

module.exports = function(seneca) {
  seneca.add('role:transport,cmd:listen', action_listen)
  seneca.add('role:transport,cmd:client', action_client)

  seneca.add('role:transport,hook:listen,type:web', hook_listen_web)
  seneca.add('role:transport,hook:client,type:web', hook_client_web)

  var tu = (seneca.private$.exports['transport/utils'] = seneca.private$
    .exports['transport/utils'] || {})

  tu.stringifyJSON = stringifyJSON
  tu.parseJSON = parseJSON

  tu.externalize_msg = externalize_msg
  tu.externalize_reply = externalize_reply
  tu.internalize_msg = internalize_msg
  tu.internalize_reply = internalize_reply
  tu.close = close
}

function externalize_msg(msg) {
  if (!msg) return

  msg.meta$ = msg.meta$

  if (_.isError(msg)) {
    msg = Common.copydata(msg)
  }

  // console.log('EM',msg)

  return msg
}

function externalize_reply(out, meta) {
  if (!out) {
    out = { meta$: meta }
    meta.empty = true
  } else {
    // de-prototype
    out.meta$ = out.meta$
  }

  if (_.isError(out)) {
    out = Common.copydata(out)
    out.meta$.error = true
  }

  return out
}

function internalize_msg(msg) {
  if (!msg) return

  var meta = msg.meta$ || {}
  delete msg.meta$
  Common.setmeta(msg, meta)

  msg.id$ = msg.meta$.id
  msg.parents$ = msg.meta$.parents
  msg.parents$.unshift(Common.make_trace_desc(meta))

  // TODO: handle entity

  //console.log('IM',msg)

  return msg
}

function internalize_reply(out) {
  var empty = false

  if (!out) {
    out = {}
    empty = true
  }

  var meta = out.meta$ || {}
  delete out.meta$

  if (meta.error) {
    var err = new Error(out.message)
    var pn = Object.getOwnPropertyNames(out)
    for (var i = 0; i < pn.length; i++) {
      var p = pn[i]
      err[p] = out[p]
    }
    out = err
  }

  Common.setmeta(out, meta)
  out.__proto__.trace$ = true

  if (empty) {
    out.__proto__.empty$ = true
  }

  // TODO: handle entity

  return out
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
  listen_msg.seneca = seneca.root.delegate()

  seneca.act(listen_msg, register(listen_msg, reply))
}

function action_client(msg, reply) {
  var seneca = this

  var config = _.extend({}, msg.config, { role: 'transport', hook: 'client' })
  var client_msg = seneca.util.clean(_.omit(config, 'cmd'))
  client_msg.seneca = seneca.root.delegate()

  seneca.act(client_msg, register(client_msg, reply))
}

function hook_listen_web(msg, reply) {
  var seneca = msg.seneca
  var config = _.clone(msg)

  config.modify_response = config.modify_response || web_modify_response

  var server = 'https' === config.protocol
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

      msg = internalize_msg(msg)

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

        spec = config.modify_response(spec)

        res.writeHead(spec.status, spec.headers)
        res.end(spec.body)
      })
    })
  }
}

function web_modify_response(spec) {
  spec.body = stringifyJSON(externalize_reply(spec.err || spec.out, spec.meta))
  spec.headers['Content-Length'] = Buffer.byteLength(spec.body)
  return spec
}

function hook_client_web(msg, reply) {
  var seneca = msg.seneca
  var config = _.clone(msg)

  config.modify_request = config.modify_request || web_modify_request
  ;(config.port = seneca.util.resolve_option(
    config.port,
    config
  )), (config.host = seneca.util.resolve_option(config.host, config))

  config.wreck = seneca.util.resolve_option(config.wreck || Wreck, config)

  reply({
    config: config,
    send: function(msg, reply) {
      var spec = {
        msg: msg,
        url: config.protocol +
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

      spec = config.modify_request(spec)

      config.wreck.request(spec.method, spec.url, spec.wreck, function(
        err,
        res
      ) {
        if (err) {
          return reply(err)
        }

        Wreck.read(res, spec.wreck.read, function(err, body) {
          reply(internalize_reply(err || parseJSON(body)))
        })
      })
    }
  })
}

function web_modify_request(spec) {
  spec.body = stringifyJSON(externalize_msg(spec.msg))
  spec.headers['Content-Length'] = Buffer.byteLength(spec.body)

  spec.wreck = {
    json: false,
    headers: spec.headers,
    payload: spec.body,
    read: {}
  }

  return spec
}
