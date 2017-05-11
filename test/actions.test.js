'use strict'

var Code = require('code')
var Lab = require('lab')

var lab = (exports.lab = Lab.script())
var describe = lab.describe
var it = lab.it
var expect = Code.expect

var Seneca = require('..')

describe('api', function() {
  var si = Seneca({ log: 'silent' })

  function z(msg, reply) {
    reply({ z: msg.z })
  }

  it('cmd_stats', function(fin) {
    si.test(fin).act('role:seneca,cmd:stats', function(err, out) {
      expect(out.act).exists()
      expect(out.actmap).not.exists()

      this.act('role:seneca,cmd:stats,summary:false', function(err, out) {
        expect(out.act).exists()
        expect(out.actmap).exists()
        fin()
      })
    })
  })

  it('cmd_close', function(fin) {
    var si = Seneca({ log: 'silent' })

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
    var si = Seneca({ log: 'silent' })
    si.close = function() {}

    si
      .add('role:seneca,cmd:close', function(msg, reply) {
        reply()
      })
      .sub('role:seneca,info:fatal', function(msg) {
        expect(msg.err.meta$.pattern).equal('a:1')
        fin()
      })
      .add('a:1', function() {
        throw new Error('a:1')
      })
      .act('a:1,fatal$:true')
  })

  it('get_options', function(fin) {
    var si = Seneca({ tag: 'foo' }).test(fin)
    si.act('role:seneca,get:options', function(err, out) {
      expect(err).not.exist()
      expect(out).exist()
      expect(out.tag).equals('foo')
      expect(si.tag).equals('foo')
      fin()
    })
  })
})
