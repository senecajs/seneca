/* Copyright © 2010-2024 Richard Rodger and other contributors, MIT License. */
'use strict'

const Code = require('@hapi/code')
const { describe } = require('node:test')
var expect = Code.expect

var Shared = require('./shared')
var it = Shared.make_it()

var Seneca = require('..')

describe('close', function () {
  it('happy', function (fin) {
    Seneca()
      .test(fin)
      .close(function (err) {
        expect(err).not.exists()
        fin()
      })
  })

  it('add', function (fin) {
    var tmp = {}
    Seneca()
      .test(fin)
      .add('sys:seneca,cmd:close', function (msg, reply) {
        tmp.sc = 1
        this.prior(msg, reply)
      })
      .close(function (err) {
        expect(1).to.equal(tmp.sc)
        fin()
      })
  })

  it('graceful', function (fin) {
    var log = []
    Seneca({ log: 'silent' })
      .add('a:1', function a1(msg, reply) {
        log.push(msg.x)
        reply()
      })
      .ready(function () {
        this.act('a:1,x:1')
          .close(function () {
            expect(log).equal([1])
          })
          .ready(function () {
            this.act('a:1,x:2', function (err) {
              expect(err.code).equal('closed')
              fin()
            })
          })
      })
  })

  it('timeout', function (fin) {
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
        expect(tmp.a).not.exists()
        fin()
      })
  })

  it('handle-signal', function (fin) {
    Seneca({
      system: {
        exit: function (exit_val) {
          expect(exit_val).equal(0)
          fin()
        },
      },
    })
      .test(fin)
      .private$.exit_close()
  })

  it('error', function (fin) {
    Seneca()
      .test()
      .quiet()
      .add('sys:seneca,cmd:close', function (msg, reply) {
        reply(new Error('bad-close'))
      })
      .close(function (err) {
        expect(err.message).equal(
          // 'seneca: Action cmd:close,sys:seneca failed: bad-close.',
          'bad-close',
        )
        fin()
      })
  })

  it('no-promise', function (fin) {
    var si = Seneca().test(fin)

    // false means do not return Promise
    var si0 = si.close(false)
    expect(si).equal(si0)

    // waits for sys:seneca,cmd:close to complete
    si.ready(() => {
      expect(si.flags.closed).true()
      fin()
    })
  })

  it('with-promise', function (fin) {
    var si = Seneca().test(fin)

    var p0 = si.close()

    expect(p0).instanceof(Promise)

    p0.then(function () {
      expect(si.flags.closed).true()
      fin()
    }).catch(function (err) {
      fin(err)
    })
  })

  it('with-async-await', async () => {
    var si = Seneca().test()

    await si.close()

    expect(si.flags.closed).true()
  })

  it('legacy-close-pattern', function (fin) {
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
        expect(err).not.exists()
        expect(tmp.sys).equal(1)
        expect(tmp.legacy).equal(1)
        fin()
      })
  })

  it('legacy-builtin-close-event-once', function (fin) {
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
      expect(err).not.exists()
      expect(tmp.close).equal(1)
      expect(tmp.legacy).equal(1)
      fin()
    })
  })

  it('legacy-builtin-close-direct-call-emits', function (fin) {
    // A direct call of the 3.x close pattern still emits the close event,
    // as it did in Seneca 3 (legacy.builtin_actions).
    var tmp = { close: 0 }

    var si = Seneca({ legacy: { builtin_actions: true } }).test(fin)

    si.on('close', function () {
      tmp.close++
    })

    si.act('role:seneca,cmd:close', function (err) {
      expect(err).not.exists()
      expect(tmp.close).equal(1)
      expect(si.flags.closed).false()

      // A full close emits exactly once more, via sys:seneca,cmd:close.
      si.close(function (err) {
        expect(err).not.exists()
        expect(tmp.close).equal(2)
        fin()
      })
    })
  })

  it('transport-utils-close', function (fin) {
    var tmp = { closer: 0 }

    var si = Seneca().test(fin)
    var tu = si.export('transport/utils')

    tu.close(si, function (done) {
      tmp.closer++
      done()
    })

    si.close(function (err) {
      expect(err).not.exists()
      expect(tmp.closer).equal(1)
      fin()
    })
  })
})
