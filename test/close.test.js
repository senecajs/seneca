/* Copyright © 2010-2024 Richard Rodger and other contributors, MIT License. */
'use strict'

const assert = require('node:assert/strict')
const { describe, it } = require('node:test')

var Seneca = require('..')
var Transports = require('./stubs/transports.js')

describe('close', function () {
  it('happy', function (t, fin) {
    Seneca()
      .test(fin)
      .close(function (err) {
        assert.ifError(err)
        fin()
      })
  })

  it('add', function (t, fin) {
    var tmp = {}
    Seneca()
      .test(fin)
      .add('sys:seneca,cmd:close', function (msg, reply) {
        tmp.sc = 1
        this.prior(msg, reply)
      })
      .close(function (err) {
        assert.equal(1, tmp.sc)
        fin()
      })
  })

  it('graceful', function (t, fin) {
    var log = []
    Seneca({ log: 'silent' })
      .add('a:1', function a1(msg, reply) {
        log.push(msg.x)
        reply()
      })
      .ready(function () {
        this.act('a:1,x:1')
          .close(function () {
            assert.deepEqual(log, [1])
          })
          .ready(function () {
            this.act('a:1,x:2', function (err) {
              assert.equal(err.code, 'closed')
              fin()
            })
          })
      })
  })

  it('timeout', function (t, fin) {
    var tmp = {}
    Seneca({ close_delay: 111 })
      .test(fin)
      .add('a:1', function a1(msg, reply) {
        setTimeout(function () {
          tmp.a = 1
          reply()
        }, 1111)
      })
      .act('a:1')
      .close(function () {
        assert.ok(null == tmp.a)
        fin()
      })
  })

  it('handle-signal', function (t, fin) {
    Seneca({
      system: {
        exit: function (exit_val) {
          assert.equal(exit_val, 0)
          fin()
        },
      },
    })
      .test(fin)
      .private$.exit_close()
  })

  it('error', function (t, fin) {
    Seneca()
      .test()
      .quiet()
      .add('sys:seneca,cmd:close', function (msg, reply) {
        reply(new Error('bad-close'))
      })
      .close(function (err) {
        assert.equal(err.message, 'bad-close')
        fin()
      })
  })

  it('no-promise', function (t, fin) {
    var si = Seneca().test(fin)

    // false means do not return Promise
    var si0 = si.close(false)
    assert.deepEqual(si, si0)

    // waits for sys:seneca,cmd:close to complete
    si.ready(() => {
      assert.equal(si.flags.closed, true)
      fin()
    })
  })

  it('with-promise', function (t, fin) {
    var si = Seneca().test(fin)

    var p0 = si.close()

    assert.ok(p0 instanceof Promise)

    p0.then(function () {
      assert.equal(si.flags.closed, true)
      fin()
    }).catch(function (err) {
      fin(err)
    })
  })

  it('with-async-await', async () => {
    var si = Seneca().test()

    await si.close()

    assert.equal(si.flags.closed, true)
  })

  it('legacy-close-pattern', function (t, fin) {
    // Seneca 3.x plugins (for example seneca-transport) register close
    // hooks on role:seneca,cmd:close. These must still run on close.
    var tmp = { legacy: 0, sys: 0 }

    Seneca()
      .test(fin)
      .add('role:seneca,cmd:close', function (msg, reply) {
        tmp.legacy++
        this.prior(msg, reply)
      })
      .add('sys:seneca,cmd:close', function (msg, reply) {
        tmp.sys++
        this.prior(msg, reply)
      })
      .close(function (err) {
        assert.ifError(err)
        assert.equal(tmp.sys, 1)
        assert.equal(tmp.legacy, 1)
        fin()
      })
  })

  it('legacy-close-hook-with-catchall-client', function (t, fin) {
    // A 3.x close hook (as registered by seneca-transport 8.3) added after
    // a catch-all client has the client as its prior. The close message
    // is local$, so the client does not send it to the remote service,
    // which would close the service's listeners.
    var st = Transports.make_simple_transport()
    var tmp = { hook: 0, remote: 0 }

    var s0 = Seneca({ id$: 's0' })
      .test(fin)
      .use(st)
      .listen({ type: 'simple' })
      .add('role:seneca,cmd:close', function (msg, reply) {
        tmp.remote++
        reply()
      })

    var c0 = Seneca({ id$: 'c0' }).test(fin).use(st).client({ type: 'simple' })

    c0.ready(function () {
      c0.add('role:seneca,cmd:close', function (msg, reply) {
        tmp.hook++
        this.prior(msg, reply)
      })

      c0.close(function (err) {
        assert.ifError(err)
        assert.equal(tmp.hook, 1)
        assert.equal(tmp.remote, 0)
        s0.close(fin)
      })
    })
  })

  it('legacy-builtin-close-event-once', function (t, fin) {
    var tmp = { close: 0, legacy: 0 }

    var si = Seneca({ legacy: { builtin_actions: true } })
      .test(fin)
      .add('role:seneca,cmd:close', function (msg, reply) {
        tmp.legacy++
        this.prior(msg, reply)
      })

    si.on('close', function () {
      tmp.close++
    })

    si.close(function (err) {
      assert.ifError(err)
      assert.equal(tmp.close, 1)
      assert.equal(tmp.legacy, 1)
      fin()
    })
  })

  it('legacy-builtin-close-direct-call-emits', function (t, fin) {
    // A direct call of the 3.x close pattern still emits the close event,
    // as it did in Seneca 3 (legacy.builtin_actions).
    var tmp = { close: 0 }

    var si = Seneca({ legacy: { builtin_actions: true } }).test(fin)

    si.on('close', function () {
      tmp.close++
    })

    si.act('role:seneca,cmd:close', function (err) {
      assert.ifError(err)
      assert.equal(tmp.close, 1)
      assert.equal(si.flags.closed, false)

      // A full close emits exactly once more, via sys:seneca,cmd:close.
      si.close(function (err) {
        assert.ifError(err)
        assert.equal(tmp.close, 2)
        fin()
      })
    })
  })

  it('transport-utils-close', function (t, fin) {
    var tmp = { closer: 0 }

    var si = Seneca().test(fin)
    var tu = si.export('transport/utils')

    tu.close(si, function (done) {
      tmp.closer++
      done()
    })

    si.close(function (err) {
      assert.ifError(err)
      assert.equal(tmp.closer, 1)
      fin()
    })
  })
})
