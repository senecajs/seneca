/* Copyright © 2013-2018 Richard Rodger and other contributors, MIT License. */
'use strict'

var Assert = require('assert')

var Gex = require('gex')
var Lab = require('@hapi/lab')

var lab = (exports.lab = Lab.script())
var describe = lab.describe
var assert = Assert
var testopts = { log: 'silent' }

var Shared = require('./shared')
var it = Shared.make_it(lab)

var Seneca = require('..')

describe('delegation', function() {
  it('happy', function(fin) {
    var si = Seneca().test(fin)

    si.add({ c: 'C' }, function(msg, reply) {
      reply(msg)
    })
    var sid = si.delegate({ a$: 'A', b: 'B' })

    assert.ok(Gex('Seneca/*.*.*/*').on(si.toString()))
    assert.ok(Gex('Seneca/*.*.*/*/{b:B}').on(sid.toString()))

    si.act({ c: 'C' }, function(err, out) {
      assert.ok(!err)
      assert.ok(out.c === 'C')

      sid.act({ c: 'C' }, function(err, out) {
        assert.ok(!err)
        assert.ok(out.c === 'C')
        assert.ok(out.b === 'B')
        si.close(fin)
      })
    })
  })

  it('dynamic', function(fin) {
    var si = Seneca.test(fin)
    si.add({ c: 'C' }, function(msg, reply) {
      reply(msg)
    })
    si.add({ d: 'D' }, function(msg, reply) {
      this.act({ c: 'C', d: 'D' }, reply)
    })
    var sid = si.delegate({ a$: 'A', b: 'B' })

    si.act({ c: 'C' }, function(err, out) {
      assert.ok(!err)
      assert.ok(out.c === 'C')

      si.act({ d: 'D' }, function(err, out) {
        assert.ok(!err)
        assert.ok(out.c === 'C')
        assert.ok(out.d === 'D')

        sid.act({ c: 'C' }, function(err, out) {
          assert.ok(!err)
          assert.ok(out.c === 'C')
          assert.ok(out.b === 'B')

          sid.act({ d: 'D' }, function(err, out) {
            assert.ok(!err)
            assert.ok(out.b === 'B')
            assert.ok(out.c === 'C')
            assert.ok(out.d === 'D')

            sid.close(si.close.bind(si, fin))
          })
        })
      })
    })
  })

  it('prior.basic', function(fin) {
    var si = Seneca().test(fin)

    si.add({ c: 'C' }, function c0(msg, reply) {
      msg.a = 1
      reply(msg)
    })

    si.add({ c: 'C' }, function c1(msg, reply) {
      this.prior(msg, function(err, out) {
        out.p = 2
        reply(err, out)
      })
    })

    si.act({ c: 'C' }, function(err, out) {
      assert.equal(err, null)
      assert.equal(out.a, 1)
      assert.equal(out.p, 2)
      si.close(fin)
    })
  })

  it('parent.plugin', function(fin) {
    var si = Seneca.test(fin)

    si.use(function() {
      this.add({ a: 'A' }, function(msg, reply) {
        this.log.debug('P', '1')
        msg.p1 = 1
        reply(msg)
      })
      return { name: 'p1' }
    })

    si.act({ a: 'A' }, function(err, out) {
      assert.ok(!err)
      assert.ok(out.a === 'A')
      assert.ok(out.p1 === 1)

      si.use(function() {
        this.add({ a: 'A' }, function(msg, reply) {
          this.log.debug('P', '2a')

          this.prior(msg, function(err, out) {
            this.log.debug('P', '2b')
            out.p2 = 1
            reply(err, out)
          })
        })
        return { name: 'p2' }
      })

      si.act({ a: 'A' }, function(err, out) {
        assert.ok(!err)
        assert.ok(out.a === 'A')
        assert.ok(out.p1 === 1)
        assert.ok(out.p2 === 1)

        si.use(function() {
          this.add({ a: 'A' }, function(msg, reply) {
            this.log.debug('P', '3a')

            this.prior(msg, function(err, out) {
              this.log.debug('P', '3b')
              out.p3 = 1
              reply(err, out)
            })
          })
          return { name: 'p3' }
        })

        si.act({ a: 'A' }, function(err, out) {
          assert.ok(!err)
          assert.ok(out.a === 'A')
          assert.ok(out.p1 === 1)
          assert.ok(out.p2 === 1)
          assert.ok(out.p3 === 1)

          si.close(fin)
        })
      })
    })
  })
})
