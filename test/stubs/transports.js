/* Copyright (c) 2014-2017 Richard Rodger, MIT License */
'use strict'

var _ = require('lodash')
var Async = require('async')
var Util = require('util')


exports.make_test_transport = make_test_transport
exports.make_balance_transport = make_balance_transport
exports.make_simple_transport = make_simple_transport


// A simple transport that uses async.queue as the transport mechanism
function make_test_transport () {
  test_transport.outmsgs = []
  test_transport.queuemap = {}

  return test_transport

  function test_transport (options) {
    var seneca = this

    var tu = seneca.export('transport/utils')

    seneca.add({role: 'transport', hook: 'listen', type: 'test'}, hook_listen_test)
    seneca.add({role: 'transport', hook: 'client', type: 'test'}, hook_client_test)

    function hook_listen_test (args, done) {
      var seneca = this
      var type = args.type
      var listen_options = seneca.util.clean(_.extend({}, options[type], args))

      tu.listen_topics(seneca, seneca.util.clean(args), listen_options, function (topic) {
        seneca.log.debug('listen', 'subscribe', topic + '_act',
                         listen_options, seneca)

        test_transport.queuemap[topic + '_act'] = Async.queue(function (data, done) {
          tu.handle_request(seneca, data, listen_options, function (out) {
            if (out == null) return done()

            test_transport.outmsgs.push(out)

            test_transport.queuemap[topic + '_res'].push(out)
            return done()
          })
        })
      })

      seneca.add('role:seneca,cmd:close', function (close_args, done) {
        var closer = this
        closer.prior(close_args, done)
      })

      seneca.log.info('listen', 'open', listen_options, seneca)

      done()
    }

    function hook_client_test (args, clientdone) {
      var seneca = this
      var type = args.type
      var client_options = seneca.util.clean(_.extend({}, options[type], args))

      tu.make_client(make_send, client_options, clientdone)

      function make_send (spec, topic, send_done) {
        seneca.log.debug('client', 'subscribe', topic + '_res', client_options, seneca)

        test_transport.queuemap[topic + '_res'] = Async.queue(function (data, done) {
          tu.handle_response(seneca, data, client_options)
          return done()
        })

        send_done(null, function (args, done, meta) {
          if (!test_transport.queuemap[topic + '_act']) {
            return done(new Error('Unknown topic:' + topic +
                                  ' for: ' + Util.inspect(args)))
          }
          var outmsg = tu.prepare_request(seneca, args, done, meta)
          test_transport.queuemap[topic + '_act'].push(outmsg)
        })
      }

      seneca.add('role:seneca,cmd:close', function (close_args, done) {
        var closer = this
        closer.prior(close_args, done)
      })
    }
  }
}


// A simple load balancing transport
function make_balance_transport () {
  var targets = []

  test_transport.preload = function () {
    this.options({
      transport: {
        balance: {
          makehandle: function () {
            /*
            return function (pat, action) {
              targets.push(action)
            }
            */

            return function (actdef) {
              targets.push(actdef.func)
            }

          }
        }
      }
    })
  }

  return test_transport

  function test_transport (options) {
    var seneca = this

    var tu = seneca.export('transport/utils')

    seneca.add({
      role: 'transport', hook: 'client', type: 'balance'
    }, hook_client_test)

    function hook_client_test (args, clientdone) {
      var seneca = this
      var type = args.type
      var client_options = seneca.util.clean(_.extend({}, options[type], args))

      tu.make_client(make_send, client_options, clientdone)

      var index = -1

      function make_send (spec, topic, send_done) {
        seneca.log.debug('client', 'send', topic + '_res', client_options, seneca)

        send_done(null, function (args, done, meta) {
          index = (index + 1) % targets.length
          targets[index].call(this, args, done, meta)
        })
      }

      seneca.add('role:seneca,cmd:close', function (close_args, done) {
        var closer = this
        closer.prior(close_args, done)
      })
    }
  }
}



// A simple transport that uses async.queue as the transport mechanism
function make_simple_transport () {
  simple_transport.queuemap = {}

  return simple_transport

  function simple_transport (options) {
    var seneca = this
    var tu = seneca.export('transport/utils')

    seneca.add('role:transport,hook:listen,type:simple', hook_listen_simple)
    seneca.add('role:transport,hook:client,type:simple', hook_client_simple)

    function hook_listen_simple (config, ready) {
      var seneca = this.root.delegate()

      function handle_msg(data, done) {
        var msg = tu.internalize_msg(seneca, JSON.parse(data))

        seneca.act(msg, function (err, out, meta) {
          var rep = JSON.stringify(tu.externalize_reply(seneca, err, out, meta))

          simple_transport.queuemap[config.pin+'~OUT'].push(rep) 
        })

        return done()
      }

      simple_transport.queuemap[config.pin+'~IN'] = Async.queue(handle_msg)
      return ready(config)
    }

    function hook_client_simple (config, ready) {
      var seneca = this.root.delegate()

      function send_msg(msg, reply_not_used_here, meta) {
        simple_transport.queuemap[config.pin+'~OUT'] = Async.queue(handle_reply)

        var msg = JSON.stringify(tu.externalize_msg(seneca, msg, meta))
        //console.log('ST CS', msg)

        simple_transport.queuemap[config.pin+'~IN'].push(msg) 
      }

      function handle_reply(data, done) {
        var rep = tu.internalize_reply(seneca,JSON.parse(data))
        //console.log('ST CR', rep)

        seneca.reply(rep)
        return done()
      }

      return ready({
        config: config,
        send: send_msg
      })
    }
  }
}
