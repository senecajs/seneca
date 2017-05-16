/* Copyright (c) 2014-2016 Richard Rodger, MIT License */
'use strict'

var _ = require('lodash')
var Code = require('code')
var Lab = require('lab')

var Seneca = require('..')
var Common = require('../lib/common')
var Transport = require('../lib/api')
var TransportStubs = require('./stubs/transports')

// Test shortcuts
var lab = (exports.lab = Lab.script())
var describe = lab.describe
var it = lab.it
var expect = Code.expect

var make_test_transport = TransportStubs.make_test_transport
var make_balance_transport = TransportStubs.make_balance_transport

function testact(msg, reply) {
  var seneca = this
  setTimeout(function() {
    var out = seneca.util.clean(_.clone(msg))
    out.bar = out.bar + 1

    if (out.baz) {
      out.qoo = out.qoo + 10
      delete out.bar
    }

    reply(out)
  }, 11)
}

describe('transport', function() {
  // TODO: test top level qaz:* : def and undef other pats
  lab.beforeEach(function(done) {
    process.removeAllListeners('SIGHUP')
    process.removeAllListeners('SIGTERM')
    process.removeAllListeners('SIGINT')
    process.removeAllListeners('SIGBREAK')
    done()
  })

  it('happy-nextgen', function(fin) {
    var s0 = Seneca({ tag: 's0', legacy: { transport: false } }).test(fin)
    var c0 = Seneca({ tag: 'c0', legacy: { transport: false } }).test(fin)

    s0
      .add('a:1', function(msg, reply) {
        reply({ x: msg.x })
      })
      .listen(62010)
      .ready(function() {
        c0.client(62010)

        c0.act('a:1,x:2', function(ignore, out) {
          expect(out.x).equals(2)

          s0.close(c0.close.bind(c0, fin))
        })
      })
  })

  it('config-nextgen', function(fin) {
    var s0 = Seneca({
      tag: 's0',
      legacy: { transport: false },
      transport: { web: { port: 62020 } }
    }).test(fin)

    var c0 = Seneca({
      tag: 'c0',
      legacy: { transport: false },
      transport: { web: { port: 62020 } }
    }).test(fin)

    s0
      .add('a:1', function(msg, reply) {
        reply({ x: msg.x })
      })
      .listen()
      .ready(function() {
        expect(s0.private$.transport.register.length).equal(1)

        c0.client().ready(function() {
          expect(c0.private$.transport.register.length).equal(1)

          c0.act('a:1,x:2', function(ignore, out) {
            expect(out.x).equals(2)

            s0.close(c0.close.bind(c0, fin))
          })
        })
      })
  })

  // TEST: parent and trace over transport - fake and network
  // TEST: separate reply - write TCP

  describe('listen()', function() {
    it('supports null options', function(done) {
      var listen = Transport.listen(_.noop)
      var seneca = {
        log: {
          info: _.noop,
          debug: _.noop
        },
        options: function() {
          return {}
        },
        act: _.noop,
        context: {},
        make_log: function() {}
      }

      var fn = function() {
        listen.call(seneca)
      }
      expect(fn).to.not.throw()
      done()
    })

    it('supports type as tcp option', function(done) {
      var listen = Transport.listen(_.noop)
      var seneca = {
        log: {
          info: _.noop,
          debug: _.noop
        },
        options: function() {
          return {
            type: 'tcp'
          }
        },
        act: _.noop,
        context: {},
        make_log: function() {}
      }

      var fn = function() {
        listen.call(seneca, 8080, 'localhost', '/')
      }
      expect(fn).to.not.throw()
      done()
    })

    it('supports type as http option', function(done) {
      var listen = Transport.listen(_.noop)
      var seneca = {
        log: {
          info: _.noop,
          debug: _.noop
        },
        options: function() {
          return {
            type: 'http'
          }
        },
        act: _.noop,
        context: {},
        make_log: function() {}
      }

      var fn = function() {
        listen.call(seneca, 8080, 'localhost', '/')
      }
      expect(fn).to.not.throw()
      done()
    })

    it('supports the port number as an argument', function(done) {
      var listen = Transport.listen(_.noop)
      var seneca = {
        log: {
          info: _.noop,
          debug: _.noop
        },
        options: function() {
          return {}
        },
        act: _.noop,
        context: {},
        make_log: function() {}
      }

      var fn = function() {
        listen.call(seneca, 8080)
      }
      expect(fn).to.not.throw()
      done()
    })

    it('supports the port number and host as an argument', function(done) {
      var listen = Transport.listen(_.noop)
      var seneca = {
        log: {
          info: _.noop,
          debug: _.noop
        },
        options: function() {
          return {}
        },
        act: _.noop,
        context: {},
        make_log: function() {}
      }

      var fn = function() {
        listen.call(seneca, 8080, 'localhost')
      }
      expect(fn).to.not.throw()
      done()
    })

    it('supports the port number, host, and path as an argument', function(
      done
    ) {
      var listen = Transport.listen(_.noop)
      var seneca = {
        log: {
          info: _.noop,
          debug: _.noop
        },
        options: function() {
          return {}
        },
        act: _.noop,
        context: {},
        make_log: function() {}
      }

      var fn = function() {
        listen.call(seneca, 8080, 'localhost', '/')
      }
      expect(fn).to.not.throw()
      done()
    })

    it('handles errors from action', function(done) {
      var listen = Transport.listen(_.noop)
      var seneca = {
        log: {
          info: _.noop,
          debug: _.noop
        },
        options: function() {
          return {}
        },
        act: function(pattern, options, callback) {
          callback(new Error())
        },
        die: function(err) {
          expect(err).to.exist()
          done()
        },
        context: {},
        make_log: function() {}
      }

      listen.call(seneca)
    })
  })

  describe('client()', function() {
    it('supports null options', function(done) {
      var client = Transport.client(_.noop, function() {
        return _.noop
      })
      var seneca = {
        log: {
          info: _.noop,
          debug: _.noop
        },
        options: function() {
          return {}
        },
        act: _.noop,
        delegate: function() {
          return Object.create(this)
        },
        add: _.noop,
        context: {},
        make_log: function() {},
        private$: { ge: { gate: function() {} } }
      }

      var fn = function() {
        client.call(seneca)
      }

      expect(fn).to.not.throw()
      done()
    })

    it('supports send to client queueing', function(done) {
      var client = Transport.client(_.noop, function() {
        return _.noop
      })
      var seneca = {
        log: function() {},
        options: function() {
          return {
            transport: {
              pin: { cmd: 'pin' }
            }
          }
        },
        act: function(pattern, options, callback) {
          callback(null, {})
        },
        delegate: function() {
          return Object.create(this)
        },
        add: function() {
          done()
        },
        context: {},
        make_log: function() {},
        private$: { ge: { gate: function() {} } }
      }

      seneca.log.info = _.noop
      seneca.log.debug = _.noop

      client.call(seneca)
    })

    it('supports pins represented by strings', function(done) {
      var client = Transport.client(_.noop, function() {
        return _.noop
      })
      var seneca = {
        log: function() {},
        options: function() {
          return {
            transport: {
              pins: ['{ "cmd": "pin" }', null, { test: true }]
            }
          }
        },
        act: function(pattern, options, callback) {
          callback(null, {})
        },
        delegate: function() {
          return Object.create(this)
        },
        add: function() {
          done()
        },
        context: {},
        make_log: function() {},
        private$: { ge: { gate: function() {} } }
      }

      seneca.log.info = _.noop
      seneca.log.debug = _.noop

      client.call(seneca)
    })

    it('handles errors from act', function(done) {
      var client = Transport.client(_.noop)
      var makedie = Common.makedie
      Common.makedie = function() {
        return function(err) {
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
        options: function() {
          return {
            transport: {
              pins: [{ test: true }]
            }
          }
        },
        act: function(pattern, options, callback) {
          callback(new Error(), {})
        },
        delegate: function() {
          return Object.create(this)
        },
        add: _.noop,
        context: {},
        make_log: function() {},
        private$: { ge: { gate: function() {} } }
      }

      client.call(seneca)
    })

    it('handles a null liveclient', function(done) {
      var client = Transport.client(_.noop)
      var makedie = Common.makedie
      Common.makedie = function() {
        return function(err) {
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
        options: function() {
          return {
            transport: {
              pins: [{ test: true }]
            }
          }
        },
        act: function(pattern, options, callback) {
          callback(null, null)
        },
        delegate: function() {
          return Object.create(this)
        },
        add: _.noop,
        context: {},
        make_log: function() {},
        private$: { ge: { gate: function() {} } }
      }

      client.call(seneca)
    })
  })

  it('transport-exact-single', function(done) {
    var tt = make_test_transport()

    Seneca({ tag: 'srv', timeout: 5555 })
      .test(done)
      .use(tt)
      .add('foo:1', function(msg, reply) {
        // ensure action id is transferred for traceability
        expect('aa/BB').to.equal(msg.meta$.id)
        testact.call(this, msg, reply)
      })
      .listen({ type: 'test', pin: 'foo:1' })
      .ready(function() {
        Seneca({ tag: 'cln', timeout: 5555 })
          .test(done)
          .use(tt)
          .client({ type: 'test', pin: 'foo:1' })
          .act('foo:1,actid$:aa/BB', function(err, out) {
            expect(err).to.not.exist()
            expect(out.foo).to.equal(1)

            done()
          })
      })
  })

  it('transport-star', function(done) {
    var tt = make_test_transport()

    Seneca({ timeout: 5555, log: 'silent', debug: { short_logs: true } })
      .use(tt)
      .add('foo:1', testact)
      .add('foo:2', testact)
      .listen({ type: 'test', pin: 'foo:*' })
      .ready(function() {
        var si = Seneca({
          timeout: 5555,
          log: 'silent',
          debug: { short_logs: true }
        })

        si.use(tt).client({ type: 'test', pin: 'foo:*' }).ready(function() {
          si.act('foo:1', function(err, out) {
            expect(err).to.not.exist()
            expect(out.foo).to.equal(1)
            si.act('foo:2', function(err, out) {
              expect(err).to.not.exist()
              expect(out.foo).to.equal(2)
              si.act('bar:1', function(err) {
                expect(err.code).to.equal('act_not_found')

                done()
              })
            })
          })
        })
      })
  })

  it('transport-star-pin-object', function(done) {
    var tt = make_test_transport()

    Seneca({ timeout: 5555, log: 'silent', debug: { short_logs: true } })
      .use(tt)
      .add('foo:1', testact)
      .add('foo:2', testact)
      .listen({ type: 'test', pin: { foo: '*' } })
      .ready(function() {
        var si = Seneca({
          timeout: 5555,
          log: 'silent',
          debug: { short_logs: true }
        })
          .use(tt)
          .client({ type: 'test', pin: { foo: '*' } })
          .ready(function() {
            si.act('foo:1', function(err, out) {
              expect(err).to.not.exist()
              expect(out.foo).to.equal(1)
              si.act('foo:2', function(err, out) {
                expect(err).to.not.exist()
                expect(out.foo).to.equal(2)
                si.act('bar:1', function(err) {
                  expect(err.code).to.equal('act_not_found')

                  done()
                })
              })
            })
          })
      })
  })

  it('transport-single-notdef', function(fin) {
    var tt = make_test_transport()

    Seneca({ tag: 's0', timeout: 5555 })
      .test(fin)
      .use(tt)
      .add('foo:1', testact)
      .listen({ type: 'test', pin: 'foo:*' })
      .ready(function() {
        var si = Seneca({ tag: 'c0', timeout: 5555, log: 'silent' })
          .use(tt)
          .client({ type: 'test', pin: 'foo:1' })

        si.act('foo:2', function(err) {
          expect(err.code).to.equal('act_not_found')

          this.act('foo:1,bar:1', function(err, out) {
            expect(err).to.not.exist()
            expect(tt.outmsgs.length).to.equal(1)
            expect(out).contains({ foo: 1, bar: 2 })

            fin()
          })
        })
      })
  })

  it('transport-pins-notdef', function(fin) {
    var tt = make_test_transport()

    Seneca({ tag: 's0', timeout: 5555 })
      .test(fin)
      .use(tt)
      .add('foo:1', testact)
      .add('baz:2', testact)
      .listen({ type: 'test', pins: ['foo:1', 'baz:2'] })
      .ready(function() {
        var si = Seneca({
          timeout: 5555,
          log: 'silent',
          debug: { short_logs: true }
        })
          .use(tt)
          .client({ type: 'test', pins: ['foo:1', 'baz:2'] })

        si.act('foo:2', function(err) {
          expect(err).to.exist()

          this.act('foo:1,bar:1', function(err, out) {
            expect(err).to.not.exist()
            expect(tt.outmsgs.length).to.equal(1)
            expect(out).contains({ foo: 1, bar: 2 })

            this.act('baz:2,qoo:10', function(err, out) {
              expect(err).to.not.exist()
              expect(tt.outmsgs.length).to.equal(2)
              expect(out).contains({ baz: 2, qoo: 20 })

              fin()
            })
          })
        })
      })
  })

  it('transport-single-wrap-and-star', function(done) {
    var tt = make_test_transport()

    Seneca({ timeout: 5555, log: 'silent', debug: { short_logs: true } })
      .use(tt)
      .add('foo:1', testact)
      .add('qaz:1', testact)
      .listen({ type: 'test', pin: 'foo:1' })
      .listen({ type: 'test', pin: 'qaz:*' })
      .ready(function() {
        var si = Seneca({
          timeout: 5555,
          log: 'silent',
          debug: { short_logs: true }
        })
        si
          .use(tt)
          .add('foo:1', function(msg, reply) {
            reply(msg)
          })
          .client({ type: 'test', pin: 'foo:1' })
          .client({ type: 'test', pin: 'qaz:*' })

        si.ready(function() {
          si.act('foo:1,bar:1', function(err, out) {
            expect(err).to.not.exist()
            expect(tt.outmsgs.length).to.equal(1)
            expect(out).contains({ foo: 1, bar: 2 })

            si.act('foo:1,qaz:1,bar:1', function(err, out) {
              expect(err).to.not.exist()
              expect(tt.outmsgs.length).to.equal(2)
              expect(out).contains({ foo: 1, qaz: 1, bar: 2 })

              si.act('foo:2,qaz:1,bar:1', function(err, out) {
                expect(err).to.not.exist()
                expect(tt.outmsgs.length).to.equal(3)
                expect(out).contains({ foo: 2, qaz: 1, bar: 2 })

                done()
              })
            })
          })
        })
      })
  })

  it('transport-local-single-and-star', function(done) {
    var tt = make_test_transport()

    Seneca({ timeout: 5555, log: 'silent', debug: { short_logs: true } })
      .use(tt)
      .add('foo:2,qaz:1', testact)
      .add('foo:2,qaz:2', testact)
      .listen({ type: 'test', pin: 'foo:2,qaz:*' })
      .ready(function() {
        var si = Seneca({
          timeout: 5555,
          log: 'silent',
          debug: { short_logs: true }
        })
          .use(tt)
          .add('foo:1', function(msg, reply) {
            reply({ foo: 1, local: 1 })
          })
          .client({ type: 'test', pin: 'foo:2,qaz:*' })

        si.ready(function() {
          si.act('foo:1,bar:1', function(err, out) {
            expect(err).to.not.exist()
            expect(tt.outmsgs.length).to.equal(0)
            expect(out).contains({ foo: 1, local: 1 })

            si.act('foo:2,qaz:1,bar:1', function(err, out) {
              expect(err).to.not.exist()
              expect(tt.outmsgs.length).to.equal(1)
              expect(out).contains({ foo: 2, qaz: 1, bar: 2 })

              si.act('foo:2,qaz:2,bar:1', function(err, out) {
                expect(err).to.not.exist()
                expect(tt.outmsgs.length).to.equal(2)
                expect(out).contains({ foo: 2, qaz: 2, bar: 2 })

                done()
              })
            })
          })
        })
      })
  })

  it('transport-local-over-wrap', function(done) {
    var tt = make_test_transport()

    Seneca({ timeout: 5555, log: 'silent', debug: { short_logs: true } })
      .use(tt)
      .add('foo:1', testact)
      .listen({ type: 'test', pin: 'foo:1' })
      .ready(function() {
        var si = Seneca({
          timeout: 5555,
          log: 'silent',
          debug: { short_logs: true }
        })
          .use(tt)
          .client({ type: 'test', pin: 'foo:1' })

        si.ready(function() {
          si.add('foo:1', function(msg, reply) {
            reply({ foo: 1, local: 1 })
          })

          si.act('foo:1,bar:1', function(err, out) {
            expect(err).to.not.exist()
            expect(tt.outmsgs.length).to.equal(0)
            expect(out).contains({ foo: 1, local: 1 })

            done()
          })
        })
      })
  })

  it('transport-local-prior-wrap', function(done) {
    var tt = make_test_transport()

    Seneca({ tag: 'srv', timeout: 5555 })
      .test(done)
      .use(tt)
      .add('foo:1', testact)
      .listen({ type: 'test', pin: 'foo:1' })
      .ready(function() {
        Seneca({ tag: 'cln', timeout: 5555 })
          .test(done)
          .use(tt)
          .client({ type: 'test', pin: 'foo:1' })
          .add('foo:1', function(msg, reply) {
            msg.local = 1
            msg.qaz = 1
            this.prior(msg, reply)
          })
          .act('foo:1,bar:1', function(err, out) {
            expect(err).to.not.exist()
            expect(tt.outmsgs.length).to.equal(1)
            expect(out).contains({ foo: 1, bar: 2, local: 1, qaz: 1 })

            done()
          })
      })
  })

  it('transport-init-ordering', function(done) {
    var tt = make_test_transport()

    var inits = {}

    Seneca({ timeout: 5555, log: 'silent' })
      .use(tt)
      .add('foo:1', testact)
      .use(function bar() {
        this.add('bar:1', testact)
        this.add('init:bar', function(a, d) {
          inits.bar = 1
          d()
        })
      })
      .client({ type: 'test' })
      .add('foo:2', testact)
      .use(function zed() {
        this.add('zed:1', testact)
        this.add('init:zed', function(a, d) {
          inits.zed = 1
          d()
        })
      })
      .listen({ type: 'test' })
      .add('foo:3', testact)
      .use(function qux() {
        this.add('qux:1', testact)
        this.add('init:qux', function(a, d) {
          inits.qux = 1
          d()
        })
      })
      .ready(function() {
        expect(inits.bar).to.equal(1)
        expect(inits.zed).to.equal(1)
        expect(inits.qux).to.equal(1)

        this.close(done)
      })
  })

  it('transport-no-plugin-init', function(done) {
    var tt = make_test_transport()

    Seneca({ timeout: 5555, log: 'silent', debug: { short_logs: true } })
      .use(tt)
      .client({ type: 'test' })
      .add('foo:1', testact)
      .use(function bar() {
        this.add('bar:1', testact)
      })
      .listen({ type: 'test' })
      .add('foo:2', testact)
      .use(function zed() {
        this.add('zed:1', testact)
      })
      .ready(function() {
        this.act('foo:1', function(err, out) {
          expect(err).to.not.exist()
          expect(out.foo).to.equal(1)

          this.act('bar:1', function(err, out) {
            expect(err).to.not.exist()
            expect(out.bar).to.equal(2)

            this.act('zed:1', function(err, out) {
              expect(err).to.not.exist()
              expect(out.zed).to.equal(1)

              if (err) return done(err)
              this.close(done)
            })
          })
        })
      })
  })

  it('handles timeout from client connecting', function(done) {
    var seneca = Seneca({ log: 'silent', timeout: 50 }).client({ port: 1 })
    seneca.act({ cmd: 'test' }, function(err) {
      expect(err).to.exist()
      expect(err.message).to.contain('TIMEOUT')
      done()
    })
  })

  it('transport-balance-exact', function(done) {
    var bt = make_balance_transport()

    var s0, s1, s9, c0

    make_s0()

    function make_s0() {
      s0 = Seneca({
        tag: 'srv',
        timeout: 5555,
        log: 'silent',
        debug: { short_logs: true }
      })
        .error(done)
        .add('foo:1', function(msg, reply) {
          // ensure action id is transferred for traceability
          expect('aa/BB').to.equal(msg.meta$.id)
          msg.s = 0
          testact.call(this, msg, reply)
        })
        .add('bar:1', function(msg, reply) {
          reply({ bar: 1, q: 1 })
        })
        .listen({ port: 44440, pin: 'foo:1' })
        .ready(make_s1)
    }

    function make_s1() {
      s1 = Seneca({
        tag: 'srv',
        timeout: 5555,
        log: 'silent',
        debug: { short_logs: true }
      })
        .error(done)
        .add('foo:1', function(msg, reply) {
          // ensure action id is transferred for traceability
          expect('cc/DD').to.equal(msg.meta$.id)
          msg.s = 1
          testact.call(this, msg, reply)
        })
        .listen({ port: 44441, pin: 'foo:1' })
        .ready(make_s9)
    }

    function make_s9() {
      s9 = Seneca({
        tag: 'srv',
        timeout: 5555,
        log: 'silent',
        debug: { short_logs: true }
      })
        .error(done)
        .add('bar:2', function(msg, reply) {
          reply({ bar: 2, q: 2 })
        })
        .listen({ port: 44449, pin: 'foo:1' })
        .ready(run_client)
    }

    function run_client() {
      c0 = Seneca({
        tag: 'cln',
        timeout: 5555,
        log: 'silent',
        debug: { short_logs: true }
      })
        .error(done)
        .use(bt)
        .client({ type: 'balance', pin: 'foo:1' })
        .client({ port: 44440, pin: 'foo:1' })
        .client({ port: 44441, pin: 'foo:1' })
        .client({ port: 44440, pin: 'bar:1' })
        .client({ port: 44449, pin: 'bar:2' })

      c0.act('foo:1,actid$:aa/BB', function(err, out) {
        expect(err).to.not.exist()
        expect(out.foo).to.equal(1)
        expect(out.s).to.equal(0)

        c0.act('foo:1,actid$:cc/DD', function(err, out) {
          expect(err).to.not.exist()
          expect(out.foo).to.equal(1)
          expect(out.s).to.equal(1)

          c0.act('bar:1', function(err, out) {
            expect(err).to.not.exist()
            expect(out.q).to.equal(1)

            c0.act('bar:1', function(err, out) {
              expect(err).to.not.exist()
              expect(out.q).to.equal(1)

              c0.act('bar:2', function(err, out) {
                expect(err).to.not.exist()
                expect(out.q).to.equal(2)

                s0.close(function() {
                  s1.close(function() {
                    s9.close(function() {
                      c0.close(done)
                    })
                  })
                })
              })
            })
          })
        })
      })
    }
  })

  it('fatal$ false with transport not-found kill process', function(done) {
    Seneca({ log: 'silent' }).listen().ready(function() {
      var client = Seneca({ timeout: 30, log: 'silent' })
      client.client()

      client.ready(function() {
        client.act({ foo: 1, fatal$: false }, function(err) {
          expect(err).to.exist()
          done()
        })
      })
    })
  })

  it('server can be restarted without issues to clients', function(done) {
    var execCount = 0
    var server = Seneca({ log: 'silent' })
    server.add({ cmd: 'foo' }, function(message, cb) {
      execCount++
      cb(null, { result: 'bar' })
    })
    server.listen({ port: 0 }, function(err, address) {
      expect(err).to.not.exist()
      var client = Seneca({ log: 'silent' })
      client.client({ port: address.port })
      client.ready(function() {
        client.act({ cmd: 'foo' }, function(err, message) {
          expect(err).to.not.exist()
          expect(message.result).to.equal('bar')
          server.close(function() {
            var server2 = Seneca({ log: 'silent' })
            server2.add({ cmd: 'foo' }, function(message, cb) {
              cb(null, { result: 'bar' })
            })
            server2.listen({ port: address.port })
            server2.ready(function() {
              client.act({ cmd: 'foo' }, function(err, message) {
                expect(err).to.not.exist()
                expect(message.result).to.equal('bar')
                expect(execCount).to.equal(1)
                server2.close(done)
              })
            })
          })
        })
      })
    })
  })
})
