/* Copyright © 2010-2018 Richard Rodger and other contributors, MIT License. */
'use strict'

var Code = require('code')
var Lab = require('@hapi/lab')

var lab = (exports.lab = Lab.script())
var describe = lab.describe
var expect = Code.expect

var Shared = require('./shared')
var it = Shared.make_it(lab)

var Seneca = require('..')

describe('close', function() {
  it('happy', function(fin) {
    Seneca()
      .test(fin)
      .close(function(err) {
        expect(err).not.exists()
        fin()
      })
  })

  it('add', function(fin) {
    var tmp = {}
    Seneca()
      .test(fin)
      .add('role:seneca,cmd:close', function(msg, reply) {
        tmp.sc = 1
        this.prior(msg, reply)
      })
      .close(function(err) {
        expect(1).to.equal(tmp.sc)
        fin()
      })
  })

  it('sub', function(fin) {
    var tmp = {}
    Seneca()
      .test(fin)
      .sub('role:seneca,cmd:close', function() {
        tmp.sc = 1
      })
      .close(function() {
        expect(1).to.equal(tmp.sc)
        fin()
      })
  })

  it('graceful', function(fin) {
    var log = []
    Seneca({ log: 'silent' })
      .add('a:1', function a1(msg, reply) {
        log.push(msg.x)
        reply()
      })
      .ready(function() {
        this.act('a:1,x:1')
          .close(function() {
            expect(log).equal([1])
          })
          .ready(function() {
            this.act('a:1,x:2', function(err) {
              expect(err.code).equal('closed')
              fin()
            })
          })
      })
  })

  it('timeout', function(fin) {
    var tmp = {}
    Seneca({ close_delay: 111 })
      .test(fin)
      .add('a:1', function a1(msg, reply) {
        setTimeout(function() {
          tmp.a = 1
          reply()
        }, 1111)
      })
      .act('a:1')
      .close(function() {
        expect(tmp.a).not.exists()
        fin()
      })
  })

  it('handle-signal', function(fin) {
    Seneca({
      system: {
        exit: function(exit_val) {
          expect(exit_val).equal(0)
          fin()
        }
      }
    })
      .test(fin)
      .private$.handle_close()
  })

  it('error', function(fin) {
    Seneca({ log: 'silent' })
      .add('role:seneca,cmd:close', function(msg, reply) {
        reply(new Error('bad-close'))
      })
      .close(function(err) {
        expect(err.message).equal(
          'seneca: Action cmd:close,role:seneca failed: bad-close.'
        )
        fin()
      })
  })
})
