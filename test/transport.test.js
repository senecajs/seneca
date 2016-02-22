/* Copyright (c) 2014-2015 Richard Rodger, MIT License */
'use strict'

var Util = require('util')
var _ = require('lodash')
var Async = require('async')
var Code = require('code')
var Seneca = require('..')
var Common = require('../lib/common')
var Transport = require('../lib/transport')
var Lab = require('lab')

// Test shortcuts
var lab = exports.lab = Lab.script()
var describe = lab.describe
var it = lab.it
var expect = Code.expect

function testact (args, done) {
  var seneca = this
  setTimeout(function () {
    var out = seneca.util.clean(_.clone(args))
    out.bar = out.bar + 1

    if (out.baz) {
      out.qoo = out.qoo + 10
      delete out.bar
    }

    done(null, out)
  }, 11)
}

describe('transport', function () {
  // TODO: test top level qaz:* : def and undef other pats
  lab.beforeEach(function (done) {
    process.removeAllListeners('SIGHUP')
    process.removeAllListeners('SIGTERM')
    process.removeAllListeners('SIGINT')
    process.removeAllListeners('SIGBREAK')
    done()
  })

  describe('listen()', function () {
    it('supports null options', function (done) {
      var listen = Transport.listen(_.noop)
      var seneca = {
        log: {
          info: function () {

          }
        },
        options: function () {
          return {}
        },
        act: _.noop,
        context: {}
      }

      var fn = function () {
        listen.call(seneca)
      }
      expect(fn).to.not.throw()
      done()
    })

    it('supports type as tcp option', function (done) {
      var listen = Transport.listen(_.noop)
      var seneca = {
        log: {
          info: function () {

          }
        },
        options: function () {
          return {
            type: 'tcp'
          }
        },
        act: _.noop,
        context: {}
      }

      var fn = function () {
        listen.call(seneca, 8080, 'localhost', '/')
      }
      expect(fn).to.not.throw()
      done()
    })

    it('supports type as http option', function (done) {
      var listen = Transport.listen(_.noop)
      var seneca = {
        log: {
          info: function () {

          }
        },
        options: function () {
          return {
            type: 'http'
          }
        },
        act: _.noop,
        context: {}
      }

      var fn = function () {
        listen.call(seneca, 8080, 'localhost', '/')
      }
      expect(fn).to.not.throw()
      done()
    })

    it('supports the port number as an argument', function (done) {
      var listen = Transport.listen(_.noop)
      var seneca = {
        log: {
          info: function () {

          }
        },
        options: function () {
          return {}
        },
        act: _.noop,
        context: {}
      }

      var fn = function () {
        listen.call(seneca, 8080)
      }
      expect(fn).to.not.throw()
      done()
    })

    it('supports the port number and host as an argument', function (done) {
      var listen = Transport.listen(_.noop)
      var seneca = {
        log: {
          info: function () {

          }
        },
        options: function () {
          return {}
        },
        act: _.noop,
        context: {}
      }

      var fn = function () {
        listen.call(seneca, 8080, 'localhost')
      }
      expect(fn).to.not.throw()
      done()
    })

    it('supports the port number, host, and path as an argument', function (done) {
      var listen = Transport.listen(_.noop)
      var seneca = {
        log: {
          info: function () {

          }
        },
        options: function () {
          return {}
        },
        act: _.noop,
        context: {}
      }

      var fn = function () {
        listen.call(seneca, 8080, 'localhost', '/')
      }
      expect(fn).to.not.throw()
      done()
    })

    it('handles errors from action', function (done) {
      var listen = Transport.listen(_.noop)
      var seneca = {
        log: {
          info: function () {

          }
        },
        options: function () {
          return {}
        },
        act: function (pattern, options, callback) {
          callback(new Error())
        },
        die: function (err) {
          expect(err).to.exist()
          done()
        },
        context: {}
      }

      listen.call(seneca)
    })
  })

  describe('client()', function () {
    it('supports null options', function (done) {
      var client = Transport.client(_.noop, function () { return _.noop })
      var seneca = {
        log: {
          info: function () {

          }
        },
        options: function () {
          return {}
        },
        act: _.noop,
        delegate: function () {
          return Object.create(this)
        },
        add: _.noop,
        context: {}
      }

      var fn = function () {
        client.call(seneca)
      }

      expect(fn).to.not.throw()
      done()
    })

    it('supports send to client queueing', function (done) {
      var client = Transport.client(_.noop, function () { return _.noop })
      var seneca = {
        log: function () {},
        options: function () {
          return {
            transport: {
              pin: { cmd: 'pin' }
            }
          }
        },
        act: function (pattern, options, callback) {
          callback(null, {})
        },
        delegate: function () {
          return Object.create(this)
        },
        add: function () {
          done()
        },
        context: {}
      }

      seneca.log.info = _.noop
      seneca.log.debug = _.noop

      client.call(seneca)
    })

    it('supports pins represented by strings', function (done) {
      var client = Transport.client(_.noop, function () { return _.noop })
      var seneca = {
        log: function () {},
        options: function () {
          return {
            transport: {
              pins: ['{ "cmd": "pin" }', null, { test: true }]
            }
          }
        },
        act: function (pattern, options, callback) {
          callback(null, {})
        },
        delegate: function () {
          return Object.create(this)
        },
        add: function () {
          done()
        },
        context: {}
      }

      seneca.log.info = _.noop
      seneca.log.debug = _.noop

      client.call(seneca)
    })

    it('handles errors from act', function (done) {
      var client = Transport.client(_.noop)
      var makedie = Common.makedie
      Common.makedie = function () {
        return function (err) {
          Common.makedie = makedie
          expect(err).to.exist()
          done()
        }
      }
      var seneca = {
        log: {
          info: _.noop,
          debug: _.noop
        },
        options: function () {
          return {
            transport: {
              pins: [{ test: true }]
            }
          }
        },
        act: function (pattern, options, callback) {
          callback(new Error(), {})
        },
        delegate: function () {
          return Object.create(this)
        },
        add: _.noop,
        context: {}
      }

      client.call(seneca)
    })

    it('handles a null liveclient', function (done) {
      var client = Transport.client(_.noop)
      var makedie = Common.makedie
      Common.makedie = function () {
        return function (err) {
          Common.makedie = makedie
          expect(err).to.exist()
          done()
        }
      }

      var seneca = {
        log: {
          info: _.noop,
          debug: _.noop
        },
        options: function () {
          return {
            transport: {
              pins: [{ test: true }]
            }
          }
        },
        act: function (pattern, options, callback) {
          callback(null, null)
        },
        delegate: function () {
          return Object.create(this)
        },
        add: _.noop,
        context: {}
      }

      client.call(seneca)
    })
  })

  it('transport-exact-single', function (done) {
    var tt = make_test_transport()

    Seneca({tag: 'srv', timeout: 5555, log: 'silent', debug: { short_logs: true }})
      .use(tt)
      .add('foo:1', function (args, done) {
        // ensure action id is transferred for traceability
        expect('aa/BB').to.equal(args.meta$.id)
        testact.call(this, args, done)
      })
      .listen({ type: 'test', pin: 'foo:1' })
      .ready(function () {
        Seneca({tag: 'cln', timeout: 5555, log: 'silent',
                debug: {short_logs: true}})
          .use(tt)

          .client({type: 'test', pin: 'foo:1'})

          .start()

          .wait('foo:1,actid$:aa/BB')
          .step(function (out) {
            expect(out.foo).to.equal(1)
            return true
          })

          .end(done)
      })
  })

  it('transport-star', function (done) {
    var tt = make_test_transport()

    Seneca({timeout: 5555, log: 'silent', debug: {short_logs: true}})
      .use(tt)
      .add('foo:1', testact)
      .add('foo:2', testact)
      .listen({type: 'test', pin: 'foo:*'})
      .ready(function () {
        var si = Seneca({timeout: 5555, log: 'silent', debug: {short_logs: true}})
              .use(tt)

              .client({type: 'test', pin: 'foo:*'})

              .start(done)

              .wait('foo:1')
              .step(function (out) {
                expect(out.foo).to.equal(1)
                return true
              })

              .wait('foo:2')
              .step(function (out) {
                expect(out.foo).to.equal(2)
                return true
              })

              .wait(function (data, done) {
                si.act('bar:1', function (err, out) {
                  expect(err.code).to.equal('act_not_found')
                  done()
                })
              })

              .end()
      })
  })

  it('transport-star-pin-object', function (done) {
    var tt = make_test_transport()

    Seneca({timeout: 5555, log: 'silent', debug: {short_logs: true}})
      .use(tt)
      .add('foo:1', testact)
      .add('foo:2', testact)
      .listen({type: 'test', pin: {'foo': '*'}})
      .ready(function () {
        var si = Seneca({timeout: 5555, log: 'silent', debug: {short_logs: true}})
              .use(tt)

              .client({type: 'test', pin: {'foo': '*'}})

              .start(done)

              .wait('foo:1')
              .step(function (out) {
                expect(out.foo).to.equal(1)
                return true
              })

              .wait('foo:2')
              .step(function (out) {
                expect(out.foo).to.equal(2)
                return true
              })

              .wait(function (data, done) {
                si.act('bar:1', function (err, out) {
                  expect(err.code).to.equal('act_not_found')
                  done()
                })
              })

              .end()
      })
  })

  it('transport-single-notdef', function (done) {
    var tt = make_test_transport()

    Seneca({timeout: 5555, log: 'silent', debug: {short_logs: true}})
      .use(tt)
      .add('foo:1', testact)
      .listen({type: 'test', pin: 'foo:*'})
      .ready(function () {
        var si = Seneca({timeout: 5555, log: 'silent', debug: {short_logs: true}})
              .use(tt)
              .client({type: 'test', pin: 'foo:1'})

        si.act('foo:2', function (err) {
          expect(err.code).to.equal('act_not_found')

          this
            .start()

            .wait('foo:1,bar:1')
            .step(function (out) {
              expect(tt.outmsgs.length).to.equal(1)
              expect(out).to.deep.equal({foo: 1, bar: 2})
              return true
            })

            .end(done)
        })
      })
  })

  it('transport-pins-notdef', function (done) {
    var tt = make_test_transport()

    Seneca({timeout: 5555, log: 'silent', debug: {short_logs: true}})
      .use(tt)
      .add('foo:1', testact)
      .add('baz:2', testact)
      .listen({type: 'test', pins: ['foo:1', 'baz:2']})
      .ready(function () {
        var si = Seneca({timeout: 5555, log: 'silent', debug: {short_logs: true}})
              .use(tt)
              .client({type: 'test', pins: ['foo:1', 'baz:2']})

        si.act('foo:2', function (err) {
          expect(err).to.exist()

          this
            .start()

            .wait('foo:1,bar:1')
            .step(function (out) {
              expect(tt.outmsgs.length).to.equal(1)
              expect(out).to.deep.equal({foo: 1, bar: 2})
              return true
            })

            .wait('baz:2,qoo:10')
            .step(function (out) {
              expect(tt.outmsgs.length).to.equal(2)
              expect(out).to.deep.equal({baz: 2, qoo: 20})
              return true
            })

            .end(done)
        })
      })
  })

  it('transport-single-wrap-and-star', function (done) {
    var tt = make_test_transport()

    Seneca({timeout: 5555, log: 'silent', debug: {short_logs: true}})
      .use(tt)
      .add('foo:1', testact)
      .add('qaz:1', testact)
      .listen({type: 'test', pin: 'foo:1'})
      .listen({type: 'test', pin: 'qaz:*'})
      .ready(function () {
        Seneca({timeout: 5555, log: 'silent', debug: {short_logs: true}})
          .use(tt)
          .add('foo:1', function (args, done) { done(null, args) })

          .client({type: 'test', pin: 'foo:1'})
          .client({type: 'test', pin: 'qaz:*'})

          .start()

          .wait('foo:1,bar:1')
          .step(function (out) {
            expect(tt.outmsgs.length).to.equal(1)
            expect(out).to.deep.equal({foo: 1, bar: 2})
            return true
          })

        // foo:1 wins - it's more specific
          .wait('foo:1,qaz:1,bar:1')
          .step(function (out) {
            expect(tt.outmsgs.length).to.equal(2)
            expect(out).to.deep.equal({foo: 1, qaz: 1, bar: 2})
            return true
          })

          .wait('foo:2,qaz:1,bar:1')
          .step(function (out) {
            expect(tt.outmsgs.length).to.equal(3)
            expect(out).to.deep.equal({foo: 2, qaz: 1, bar: 2})
            return true
          })

          .end(done)
      })
  })

  it('transport-local-single-and-star', function (done) {
    var tt = make_test_transport()

    Seneca({timeout: 5555, log: 'silent', debug: {short_logs: true}})
      .use(tt)
      .add('foo:2,qaz:1', testact)
      .add('foo:2,qaz:2', testact)
      .listen({type: 'test', pin: 'foo:2,qaz:*'})
      .ready(function () {
        var si = Seneca({timeout: 5555, log: 'silent', debug: {short_logs: true}})
              .use(tt)
              .add('foo:1', function (args, done) { done(null, {foo: 1, local: 1}) })

              .client({type: 'test', pin: 'foo:2,qaz:*'})

        si
          .start()

          .wait('foo:1,bar:1')
          .step(function (out) {
            expect(tt.outmsgs.length).to.equal(0)
            expect(out).to.deep.equal({foo: 1, local: 1})
            return true
          })

          .wait('foo:2,qaz:1,bar:1')
          .step(function (out) {
            expect(tt.outmsgs.length).to.equal(1)
            expect(out).to.deep.equal({foo: 2, qaz: 1, bar: 2})
            return true
          })

          .wait('foo:2,qaz:2,bar:1')
          .step(function (out) {
            expect(tt.outmsgs.length).to.equal(2)
            expect(out).to.deep.equal({foo: 2, qaz: 2, bar: 2})
            return true
          })

          .end(done)
      })
  })

  it('transport-local-over-wrap', function (done) {
    var tt = make_test_transport()

    Seneca({timeout: 5555, log: 'silent', debug: {short_logs: true}})
      .use(tt)
      .add('foo:1', testact)
      .listen({type: 'test', pin: 'foo:1'})
      .ready(function () {
        Seneca({timeout: 5555, log: 'silent', debug: {short_logs: true}})
          .use(tt)

          .client({type: 'test', pin: 'foo:1'})

          .add('foo:1', function (args, done) { done(null, {foo: 1, local: 1}) })

          .start()

          .wait('foo:1,bar:1')
          .step(function (out) {
            expect(tt.outmsgs.length).to.equal(0)
            expect(out).to.deep.equal({foo: 1, local: 1})
            return true
          })

          .end(done)
      })
  })

  it('transport-local-prior-wrap', function (done) {
    var tt = make_test_transport()

    Seneca({timeout: 5555, log: 'silent', debug: {short_logs: true}})
      .use(tt)
      .add('foo:1', testact)
      .listen({type: 'test', pin: 'foo:1'})
      .ready(function () {
        Seneca({timeout: 5555, log: 'silent', debug: {short_logs: true}})
          .use(tt)

          .client({type: 'test', pin: 'foo:1'})

          .add('foo:1', function (args, done) {
            args.local = 1
            args.qaz = 1
            this.prior(args, done)
          })

          .start()

          .wait('foo:1,bar:1')
          .step(function (out) {
            expect(tt.outmsgs.length).to.equal(1)
            expect(out).to.deep.equal({foo: 1, bar: 2, local: 1, qaz: 1})
            return true
          })

          .end(done)
      })
  })


  it('transport-init-ordering', function (done) {
    var tt = make_test_transport()

    var inits = {}

    Seneca({timeout: 5555, log: 'silent', debug: { short_logs: true }})
      .use(tt)
      .add('foo:1', testact)
      .use(function bar () {
        this.add('bar:1', testact)
        this.add('init:bar', function (a, d) { inits.bar = 1; d() })
      })

      .client({type: 'test'})

      .add('foo:2', testact)
      .use(function zed () {
        this.add('zed:1', testact)
        this.add('init:zed', function (a, d) { inits.zed = 1; d() })
      })

      .listen({type: 'test'})

      .add('foo:3', testact)
      .use(function qux () {
        this.add('qux:1', testact)
        this.add('init:qux', function (a, d) { inits.qux = 1; d() })
      })

      .ready(function () {
        expect(inits.bar).to.equal(1)
        expect(inits.zed).to.equal(1)
        expect(inits.qux).to.equal(1)

        this.close(done)
      })
  })

  it('transport-no-plugin-init', function (done) {
    var tt = make_test_transport()

    Seneca({timeout: 5555, log: 'silent', debug: {short_logs: true}})
      .use(tt)
      .client({type: 'test'})

      .add('foo:1', testact)
      .use(function bar () {
        this.add('bar:1', testact)
      })

      .listen({type: 'test'})

      .add('foo:2', testact)
      .use(function zed () {
        this.add('zed:1', testact)
      })

      .ready(function () {
        this.start(done)

          .wait('foo:1')
          .step(function (out) {
            expect(out.foo).to.equal(1)
            return true
          })

          .wait('bar:1')
          .step(function (out) {
            expect(out.bar).to.equal(2)
            return true
          })

          .wait('zed:1')
          .step(function (out) {
            expect(out.zed).to.equal(1)
            return true
          })

          .end(function (err) {
            if (err) return done(err)
            this.close(done)
          })
      })
  })

  it('handles timeout from client connecting', function (done) {
    var seneca = Seneca({ log: 'silent', timeout: 50 }).client({ port: 1 })
    seneca.act({ cmd: 'test' }, function (err) {
      expect(err).to.exist()
      expect(err.message).to.contain('TIMEOUT')
      done()
    })
  })


  it('transport-balance-exact', function (done) {
    var bt = make_balance_transport()

    var s0, s1, s9, c0

    make_s0()

    function make_s0 () {
      s0 = Seneca({
        tag: 'srv', timeout: 5555, log: 'silent', debug: { short_logs: true }
      })
        .error(done)
        .add('foo:1', function (args, done) {
          // ensure action id is transferred for traceability
          expect('aa/BB').to.equal(args.meta$.id)
          args.s = 0
          testact.call(this, args, done)
        })
        .add('bar:1', function (args, done) {
          done(null, { bar: 1, q: 1 })
        })
        .listen({ port: 44440, pin: 'foo:1' })
        .ready(make_s1)
    }

    function make_s1 () {
      s1 = Seneca({
        tag: 'srv', timeout: 5555, log: 'silent', debug: { short_logs: true }
      })
        .error(done)
        .add('foo:1', function (args, done) {
          // ensure action id is transferred for traceability
          expect('cc/DD').to.equal(args.meta$.id)
          args.s = 1
          testact.call(this, args, done)
        })
        .listen({ port: 44441, pin: 'foo:1' })
        .ready(make_s9)
    }

    function make_s9 () {
      s9 = Seneca({
        tag: 'srv', timeout: 5555, log: 'silent', debug: { short_logs: true }
      })
        .error(done)
        .add('bar:2', function (args, done) {
          done(null, { bar: 2, q: 2 })
        })
        .listen({ port: 44449, pin: 'foo:1' })
        .ready(run_client)
    }

    function run_client () {
      c0 = Seneca({
        tag: 'cln', timeout: 5555, log: 'silent',
        debug: {short_logs: true}
      })
        .error(done)
        .use(bt)

        .client({type: 'balance', pin: 'foo:1'})

        .client({port: 44440, pin: 'foo:1'})
        .client({port: 44441, pin: 'foo:1'})

        .client({port: 44440, pin: 'bar:1'})
        .client({port: 44449, pin: 'bar:2'})

        .start()

        .wait('foo:1,actid$:aa/BB')
        .step(function (out) {
          expect(out.foo).to.equal(1)
          expect(out.s).to.equal(0)
          return true
        })

        .wait('foo:1,actid$:cc/DD')
        .step(function (out) {
          expect(out.foo).to.equal(1)
          expect(out.s).to.equal(1)
          return true
        })

        .wait('bar:1')
        .step(function (out) {
          expect(out.q).to.equal(1)
          return true
        })

        .wait('bar:1')
        .step(function (out) {
          expect(out.q).to.equal(1)
          return true
        })

        .wait('bar:2')
        .step(function (out) {
          expect(out.q).to.equal(2)
          return true
        })

        .end(function () {
          s0.close(function () {
            s1.close(function () {
              s9.close(function () {
                c0.close(done)
              })
            })
          })
        })
    }
  })

  it('fatal$ false with transport not-found kill process', function (done) {
    Seneca({ log: 'silent' })
      .listen()
      .ready(function () {
        var client = Seneca({ timeout: 30, log: 'silent' })
        client.client()


        client.ready(function () {
          client.act({ foo: 1, fatal$: false }, function (err, result) {
            expect(err).to.exist()
            done()
          })
        })
      })
  })
})

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
          handle: function (pat, action) {
            targets.push(action)
          }
        }
      }
    })
  }

  return test_transport

  function test_transport (options) {
    var seneca = this

    /*
    seneca.options({
      transport: {
        balance: {
          handle: function (pat, action) {
            targets.push(action)
          }
        }
      }
    })
     */

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
