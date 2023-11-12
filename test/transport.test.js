/* Copyright (c) 2014-2020 Richard Rodger and other contributors, MIT License */
'use strict'

const Code = require('@hapi/code')
const Lab = require('@hapi/lab')

var Common = require('../lib/common')
var { API } = require('../lib/api')
var TransportStubs = require('./stubs/transports')

// Test shortcuts
var lab = (exports.lab = Lab.script())
var describe = lab.describe
var expect = Code.expect

var Shared = require('./shared')
var it = Shared.make_it(lab)

var Seneca = require('..')

var tmx = parseInt(process.env.TIMEOUT_MULTIPLIER || 1, 10)

// var make_test_transport = TransportStubs.make_test_transport
const make_simple_transport = TransportStubs.make_simple_transport
const make_balance_transport = TransportStubs.make_balance_transport

function testact(msg, reply) {
  var seneca = this
  setTimeout(function () {
    var out = seneca.util.clean(Object.assign({}, msg))
    out.bar = out.bar + 1

    if (out.baz) {
      out.qoo = out.qoo + 10
      delete out.bar
    }

    reply(out)
  }, 11 * tmx)
}

var test_opts = { parallel: false, timeout: 5555 * tmx }

describe('transport', function () {

  // TEST: parent and trace over transport - fake and network
  // TEST: separate reply - write TCP

  /* TODOL: replace with Gubu validation
  describe('transport-listen', function () {
    it('supports-null-options', test_opts, function (fin) {
      var listen = API.listen(() => {})
      var seneca = Seneca({ legacy: false }).test(fin)

      var fn = function () {
        listen.call(seneca)
      }
      expect(fn).to.not.throw()
      seneca.close(fin)
    })

    it('supports type as tcp option', test_opts, function (fin) {
      var listen = API.listen(() => {})
      var seneca = Seneca({ legacy: false }).test(fin)

      var fn = function () {
        listen.call(seneca, 8080, 'localhost', '/')
      }
      expect(fn).to.not.throw()
      seneca.close(fin)
    })

    it('supports type as http option', test_opts, function (fin) {
      var listen = API.listen(() => {})
      var seneca = Seneca({ legacy: false }).test(fin)

      var fn = function () {
        listen.call(seneca, 8080, 'localhost', '/')
      }
      expect(fn).to.not.throw()
      seneca.close(fin)
    })

    it('supports the port number as an argument', test_opts, function (fin) {
      var listen = API.listen(() => {})
      var seneca = Seneca({ legacy: false }).test(fin)

      var fn = function () {
        listen.call(seneca, 8080)
      }
      expect(fn).to.not.throw()
      seneca.close(fin)
    })

    it(
      'supports the port number and host as an argument',
      test_opts,
      function (fin) {
        var listen = API.listen(() => {})
        var seneca = Seneca({ legacy: false }).test(fin)

        var fn = function () {
          listen.call(seneca, 8080, 'localhost')
        }
        expect(fn).to.not.throw()
        seneca.close(fin)
      },
    )

    it(
      'supports the port number, host, and path as an argument',
      test_opts,
      function (fin) {
        var listen = API.listen(() => {})
        var seneca = Seneca({ legacy: false }).test(fin)

        var fn = function () {
          listen.call(seneca, 8080, 'localhost', '/')
        }
        expect(fn).to.not.throw()
        seneca.close(fin)
      },
    )

    it('action-error', test_opts, function (fin) {
      var listen = API.listen(() => {})
      var seneca = Seneca({ legacy: false }).test(fin)

      listen.call(seneca)
      seneca.close(fin)
    })
  })

  describe('client()', function () {
    it('supports null options', test_opts, function (fin) {
      var client = API.client(
        () => {},
        function () {
          return () => {}
        },
      )
      var seneca = Seneca({ legacy: false }).test(fin)

      var fn = function () {
        client.call(seneca)
      }

      expect(fn).to.not.throw()
      seneca.close(fin)
    })
  })
  */
  
  
  it('transport-exact-single', test_opts, function (done) {
    const st = make_simple_transport()

    Seneca({ tag: 'srv', timeout: 5555 })
      .test(done)
    .use(st)
      .add('foo:1', function (msg, reply, meta) {
        // ensure action id is transferred for traceability
        expect('aa/BB').to.equal(meta.id)
        testact.call(this, msg, reply)
      })
    .listen({ type: 'simple', pin: 'foo:1' })
      .ready(function () {
        //console.log(this.private$.actrouter)

        Seneca({ tag: 'cln', timeout: 22222 * tmx })
          .test(done)
        .use(st)
        .client({ type: 'simple', pin: 'foo:1' })
          //.client({ port: 62222, pin: 'foo:1' })
          .act('foo:1,actid$:aa/BB', function (err, out) {
            expect(err).to.not.exist()
            expect(out.foo).to.equal(1)

            done()
          })
      })
  })

  it('transport-local-override', test_opts, function (done) {
    const st = make_simple_transport()

    Seneca({ tag: 'srv', timeout: 5555 })
      .test(done)
      .use(st)
      .add('foo:1', function foo_srv(msg, reply, meta) {
        reply({ bar: 1 })
      })
      .listen({ type: 'simple', pin: 'foo:1' })
      .ready(function () {
        Seneca({ tag: 'cln', timeout: 22222 * tmx })
          .test(done)
          .use(st)
          .add('foo:1', function foo_cln(msg, reply, meta) {
            reply({ bar: 2 })
          })
          .client({ type: 'simple', pin: 'foo:1' })
          .act('foo:1,actid$:aa/BB', function (err, out) {
            expect(err).to.not.exist()

            // The remote version overrides the local version
            expect(out.bar).to.equal(1)

            done()
          })
      })
  })

  it('transport-star', test_opts, function (done) {
    const st = make_simple_transport()

    Seneca({ timeout: 22222 * tmx, log: 'silent', debug: { short_logs: true } })
      .use(st)
      .add('foo:1', testact)
      .add('foo:2', testact)
      .listen({ type: 'simple', pin: 'foo:*' })
      .ready(function () {
        var si = Seneca({
          timeout: 5555,
          log: 'silent',
          debug: { short_logs: true },
        })

        si.use(st)
          .client({ type: 'simple', pin: 'foo:*' })
          .ready(function () {
            si.act('foo:1', function (err, out) {
              expect(err).to.not.exist()
              expect(out.foo).to.equal(1)
              si.act('foo:2', function (err, out) {
                expect(err).to.not.exist()
                expect(out.foo).to.equal(2)
                si.act('bar:1', function (err) {
                  expect(err.code).to.equal('act_not_found')

                  done()
                })
              })
            })
          })
      })
  })

  it('transport-star-pin-object', test_opts, function (done) {
    const st = make_simple_transport()

    Seneca({ timeout: 22222 * tmx, log: 'silent', debug: { short_logs: true } })
      .use(st)
      .add('foo:1', testact)
      .add('foo:2', testact)
      .listen({ type: 'simple', pin: { foo: '*' } })
      .ready(function () {
        var si = Seneca({
          timeout: 9999,
          log: 'silent',
          debug: { short_logs: true },
        })
          .use(st)
          .client({ type: 'simple', pin: { foo: '*' } })
          .ready(function () {
            si.act('foo:1', function (err, out) {
              expect(err).to.not.exist()
              expect(out.foo).to.equal(1)
              si.act('foo:2', function (err, out) {
                expect(err).to.not.exist()
                expect(out.foo).to.equal(2)
                si.act('bar:1', function (err) {
                  expect(err.code).to.equal('act_not_found')

                  done()
                })
              })
            })
          })
      })
  })

  /* TODO: move to @seneca/transport
  it('transport-single-notdef', test_opts, function (fin) {
    const st = make_simple_transport()

    Seneca({ tag: 's0', timeout: 5555 })
      .test(fin)
      .use(st)
      .add('foo:1', testact)
      .listen({ type: 'simple', pin: 'foo:*' })
      .ready(function () {
        var si = Seneca({ tag: 'c0', timeout: 22222 * tmx, log: 'silent' })
          .use(st)
          .client({ type: 'simple', pin: 'foo:1' })

        si.act('foo:2', function (err) {
          expect(err.code).to.equal('act_not_found')

          this.act('foo:1,bar:1', function (err, out) {
            expect(err).to.not.exist()
            // expect(tt.outmsgs.length).to.equal(1)
            expect(out).contains({ foo: 1, bar: 2 })

            fin()
          })
        })
      })
  })
  */

  
  it('transport-pins-notdef', test_opts, function (fin) {
    const st = make_simple_transport()

    Seneca({ tag: 's0', timeout: 5555 })
      .test(fin)
      .use(st)
      .add('foo:1', testact)
      .add('baz:2', testact)
      .listen({ type: 'simple', pins: ['foo:1', 'baz:2'] })
      .ready(function () {
        var si = Seneca({
          timeout: 22222 * tmx,
          log: 'silent',
          debug: { short_logs: true },
        })
          .use(st)
          .client({ type: 'simple', pins: ['foo:1', 'baz:2'] })

        si.act('foo:2', function (err) {
          expect(err).to.exist()

          this.act('foo:1,bar:1', function (err, out) {
            expect(err).to.not.exist()
            // expect(tt.outmsgs.length).to.equal(1)
            expect(out).contains({ foo: 1, bar: 2 })

            this.act('baz:2,qoo:10', function (err, out) {
              expect(err).to.not.exist()
              // expect(tt.outmsgs.length).to.equal(2)
              expect(out).contains({ baz: 2, qoo: 20 })

              fin()
            })
          })
        })
      })
  })

  // TODO: investigate sporadic travis timeout failures
  it('transport-single-wrap-and-star', test_opts, function (done) {
    const st = make_simple_transport()

    Seneca({ timeout: 22222 * tmx, log: 'silent', debug: { short_logs: true } })
      .use(st)
      .add('foo:1', testact)
      .add('qaz:1', testact)
      .listen({ type: 'simple', pin: 'foo:1' })
      .listen({ type: 'simple', pin: 'qaz:*' })
      .ready(function () {
        var si = Seneca({
          timeout: 22222 * tmx,
          log: 'silent',
          debug: { short_logs: true },
        })
        si.use(st)
          .add('foo:1', function (msg, reply) {
            reply(msg)
          })
          .client({ type: 'simple', pin: 'foo:1' })
          .client({ type: 'simple', pin: 'qaz:*' })

        si.ready(function () {
          si.act('foo:1,bar:1', function (err, out) {
            expect(err).to.not.exist()
            // expect(tt.outmsgs.length).to.equal(1)
            expect(out).contains({ foo: 1, bar: 2 })

            si.act('foo:1,qaz:1,bar:1', function (err, out) {
              expect(err).to.not.exist()
              // expect(tt.outmsgs.length).to.equal(2)
              expect(out).contains({ foo: 1, qaz: 1, bar: 2 })

              si.act('foo:2,qaz:1,bar:1', function (err, out) {
                expect(err).to.not.exist()
                // expect(tt.outmsgs.length).to.equal(3)
                expect(out).contains({ foo: 2, qaz: 1, bar: 2 })

                done()
              })
            })
          })
        })
      })
  })

  it('transport-local-single-and-star', test_opts, function (done) {
    const st = make_simple_transport()

    Seneca({ timeout: 5555, log: 'silent', debug: { short_logs: true } })
      .use(st)
      .add('foo:2,qaz:1', testact)
      .add('foo:2,qaz:2', testact)
      .listen({ type: 'simple', pin: 'foo:2,qaz:*' })
      .ready(function () {
        var si = Seneca({
          timeout: 22222 * tmx,
          log: 'silent',
          debug: { short_logs: true },
        })
          .use(st)
          .add('foo:1', function (msg, reply) {
            reply({ foo: 1, local: 1 })
          })
          .client({ type: 'simple', pin: 'foo:2,qaz:*' })

        si.ready(function () {
          si.act('foo:1,bar:1', function (err, out) {
            expect(err).to.not.exist()
            // expect(tt.outmsgs.length).to.equal(0)
            expect(out).contains({ foo: 1, local: 1 })

            si.act('foo:2,qaz:1,bar:1', function (err, out) {
              expect(err).to.not.exist()
              // expect(tt.outmsgs.length).to.equal(1)
              expect(out).contains({ foo: 2, qaz: 1, bar: 2 })

              si.act('foo:2,qaz:2,bar:1', function (err, out) {
                expect(err).to.not.exist()
                // expect(tt.outmsgs.length).to.equal(2)
                expect(out).contains({ foo: 2, qaz: 2, bar: 2 })

                done()
              })
            })
          })
        })
      })
  })

  it('transport-local-over-wrap', test_opts, function (done) {
    const st = make_simple_transport()

    Seneca({ timeout: 5555, log: 'silent', debug: { short_logs: true } })
      .use(st)
      .add('foo:1', testact)
      .listen({ type: 'simple', pin: 'foo:1' })
      .ready(function () {
        var si = Seneca({
          timeout: 22222 * tmx,
          log: 'silent',
          debug: { short_logs: true },
        })
          .use(st)
          .client({ type: 'simple', pin: 'foo:1' })

        si.ready(function () {
          si.add('foo:1', function (msg, reply) {
            reply({ foo: 1, local: 1 })
          })

          si.act('foo:1,bar:1', function (err, out) {
            expect(err).to.not.exist()
            // expect(tt.outmsgs.length).to.equal(0)
            expect(out).contains({ foo: 1, local: 1 })

            done()
          })
        })
      })
  })

  it('transport-local-prior-wrap', test_opts, function (done) {
    const st = make_simple_transport()

    Seneca({ tag: 'srv', timeout: 22222 * tmx })
      .test(done)
      .use(st)
      .add('foo:1', testact)
      .listen({ type: 'simple', pin: 'foo:1' })
      .ready(function () {
        Seneca({ tag: 'cln', timeout: 22222 * tmx })
          .test(done)
          .use(st)
          .client({ type: 'simple', pin: 'foo:1' })
          .add('foo:1', function (msg, reply) {
            msg.local = 1
            msg.qaz = 1
            this.prior(msg, reply)
          })
          .act('foo:1,bar:1', function (err, out) {
            expect(err).to.not.exist()
            // expect(tt.outmsgs.length).to.equal(1)
            expect(out).contains({ foo: 1, bar: 2, local: 1, qaz: 1 })

            done()
          })
      })
  })

  it('transport-init-ordering', test_opts, function (done) {
    const st = make_simple_transport()

    var inits = {}

    Seneca({ timeout: 22222 * tmx, log: 'silent' })
      .use(st)
      .add('foo:1', testact)
      .use(function bar() {
        this.add('bar:1', testact)
        this.add('init:bar', function (a, d) {
          inits.bar = 1
          d()
        })
      })
      .client({ type: 'simple' })
      .add('foo:2', testact)
      .use(function zed() {
        this.add('zed:1', testact)
        this.add('init:zed', function (a, d) {
          inits.zed = 1
          d()
        })
      })
      .listen({ type: 'simple' })
      .add('foo:3', testact)
      .use(function qux() {
        this.add('qux:1', testact)
        this.add('init:qux', function (a, d) {
          inits.qux = 1
          d()
        })
      })
      .ready(function () {
        expect(inits.bar).to.equal(1)
        expect(inits.zed).to.equal(1)
        expect(inits.qux).to.equal(1)

        this.close(done)
      })
  })

  it('transport-no-plugin-init', test_opts, function (done) {
    const st = make_simple_transport()

    Seneca({ timeout: 22222 * tmx, log: 'silent', debug: { short_logs: true } })
      .use(st)
      .client({ type: 'simple' })
      .add('foo:1', testact)
      .use(function bar() {
        this.add('bar:1', testact)
      })
      .listen({ type: 'simple' })
      .add('foo:2', testact)
      .use(function zed() {
        this.add('zed:1', testact)
      })
      .ready(function () {
        this.act('foo:1', function (err, out) {
          expect(err).to.not.exist()
          expect(out.foo).to.equal(1)

          this.act('bar:1', function (err, out) {
            expect(err).to.not.exist()
            expect(out.bar).to.equal(2)

            this.act('zed:1', function (err, out) {
              expect(err).to.not.exist()
              expect(out.zed).to.equal(1)

              if (err) return done(err)
              this.close(done)
            })
          })
        })
      })
  })

  /* TODO: move to @seneca/transport, use network to test
  it('transport-balance-exact', test_opts, function (done) {
    const st = make_simple_transport()
    var bt = make_balance_transport()

    var s0, s1, s9, c0

    make_s0()

    function make_s0() {
      s0 = Seneca({
        tag: 'srv',
        timeout: 5555,
        log: 'silent',
        debug: { short_logs: true },
      })
        .use(st)
        .error(done)
        .add('foo:1', function (msg, reply, meta) {
          // ensure action id is transferred for traceability
          expect('aa/BB').to.equal(meta.id)
          msg.s = 0
          testact.call(this, msg, reply)
        })
        .add('bar:1', function (msg, reply) {
          reply({ bar: 1, q: 1 })
        })
        .listen({ port: 44440, pin: 'foo:1', type:'simple' })
        .ready(make_s1)
    }

    function make_s1() {
      s1 = Seneca({
        tag: 'srv',
        timeout: 5555,
        log: 'silent',
        debug: { short_logs: true },
      })
        .use(st)
        .error(done)
        .add('foo:1', function (msg, reply, meta) {
          // ensure action id is transferred for traceability
          expect('cc/DD').to.equal(meta.id)
          msg.s = 1
          testact.call(this, msg, reply)
        })
        .listen({ port: 44441, pin: 'foo:1', type:'simple' })
        .ready(make_s9)
    }

    function make_s9() {
      s9 = Seneca({
        tag: 'srv',
        timeout: 22222 * tmx,
        log: 'silent',
        debug: { short_logs: true },
      })
        .use(st)
        .error(done)
        .add('bar:2', function (msg, reply) {
          reply({ bar: 2, q: 2 })
        })
        .listen({ port: 44449, pin: 'foo:1', type:'simple' })
        .ready(run_client)
    }

    function run_client() {
      c0 = Seneca({
        tag: 'cln',
        timeout: 22222 * tmx,
        log: 'silent',
        debug: { short_logs: true },
      })
        .error(done)
        .use(st)
        .use(bt)
        .client({ type: 'balance', pin: 'foo:1' })
        .client({ type: 'simple', port: 44440, pin: 'foo:1' })
        .client({ type: 'simple', port: 44441, pin: 'foo:1' })
        .client({ type: 'simple', port: 44440, pin: 'bar:1' })
        .client({ type: 'simple', port: 44449, pin: 'bar:2' })

      c0.act('foo:1,actid$:aa/BB', function (err, out) {
        expect(err).to.not.exist()
        expect(out.foo).to.equal(1)
        expect(out.s).to.equal(0)

        c0.act('foo:1,actid$:cc/DD', function (err, out) {
          expect(err).to.not.exist()
          expect(out.foo).to.equal(1)
          expect(out.s).to.equal(1)

          c0.act('bar:1', function (err, out) {
            expect(err).to.not.exist()
            expect(out.q).to.equal(1)

            c0.act('bar:1', function (err, out) {
              expect(err).to.not.exist()
              expect(out.q).to.equal(1)

              c0.act('bar:2', function (err, out) {
                expect(err).to.not.exist()
                expect(out.q).to.equal(2)

                s0.close(function () {
                  s1.close(function () {
                    s9.close(function () {
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

  // Thanks to https://github.com/davide-talesco for this test
  // https://github.com/senecajs/seneca-transport/issues/165
  it('multi-layer-error', test_opts, function (fin) {
    const s1 = Seneca({ tag: 's1', legacy: { transport: false } }).quiet()
    const s2 = Seneca({ tag: 's2', legacy: { transport: false } }).quiet()
    const s3 = Seneca({ tag: 's3', legacy: { transport: false } }).quiet()

    s1.client({ port: 40402, pin: 'cmd:test2' })
      .add('cmd:test1', function (msg, reply) {
        this.act('cmd:test2', reply)
      })
      .listen(40401)

    s2.client({ port: 40403, pin: 'cmd:test3' })
      .add('cmd:test2', function (msg, reply) {
        this.act('cmd:test3', reply)
      })
      .listen(40402)

    s3.add('cmd:test3', function (msg, reply) {
      throw new Error('from-test3')
    }).listen(40403)

    s1.ready(
      s2.ready.bind(
        s2,
        s3.ready.bind(s3, function () {
          s1.act('cmd:test1', function (err) {
            expect(err.message).equal('from-test3')
            s1.close(s2.close.bind(s2, s3.close.bind(s3, fin)))
          })
        }),
      ),
    )
  })

  it(
    'server can be restarted without issues to clients',
    test_opts,
    function (done) {
      var execCount = 0
      var server = Seneca({ log: 'silent' })
      server.add({ cmd: 'foo' }, function (message, cb) {
        execCount++
        cb(null, { result: 'bar' })
      })
      server.listen({ port: 0 }, function (err, address) {
        expect(err).to.not.exist()
        var client = Seneca({ log: 'silent', timeout: 22222 * tmx })
        client.client({ port: address.port })
        client.ready(function () {
          client.act({ cmd: 'foo' }, function (err, message) {
            expect(err).to.not.exist()
            expect(message.result).to.equal('bar')
            server.close(function () {
              var server2 = Seneca({ log: 'silent' })
              server2.add({ cmd: 'foo' }, function (message, cb) {
                cb(null, { result: 'bar' })
              })
              server2.listen({ port: address.port })
              server2.ready(function () {
                client.act({ cmd: 'foo' }, function (err, message) {
                  expect(err).to.not.exist()
                  expect(message.result).to.equal('bar')
                  expect(execCount).to.equal(1)
                  server2.close(client.close.bind(client, done))
                })
              })
            })
          })
        })
      })
    },
  )
  */
  
})
