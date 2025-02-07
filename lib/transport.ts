/* Copyright © 2015-2022 Richard Rodger and other contributors, MIT License. */


import Util from 'util'
import Http from 'http'

const Https = require('https')
const Qs = require('qs')
const Url = require('url')

const Jsonic = require('jsonic')
const Wreck = require('@hapi/wreck')
const Common = require('./common')

import { Legacy } from './legacy'


// THIS IS NOT A PLUGIN
// DO NOT COPY TO CREATE TRANSPORT PLUGINS
// USE THIS INSTEAD: [TODO github example]

// TODO: handle lists properly, without losing meta data

function transport(seneca: any) {
  seneca.add('role:transport,cmd:listen', action_listen)
  seneca.add('role:transport,cmd:client', action_client)

  seneca.add('role:transport,hook:listen,type:web', hook_listen_web)
  seneca.add('role:transport,hook:client,type:web', hook_client_web)

  const tu: any = {}

  tu.stringifyJSON = stringifyJSON
  tu.parseJSON = parseJSON

  tu.externalize_msg = externalize_msg
  tu.externalize_reply = externalize_reply
  tu.internalize_msg = internalize_msg
  tu.internalize_reply = internalize_reply
  tu.close = closeTransport

  tu.info = function() {
    const pats = seneca.list()
    const acts: any = { local: {}, remote: {} }
    pats.forEach(function(pat: any) {
      const def = seneca.find(pat, { exact: true })
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

function externalize_msg(seneca: any, msg: any, meta: any) {
  if (!msg) return

  if (msg instanceof Error) {
    msg = Legacy.copydata(msg)
  }

  msg.meta$ = meta

  return msg
}

// TODO: handle arrays gracefully - e.g {arr$:[]} as msg
function externalize_reply(seneca: any, err: any, out: any, meta: any) {
  let rep = err || out

  if (!rep) {
    rep = {}
    meta.empty = true
  }

  rep.meta$ = meta

  if (Util.types.isNativeError(rep)) {
    rep = Legacy.copydata(rep)
    rep.meta$.error = true
  }

  return rep
}

// TODO: allow list for inbound directives
function internalize_msg(seneca: any, msg: any) {
  if (!msg) return

  msg = handle_entity(seneca, msg)

  const meta = msg.meta$ || {}
  delete msg.meta$

  // You can't send fatal msgs
  delete msg.fatal$

  msg.id$ = meta.id
  msg.sync$ = meta.sync
  msg.custom$ = meta.custom
  msg.explain$ = meta.explain

  msg.parents$ = meta.parents || []
  msg.parents$.unshift(Common.make_trace_desc(meta))

  msg.remote$ = true

  return msg
}

function internalize_reply(seneca: any, data: any) {
  let meta: any = {}
  let err = null
  let out = null

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
    meta: meta,
  }
}


function stringifyJSON(obj: any) {
  if (!obj) return
  return Common.stringify(obj)
}

function parseJSON(data: any) {
  if (!data) return

  const str = data.toString()

  try {
    return JSON.parse(str)
  } catch (e: any) {
    e.input = str
    return e
  }
}

function handle_entity(seneca: any, msg: any) {
  if (seneca.make$) {
    if (msg.entity$) {
      msg = seneca.make$(msg)
    }

    Object.keys(msg).forEach(function(key) {
      const value = msg[key]
      if (value && 'object' === typeof value && value.entity$) {
        msg[key] = seneca.make$(value)
      }
    })
  }

  return msg
}

function register(config: any, reply: any) {
  return function(this: any, err: any, out: any) {
    this.private$.transport.register.push({
      when: Date.now(),
      config: config,
      err: err,
      res: out,
    })

    reply(err, out)
  }
}

function closeTransport(seneca: any, closer: any) {
  seneca.add('role:seneca,cmd:close', function(this: any, msg: any, reply: any) {
    const seneca = this

    closer.call(seneca, function(err: any) {
      if (err) {
        seneca.log.error(err)
      }

      seneca.prior(msg, reply)
    })
  })
}

function action_listen(this: any, msg: any, reply: any) {
  const seneca = this

  const config = Object.assign({}, msg.config, {
    role: 'transport',
    hook: 'listen',
  })

  delete config.cmd

  const listen_msg = seneca.util.clean(config)

  seneca.act(listen_msg, register(listen_msg, reply))
}

function action_client(this: any, msg: any, reply: any) {
  const seneca = this

  const config = Object.assign({}, msg.config, {
    role: 'transport',
    hook: 'client',
  })

  delete config.cmd

  const client_msg = seneca.util.clean(config)

  seneca.act(client_msg, register(client_msg, reply))
}

function hook_listen_web(this: any, msg: any, reply: any) {
  const seneca = this.root.delegate()
  const transport_options = seneca.options().transport
  const config = seneca.util.deep(msg)

  config.port = null == config.port ? transport_options.port : config.port
  config.modify_response = config.modify_response || web_modify_response

  const server =
    'https' === config.protocol
      ? Https.createServer(config.custom || config.serverOptions)
      : Http.createServer()

  server.on('request', handle_request)

  server.on('error', reply)

  server.on('listening', function() {
    config.port = server.address().port
    reply(config)
  })

  const listener = listen()

  closeTransport(seneca, function(reply: any) {
    if (listener) {
      listener.close()
    }
    reply()
  })

  function listen() {
    const port = (config.port = seneca.util.resolve_option(config.port, config))
    const host = (config.host = seneca.util.resolve_option(config.host, config))

    seneca.log.debug(`transport web listen`, config)

    return server.listen(port, host)
  }

  function handle_request(req: any, res: any) {
    req.setEncoding('utf8')
    req.query = Qs.parse(Url.parse(req.url).query)

    const buf: any = []

    req.on('data', function(chunk: any) {
      buf.push(chunk)
    })

    req.on('end', function() {
      let msg
      const json = buf.join('')
      const body = parseJSON(json)

      if (Util.types.isNativeError(body)) {
        msg = {
          json: json,
          role: 'seneca',
          make: 'error',
          code: 'parseJSON',
          err: body,
        }
      } else {
        msg = Object.assign(
          body,
          req.query && req.query.msg$ ? Jsonic(req.query.msg$) : {},
          req.query || {}
        )
      }

      // backwards compatibility with seneca-transport
      let backwards_compat_origin: any
      const backwards_compat_msgid = !msg.meta$ && req.headers['seneca-id']
      if (backwards_compat_msgid) {
        msg.meta$ = { id: req.headers['seneca-id'] }
        backwards_compat_origin = req.headers['seneca-origin']
      }

      msg = internalize_msg(seneca, msg)

      seneca.act(msg, function(err: any, out: any, meta: any) {
        let spec: any = {
          err: err,
          out: out,
          meta: meta,
          config: config,
        }

        spec.headers = {
          'Content-Type': 'application/json',
          'Cache-Control': 'private, max-age=0, no-cache, no-store',
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

function web_modify_response(seneca: any, spec: any) {
  // JSON cannot handle arbitrary array properties
  if (Array.isArray(spec.out)) {
    spec.out = { array$: spec.out, meta$: spec.out.meta$ }
  }

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
        rejectUnauthorized: false,
      }),
    },
  })
}

function hook_client_web(this: any, msg: any, hook_reply: any) {
  const seneca = this.root.delegate()
  const transport_options = seneca.options().transport
  const config = seneca.util.deep(msg)

  config.port = null == config.port ? transport_options.port : config.port

  config.modify_request = config.modify_request || web_modify_request
    ; (config.port = seneca.util.resolve_option(config.port, config)),
      (config.host = seneca.util.resolve_option(config.host, config))

  config.wreck = seneca.util.resolve_option(config.wreck || makeWreck, config)

  hook_reply({
    config: config,
    send: function(msg: any, reply: any, meta: any) {
      const sending_instance = this

      let spec: any = {
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
          'Content-Type': 'application/json',
        },
      }

      spec = config.modify_request(seneca, spec)
      const wreck_req = config.wreck.request(spec.method, spec.url, spec.wreck)
      wreck_req
        .then(function(res: any) {
          const seneca_reply = function(res: any) {
            // backwards compatibility with seneca-transport
            if (!res.meta$) {
              res.meta$ = {
                id: meta.id,
              }
            }

            // seneca.reply(internalize_reply(sending_instance, res))
            let replySpec = internalize_reply(sending_instance, res)
            reply(replySpec.err, replySpec.out, replySpec.meta)
          }

          const wreck_read = Wreck.read(res, spec.wreck.read)
          wreck_read
            .then(function(body: any) {
              let data = parseJSON(body)

              // JSON cannot handle arbitrary array properties
              if (Array.isArray(data.array$)) {
                const array_data = data.array$
                array_data.meta$ = data.meta$
                data = array_data
              }

              seneca_reply(data)
            })
            .catch(seneca_reply)
        })
        .catch(function(err: any) {
          return reply(err)
        })
    },
  })
}

function web_modify_request(seneca: any, spec: any) {
  let extmsg = externalize_msg(seneca, spec.msg, spec.meta)
  spec.body = stringifyJSON(extmsg)
  spec.headers['Content-Length'] = Buffer.byteLength(spec.body)

  spec.wreck = {
    json: false,
    headers: spec.headers,
    payload: spec.body,
    read: {},
  }

  return spec
}


export {
  transport
}
