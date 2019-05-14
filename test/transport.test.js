/* Copyright (c) 2014-2018 Richard Rodger and other contributors, MIT License */
'use strict'

var _ = require('lodash')
var Code = require('code')
var Lab = require('@hapi/lab')

var Common = require('../lib/common')
var Transport = require('../lib/api')
var TransportStubs = require('./stubs/transports')

// Test shortcuts
var lab = (exports.lab = Lab.script())
var describe = lab.describe
var expect = Code.expect

var Shared = require('./shared')
var it = Shared.make_it(lab)

var Seneca = require('..')

var tmx = parseInt(process.env.TIMEOUT_MULTIPLIER || 1, 10)

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
  }, 11 * tmx)
}

var test_opts = { parallel: false, timeout: 5555 * tmx }

describe('transport', function() {
  // TODO: test top level qaz:* : def and undef other pats

  it('happy-nextgen', test_opts, function(fin) {
    var s0 = Seneca({ id$: 's0', legacy: { transport: false } }).test(fin)
    var c0 = Seneca({
      id$: 'c0',
      timeout: 22222 * tmx,
      legacy: { transport: false }
    }).test(fin)

    s0.add('a:1', function a1(msg, reply, meta) {
      reply({ x: msg.x })
    })
      .add('b:1', function a1(msg, reply, meta) {
        reply([1, 2, 3])
      })
      .listen(62010)
      .ready(function() {
        c0.client(62010)

        c0.act('a:1,x:2', function(ignore, out, meta) {
          expect(out.x).equals(2)
          expect(out.meta$).not.exist()

          expect(meta.pattern).equals('')
          expect(meta.trace[0].desc[0]).equals('a:1')
          c0.act('b:1', function(ignore, out, meta) {
            expect(out).equals([1, 2, 3])

            s0.close(c0.close.bind(c0, fin))
          })
        })
      })
  })

  it('config-legacy-nextgen', test_opts, function(fin) {
    var s0 = Seneca({ id$: 's0', legacy: { transport: false } }).test(fin)
    var c0 = Seneca({
      id$: 'c0',
      timeout: 22222 * tmx,
      legacy: { transport: false }
    }).test(fin)

    s0.add('a:1', function a1(msg, reply, meta) {
      reply({ x: msg.x })
    })
      .listen({ id: 's0a', port: 62011, type: 'direct' })
      .listen({ id: 's0b', port: 62012, type: 'http' })
      .ready(function() {
        c0.client({ id: 'c0a', port: 62011, pin: 'x:1' })
          .client({ id: 'c0b', port: 62012, pin: 'x:2' })

          .act('a:1,x:1', function(ignore, out) {
            expect(out.x).equals(1)
          })
          .act('a:1,x:2', function(ignore, out) {
            expect(out.x).equals(2)
          })
          .ready(function() {
            s0.close(c0.close.bind(c0, fin))
          })
      })
  })

  it('error-nextgen', test_opts, function(fin) {
    var s0 = Seneca({ id$: 's0', log: 'silent', legacy: { transport: false } })
    var c0 = Seneca({
      id$: 'c0',
      log: 'silent',
      timeout: 22222 * tmx,
      legacy: { transport: false }
    })

    s0.add('a:1', function a1(msg, reply, meta) {
      reply(new Error('bad'))
    })
      .listen(62011)
      .ready(function() {
        c0.client(62011)

        c0.act('a:1,x:2', function(err, out, meta) {
          expect(err).exist()
          expect(out).not.exist()
          expect(err.meta$).not.exist()

          expect(err.message).equal('bad')

          expect(meta.pattern).equals('')
          expect(meta.err.code).equals('act_execute')

          s0.close(c0.close.bind(c0, fin))
        })
      })
  })

  it('interop-nextgen', test_opts, function(fin) {
    var s0n = Seneca({
      id$: 's0n',
      log: 'silent',
      legacy: { transport: false }
    })
    var s0o = Seneca({ id$: 's0o', log: 'silent', legacy: { transport: true } })
    var c0n = Seneca({
      id$: 'c0n',
      log: 'silent',
      timeout: 22222 * tmx,
      legacy: { transport: false }
    })
    var c0o = Seneca({
      id$: 'c0o',
      log: 'silent',
      timeout: 22222 * tmx,
      legacy: { transport: true }
    })

    //s0o.test('print')
    //c0n.test('print')
    //s0n.test('print')
    //c0o.test('print')

    s0n
      .add('a:1', function a1(msg, reply, meta) {
        reply({ r: msg.x })
      })
      .listen(62012)

    s0o
      .add('a:1', function a1(msg, reply, meta) {
        reply({ r: msg.x })
      })
      .listen(62013)

    s0n.ready(
      s0o.ready.bind(s0o, function() {
        c0n.client(62013) // n -> o
        c0o.client(62012) // o -> n

        c0n.act('a:1,x:1', function(err, out, meta) {
          expect(err).not.exist()
          expect(out.r).equal(1)
          expect(meta.pattern).equal('')

          c0o.act('a:1,x:2', function(err, out, meta) {
            expect(err).not.exist()
            expect(out.r).equal(2)
            expect(meta.pattern).equal('')

            fin()
          })
        })
      })
    )
  })

  it('config-nextgen', test_opts, function(fin) {
    var s0 = Seneca({
      tag: 's0',
      legacy: { transport: false },
      transport: { web: { port: 62020 } }
    })
      .test(fin)
      .use('entity')

    var c0 = Seneca({
      tag: 'c0',
      timeout: 22222 * tmx,
      transport: { web: { port: 62020 } },
      legacy: { transport: false }
    })
      .test(fin)
      .use('entity')

    s0.add('a:1', function(msg, reply) {
      reply({ x: msg.x })
    })
      .add('b:1', function(msg, reply, meta) {
        expect(msg.x.canon$()).equal('-/-/foo')
        expect(meta.pattern).equal('b:1')
        msg.x.g = 2
        reply({ x: msg.x })
      })
      .listen()
      .ready(function() {
        expect(s0.private$.transport.register.length).equal(1)

        c0.client().ready(function() {
          expect(c0.private$.transport.register.length).equal(1)

          c0.act('a:1,x:2', function(ignore, out) {
            do_entity()
          })
        })
      })

    function do_entity() {
      c0.act('b:1', { x: c0.make$('foo', { f: 1 }) }, function(
        ignore,
        out,
        meta
      ) {
        expect(out.x.f).equals(1)
        expect(out.x.g).equals(2)
        expect(out.x.canon$()).equal('-/-/foo')
        expect(meta.pattern).equal('')

        s0.close(c0.close.bind(c0, fin))
      })
    }
  })

  it('nextgen-transport-local-override', test_opts, function(fin) {
    Seneca({
      tag: 's0',
      timeout: 22222 * tmx,
      transport: { web: { port: 62020 } },
      legacy: { transport: false }
    })
      .test(fin)
      .add('foo:1', function foo_srv(msg, reply, meta) {
        reply({ bar: 1 })
      })
      .listen({ pin: 'foo:1' })
      .ready(function() {
        Seneca({
          tag: 'c0',
          timeout: 22222 * tmx,
          transport: { web: { port: 62020 } },
          legacy: { transport: false }
        })
          .test(fin)
          .add('foo:1', function foo_cln(msg, reply, meta) {
            reply({ bar: 2 })
          })
          .client({ pin: 'foo:1' })
          .act('foo:1,actid$:aa/BB', function(err, out) {
            expect(err).to.not.exist()

            // The remote version overrides the local version
            expect(out.bar).to.equal(1)

            // console.dir(this.find('foo:1'), { depth: null })

            fin()
          })
      })
  })

  it('nextgen-meta', test_opts, function(fin) {
    var s0 = Seneca({ id$: 's0', legacy: { transport: false } }).test(fin)
    var c0 = Seneca({
      id$: 'c0',
      timeout: 22222 * tmx,
      legacy: { transport: false }
    }).test(fin)

    s0.add('a:1', function a1(msg, reply, meta) {
      expect(meta.remote).equal(1 === msg.r)

      // remote is not propogated - top level only
      if ('b' === msg.from) {
        expect(meta.remote).false()
      }

      reply({ x: msg.x, y: meta.custom.y })
    })
      .add('b:1', function a1(msg, reply, meta) {
        expect(meta.remote).equal(1 === msg.r)
        this.act('a:1', { x: msg.x, from: 'b' }, reply)
      })
      .listen(62010)
      .ready(function() {
        c0.client(62010).act(
          'a:1,x:2,r:1',
          { meta$: { custom: { y: 33 } } },
          function(ignore, out, meta) {
            expect(out.y).equals(33)
            expect(out.x).equals(2)

            this.act('b:1,x:3,r:1', { meta$: { custom: { y: 44 } } }, function(
              ignore,
              out,
              meta
            ) {
              expect(out.y).equals(44)
              expect(out.x).equals(3)

              s0.close(c0.close.bind(c0, fin))
            })
          }
        )
      })
  })

  it('nextgen-ordering', test_opts, function(fin) {
    var s0 = Seneca({ id$: 's0', legacy: { transport: false } }).test(fin)
    var c0 = Seneca({
      id$: 'c0',
      timeout: 22222 * tmx,
      legacy: { transport: false }
    }).test(fin)

    s0.add('a:1', function a1(msg, reply, meta) {
      reply({ x: 'a' })
    })
      .add('a:1,b:1', function a1(msg, reply, meta) {
        reply({ x: 'ab' })
      })
      .add('c:1', function a1(msg, reply, meta) {
        reply({ x: 'c' })
      })
      .add('c:1,d:1', function a1(msg, reply, meta) {
        reply({ x: 'cd' })
      })
      .listen(62010)
      .ready(function() {
        var i = 0
        c0.client({ port: 62010, pin: 'a:1' })
          .client({ port: 62010, pin: 'a:1,b:1' })
          .client({ port: 62010, pin: 'c:1,d:1' })
          .client({ port: 62010, pin: 'c:1' })
          .act('a:1', function(ignore, out) {
            expect(out).equal({ x: 'a' })
            i++
          })
          .act('c:1', function(ignore, out) {
            expect(out).equal({ x: 'c' })
            i++
          })
          .act('a:1,b:1', function(ignore, out) {
            expect(out).equal({ x: 'ab' })
            i++
          })
          .act('c:1,d:1', function(ignore, out) {
            expect(out).equal({ x: 'cd' })
            i++
          })
          .ready(function() {
            expect(i).equal(4)
            fin()
          })
      })
  })

  // TEST: parent and trace over transport - fake and network
  // TEST: separate reply - write TCP

  describe('listen()', function() {
    it('supports null options', test_opts, function(done) {
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

    it('supports type as tcp option', test_opts, function(done) {
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

    it('supports type as http option', test_opts, function(done) {
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

    it('supports the port number as an argument', test_opts, function(done) {
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

    it('supports the port number and host as an argument', test_opts, function(
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
        listen.call(seneca, 8080, 'localhost')
      }
      expect(fn).to.not.throw()
      done()
    })

    it(
      'supports the port number, host, and path as an argument',
      test_opts,
      function(done) {
        var listen = Transport.listen(_.noop)
        var seneca = {
          private$: { error: _.noop },
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
      }
    )

    it('action-error', test_opts, function(fin) {
      var listen = Transport.listen(_.noop)
      var seneca = {
        private$: {
          error: function(err) {
            expect(err).to.exist()
            fin()
          }
        },
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
        die: _.noop,
        context: {},
        make_log: function() {}
      }

      listen.call(seneca)
    })
  })

  describe('client()', function() {
    it('supports null options', test_opts, function(done) {
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
        private$: { ge: { gate: function() {} }, error: _.noop }
      }

      var fn = function() {
        client.call(seneca)
      }

      expect(fn).to.not.throw()
      done()
    })

    it('supports send to client queueing', test_opts, function(done) {
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
        private$: { ge: { gate: function() {} }, error: _.noop }
      }

      seneca.log.info = _.noop
      seneca.log.debug = _.noop

      client.call(seneca)
    })

    it('supports pins represented by strings', test_opts, function(done) {
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
  })

  it('transport-exact-single', test_opts, function(done) {
    var tt = make_test_transport()

    Seneca({ tag: 'srv', timeout: 5555 })
      .test(done)
      .use(tt)
      .add('foo:1', function(msg, reply, meta) {
        // ensure action id is transferred for traceability
        expect('aa/BB').to.equal(meta.id)
        testact.call(this, msg, reply)
      })
      .listen({ type: 'test', pin: 'foo:1' })
      //.listen({ port: 62222, pin: 'foo:1' })
      .ready(function() {
        //console.log(this.private$.actrouter)

        Seneca({ tag: 'cln', timeout: 22222 * tmx })
          .test(done)
          .use(tt)
          .client({ type: 'test', pin: 'foo:1' })
          //.client({ port: 62222, pin: 'foo:1' })
          .act('foo:1,actid$:aa/BB', function(err, out) {
            expect(err).to.not.exist()
            expect(out.foo).to.equal(1)

            done()
          })
      })
  })

  it('transport-local-override', test_opts, function(done) {
    var tt = make_test_transport()

    Seneca({ tag: 'srv', timeout: 5555 })
      .test(done)
      .use(tt)
      .add('foo:1', function foo_srv(msg, reply, meta) {
        reply({ bar: 1 })
      })
      .listen({ type: 'test', pin: 'foo:1' })
      .ready(function() {
        Seneca({ tag: 'cln', timeout: 22222 * tmx })
          .test(done)
          .use(tt)
          .add('foo:1', function foo_cln(msg, reply, meta) {
            reply({ bar: 2 })
          })
          .client({ type: 'test', pin: 'foo:1' })
          .act('foo:1,actid$:aa/BB', function(err, out) {
            expect(err).to.not.exist()

            // The remote version overrides the local version
            expect(out.bar).to.equal(1)

            done()
          })
      })
  })

  it('transport-star', test_opts, function(done) {
    var tt = make_test_transport()

    Seneca({ timeout: 22222 * tmx, log: 'silent', debug: { short_logs: true } })
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

        si.use(tt)
          .client({ type: 'test', pin: 'foo:*' })
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

  it('transport-star-pin-object', test_opts, function(done) {
    var tt = make_test_transport()

    Seneca({ timeout: 22222 * tmx, log: 'silent', debug: { short_logs: true } })
      .use(tt)
      .add('foo:1', testact)
      .add('foo:2', testact)
      .listen({ type: 'test', pin: { foo: '*' } })
      .ready(function() {
        var si = Seneca({
          timeout: 9999,
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

  it('transport-single-notdef', test_opts, function(fin) {
    var tt = make_test_transport()

    Seneca({ tag: 's0', timeout: 5555 })
      .test(fin)
      .use(tt)
      .add('foo:1', testact)
      .listen({ type: 'test', pin: 'foo:*' })
      .ready(function() {
        var si = Seneca({ tag: 'c0', timeout: 22222 * tmx, log: 'silent' })
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

  it('transport-pins-notdef', test_opts, function(fin) {
    var tt = make_test_transport()

    Seneca({ tag: 's0', timeout: 5555 })
      .test(fin)
      .use(tt)
      .add('foo:1', testact)
      .add('baz:2', testact)
      .listen({ type: 'test', pins: ['foo:1', 'baz:2'] })
      .ready(function() {
        var si = Seneca({
          timeout: 22222 * tmx,
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

  it('transport-single-wrap-and-star', test_opts, function(done) {
    var tt = make_test_transport()

    Seneca({ timeout: 22222 * tmx, log: 'silent', debug: { short_logs: true } })
      .use(tt)
      .add('foo:1', testact)
      .add('qaz:1', testact)
      .listen({ type: 'test', pin: 'foo:1' })
      .listen({ type: 'test', pin: 'qaz:*' })
      .ready(function() {
        var si = Seneca({
          timeout: 22222 * tmx,
          log: 'silent',
          debug: { short_logs: true }
        })
        si.use(tt)
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

  it('transport-local-single-and-star', test_opts, function(done) {
    var tt = make_test_transport()

    Seneca({ timeout: 5555, log: 'silent', debug: { short_logs: true } })
      .use(tt)
      .add('foo:2,qaz:1', testact)
      .add('foo:2,qaz:2', testact)
      .listen({ type: 'test', pin: 'foo:2,qaz:*' })
      .ready(function() {
        var si = Seneca({
          timeout: 22222 * tmx,
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

  it('transport-local-over-wrap', test_opts, function(done) {
    var tt = make_test_transport()

    Seneca({ timeout: 5555, log: 'silent', debug: { short_logs: true } })
      .use(tt)
      .add('foo:1', testact)
      .listen({ type: 'test', pin: 'foo:1' })
      .ready(function() {
        var si = Seneca({
          timeout: 22222 * tmx,
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

  it('transport-local-prior-wrap', test_opts, function(done) {
    var tt = make_test_transport()

    Seneca({ tag: 'srv', timeout: 22222 * tmx })
      .test(done)
      .use(tt)
      .add('foo:1', testact)
      .listen({ type: 'test', pin: 'foo:1' })
      .ready(function() {
        Seneca({ tag: 'cln', timeout: 22222 * tmx })
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

  it('transport-init-ordering', test_opts, function(done) {
    var tt = make_test_transport()

    var inits = {}

    Seneca({ timeout: 22222 * tmx, log: 'silent' })
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

  it('transport-no-plugin-init', test_opts, function(done) {
    var tt = make_test_transport()

    Seneca({ timeout: 22222 * tmx, log: 'silent', debug: { short_logs: true } })
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

  it('transport-balance-exact', test_opts, function(done) {
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
        .add('foo:1', function(msg, reply, meta) {
          // ensure action id is transferred for traceability
          expect('aa/BB').to.equal(meta.id)
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
        .add('foo:1', function(msg, reply, meta) {
          // ensure action id is transferred for traceability
          expect('cc/DD').to.equal(meta.id)
          msg.s = 1
          testact.call(this, msg, reply)
        })
        .listen({ port: 44441, pin: 'foo:1' })
        .ready(make_s9)
    }

    function make_s9() {
      s9 = Seneca({
        tag: 'srv',
        timeout: 22222 * tmx,
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
        timeout: 22222 * tmx,
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

  // Thanks to https://github.com/davide-talesco for this test
  // https://github.com/senecajs/seneca-transport/issues/165
  it('multi-layer-error', test_opts, function(fin) {
    const s1 = Seneca({ tag: 's1', legacy: { transport: false } }).quiet()
    const s2 = Seneca({ tag: 's2', legacy: { transport: false } }).quiet()
    const s3 = Seneca({ tag: 's3', legacy: { transport: false } }).quiet()

    s1.client({ port: 40402, pin: 'cmd:test2' })
      .add('cmd:test1', function(msg, reply) {
        this.act('cmd:test2', reply)
      })
      .listen(40401)

    s2.client({ port: 40403, pin: 'cmd:test3' })
      .add('cmd:test2', function(msg, reply) {
        this.act('cmd:test3', reply)
      })
      .listen(40402)

    s3.add('cmd:test3', function(msg, reply) {
      throw new Error('from-test3')
    }).listen(40403)

    s1.ready(
      s2.ready.bind(
        s2,
        s3.ready.bind(s3, function() {
          s1.act('cmd:test1', function(err) {
            expect(err.message).equal('from-test3')
            fin()
          })
        })
      )
    )
  })

  it('server can be restarted without issues to clients', test_opts, function(
    done
  ) {
    var execCount = 0
    var server = Seneca({ log: 'silent' })
    server.add({ cmd: 'foo' }, function(message, cb) {
      execCount++
      cb(null, { result: 'bar' })
    })
    server.listen({ port: 0 }, function(err, address) {
      expect(err).to.not.exist()
      var client = Seneca({ log: 'silent', timeout: 22222 * tmx })
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
