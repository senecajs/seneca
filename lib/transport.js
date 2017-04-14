/* Copyright (c) 2010-2017 Richard Rodger and other contributors, MIT License */
'use strict'

var Http = require('http')
var Https = require('https')
var Qs = require('qs')
var Url = require('url')

var _ = require('lodash')
var Jsonic = require('jsonic')
var Wreck = require('wreck')

module.exports = function(seneca) {
  seneca.add('role:transport,cmd:listen', action_listen)
  seneca.add('role:transport,cmd:client', action_client)

  seneca.add('role:transport,hook:listen,type:web', hook_listen_web)
  seneca.add('role:transport,hook:client,type:web', hook_client_web)
}

function action_listen(msg, reply) {
  var seneca = this

  var config = _.extend({}, msg.config, { role: 'transport', hook: 'listen' })
  var listen_msg = seneca.util.clean(_.omit(config, 'cmd'))

  seneca.act(listen_msg, reply)
}

function action_client(msg, reply) {
  var seneca = this

  var config = _.extend({}, msg.config, { role: 'transport', hook: 'client' })
  var client_msg = seneca.util.clean(_.omit(config, 'cmd'))

  seneca.act(client_msg, reply)
}


function hook_listen_web(msg, reply) {
  var opts = msg
  var seneca = this

  var server = Http.createServer()

  server.on('request', handle_request)
  server.on('error', console.log)
  server.on('listening', function() {
    reply()
  })

  server.listen(opts.port)

  function handle_request(req, res) {
    req.setEncoding('utf8')
    req.query = Qs.parse(Url.parse(req.url).query)

    var buf = []

    req.on('data', function(chunk) {
      buf.push(chunk)
    })

    req.on('end', function() {
      var msg = _.extend(
        JSON.parse(buf.join('')),
        req.query && req.query.msg$ ? Jsonic(req.query.msg$) : {},
        req.query || {}
      )

      seneca.act(msg, function(err, out) {
        var outjson = JSON.stringify(out)

        var headers = {
          'Content-Type': 'application/json',
          'Cache-Control': 'private, max-age=0, no-cache, no-store',
          'Content-Length': Buffer.byteLength(outjson)
        }

        res.writeHead(200, headers)
        res.end(outjson)
      })
    })
  }
}

function hook_client_web(msg, reply) {
  var opts = msg
  var seneca = this

  reply({
    send: function(msg, reply) {
      var url = 'http://127.0.0.1:'+opts.port+'/act'
      var body = JSON.stringify(msg)
      var headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
      var requestOptions = {
        json: true,
        headers: headers,
        payload: body
      }

      Wreck.post(url, requestOptions, function (err, res, payload) {
        reply(err, payload)
      })
    }
  })
}


// TODO: tcp
// seneca.reply(msgid) returns reply function for given message
