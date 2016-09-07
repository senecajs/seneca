/* Copyright (c) 2014-2016 Richard Rodger, MIT License */
'use strict'

var _ = require('lodash')
var Async = require('async')
var Util = require('util')


exports.make_test_transport = make_test_transport
exports.make_balance_transport = make_balance_transport


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

      tu.listen_topics(seneca, args, listen_options, function (topic) {
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

        send_done(null, function (args, done) {
          if (!test_transport.queuemap[topic + '_act']) {
            return done(new Error('Unknown topic:' + topic +
                                  ' for: ' + Util.inspect(args)))
          }
          var outmsg = tu.prepare_request(seneca, args, done)
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
            return function (pat, action) {
              targets.push(action)
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

        send_done(null, function (args, done) {
          index = (index + 1) % targets.length
          targets[index].call(this, args, done)
        })
      }

      seneca.add('role:seneca,cmd:close', function (close_args, done) {
        var closer = this
        closer.prior(close_args, done)
      })
    }
  }
}
