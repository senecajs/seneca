/* Copyright (c) 2019 Richard Rodger, MIT License */
'use strict'

const tmx = parseInt(process.env.TIMEOUT_MULTIPLIER || 1, 10)

const Lab = require('@hapi/lab')
const Code = require('@hapi/code')

const lab = (exports.lab = Lab.script())
const describe = lab.describe
const expect = Code.expect

const Shared = require('./shared')
const it = Shared.make_it(lab)

const Seneca = require('..')

describe('ready', function() {
  it('ready_die', function(fin) {
    const si = Seneca({
      log: 'silent',
      debug: { undead: true },
      errhandler: function(err) {
        try {
          expect(err.foo).exist()
          fin()
        } catch (e) {
          fin(e)
        }
      }
    })

    si.ready(function() {
      const e = new Error('EEE')
      e.foo = true
      throw e
    })
  })

  it('ready_die_no_errhandler', function(fin) {
    const si = Seneca({
      log: function(entry) {
        if ('fatal' === entry.kind && 'ready_failed' === entry.code) {
          fin()
        }
      },
      debug: { undead: true }
    })

    si.ready(function() {
      const e = new Error('EEE')
      e.foo = true
      throw e
    })
  })

  // This can happen in the browser
  it('ready_null_name', function(fin) {
    const si = Seneca().test(fin)

    var null_ready = function() {
      fin()
    }

    Object.defineProperty(null_ready, 'name', { value: null })

    si.ready(null_ready)
  })

  it('ready-complex', function(done) {
    var mark = { ec: 0 }

    var si = Seneca().test()
    si.ready(function() {
      mark.r0 = true

      si.use(function p1() {
        si.add({ init: 'p1' }, function(args, done) {
          setTimeout(function() {
            mark.p1 = true

            done()
          }, 20)
        })
      })

      si.on('ready', function() {
        mark.ec++
      })

      si.ready(function() {
        mark.r1 = true

        si.use(function p2() {
          si.add({ init: 'p2' }, function(args, done) {
            setTimeout(function() {
              mark.p2 = true
              done()
            }, 20)
          })
        })
      })

      si.ready(function() {
        expect(mark.r0).exist()
        expect(mark.p1).exist()
        expect(mark.r1).exist()
        expect(mark.p2).exist()
        expect(mark.ec).equal(2)

        done()
      })
    })
  })

  it('ready-always-called', function(fin) {
    Seneca.test(fin).ready(function() {
      this.ready(fin)
    })
  })

  it('ready-error-test', function(fin) {
    var si = Seneca()
      .test()
      .error(function(err) {
        expect(err.code).equal('ready_failed')
        expect(err.message).equal('seneca: Ready function failed: foo')
        fin()
      })

    si.ready(function() {
      throw new Error('foo')
    })
  })

  it('ready-event', function(done) {
    var si = Seneca().test()

    si.on('ready', function() {
      done()
    })
  })

  it('ready-both', function(done) {
    var si = Seneca().test()
    var tmp = {}

    si.on('ready', function() {
      tmp.a = 1
      complete()
    })

    si.ready(function() {
      tmp.b = 1
      complete()
    })

    function complete() {
      if (tmp.a && tmp.b) {
        done()
      }
    }
  })
})
