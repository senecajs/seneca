/* Copyright (c) 2017-2019 Richard Rodger and other contributors, MIT License */
'use strict'

var Util = require('util')

var Code = require('code')
var Lab = require('@hapi/lab')

var lab = (exports.lab = Lab.script())
var describe = lab.describe
var expect = Code.expect

var Shared = require('./shared')
var it = Shared.make_it(lab)

var Seneca = require('..')

describe('actions', function() {
  var si = Seneca({ log: 'silent' })

  function z(msg, reply) {
    reply({ z: msg.z })
  }

  it('cmd_ping', function(fin) {
    var si = Seneca({ legacy: { transport: false } }).test(fin)
    expect(si.ping().id).equals(si.id)

    si.listen().ready(function() {
      this.act('role:seneca,cmd:ping', function(err, out) {
        expect(out.id).equals(this.id)
        si.close(fin)
      })
    })
  })

  it('cmd_stats', function(fin) {
    var si = Seneca()
      .add('a:1')
      .act('a:1')

    si.test(fin).act('role:seneca,cmd:stats', function(err, out) {
      expect(out.act).exists()
      expect(out.actmap).not.exists()

      this.act('role:seneca,cmd:stats,summary:false', function(err, out) {
        expect(out.act).exists()
        expect(out.actmap).exists()

        this.act('role:seneca,cmd:stats,summary:false,pattern:"a:1"', function(
          err,
          out
        ) {
          expect(out.calls).equal(1)

          fin()
        })
      })
    })
  })

  it('cmd_close', function(fin) {
    var si = Seneca().test(fin)

    var log = []
    si.on('close', function() {
      log.push('event-close')
    })
    si.add('role:seneca,cmd:close', function(msg, reply) {
      log.push('custom-close')
      this.prior(msg, reply)
    })
    si.close(function() {
      expect(log).equals(['custom-close', 'event-close'])
      fin()
    })
  })

  it('info_fatal', function(fin) {
    var si = Seneca({ log: 'silent', system: { exit: function noop() {} } })
    setTimeout(function() {
      si.close = function() {}
      si.root.close = function() {}

      si.add('role:seneca,cmd:close', function(msg, reply) {
        reply()
      })
        .sub('role:seneca,info:fatal', function(msg) {
          expect(msg.err).exist()
          fin()
        })
        .add('a:1', function() {
          throw new Error('a:1')
        })
        .act('a:1,fatal$:true')
    }, 100)
  })

  it('get_options', function(fin) {
    var si = Seneca({ tag: 'foo', zed: { bar: { zoo: 1 } } }).test(fin)
    si.act('role:seneca,get:options', function(err, out) {
      expect(err).not.exist()
      expect(out).exist()
      expect(out.tag).equals('foo')
      expect(si.tag).equals('foo')

      this.act('role:seneca,get:options,base:zed,key:bar', function(err, out) {
        expect(err).not.exist()
        expect(out).exist()
        expect(out.zoo).equals(1)

        this.act('role:seneca,get:options,base:not-there,key:bar', function(
          err,
          out
        ) {
          expect(err).not.exist()
          expect(out).not.exist()

          fin()
        })
      })
    })
  })
})
