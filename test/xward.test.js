/* Copyright (c) 2016 Richard Rodger, MIT License */
'use strict'

const assert = require('node:assert/strict')

const { describe, it } = require('node:test')

const Seneca = require('..')

describe('xward', function () {
  it('happy-inward', function (t, fin) {
    Seneca()
      .test(fin)
      .inward(function (spec) {
        spec.data.msg.y = 3
      })
      .add('a:1', function (msg, done) {
        done(null, { x: 2, y: msg.y })
      })
      .act('a:1', function (ignore, out) {
        assert.equal(out.x, 2)
        assert.equal(out.y, 3)
        fin()
      })
  })

  it('happy-outward', function (t, fin) {
    Seneca()
      .test(fin)
      .outward(function (spec) {
        if (spec.data.res) {
          spec.data.res.z = 4
        }
      })
      .add('a:1', function (msg, done) {
        done(null, { x: 2, y: msg.y })
      })
      .act('a:1,y:3', function (ignore, out) {
        assert.equal(out.x, 2)
        assert.equal(out.y, 3)
        assert.equal(out.z, 4)
        fin()
      })
  })

  it('per-action-context', function (t, fin) {
    const seneca = Seneca() // {legacy:true})
      .test(fin)
      .inward(function (spec) {
        let context = spec.ctx.seneca.context
        context.shared = context.shared || {}
        context.shared.mark = (context.shared.mark || spec.data.msg.x) * 2

        let mi = spec.data.meta.mi
        context.peract = context.peract || {}
        let peract = (context.peract[mi] = context.peract[mi] || {})

        assert.ok(null == peract.mark)
        peract.mark = 2 * parseInt(spec.data.msg.x)
      })
      .outward(function (spec) {
        let context = spec.ctx.seneca.context

        if (context.shared) {
          context.shared.mark = context.shared.mark * 5
        }

        if (context.peract) {
          let mi = spec.data.meta.mi
          let peract = context.peract[mi] || {}
          peract.mark += 1
        }
      })
      .add('a:1', function a1(msg, done) {
        done({ x: msg.x })
      })
      .add('b:1', function b1(msg, done) {
        done({ x: msg.x })
      })
      .add('b:1', function b1p(msg, done) {
        this.prior(msg, function (err, out) {
          return done({ x: out.x + 0.5 })
        })
      })

    seneca
      .act('a:1', { x: 11 }, function (ignore, out, meta) {
        assert.equal(this.context.shared.mark, 110)
        assert.equal(this.context.peract[meta.mi].mark, 23)
      })
      .act('a:1', { x: 22 }, function (ignore, out, meta) {
        assert.equal(this.context.shared.mark, 220)
        assert.equal(this.context.peract[meta.mi].mark, 45)
      })
      .act('a:1', { x: 33 }, function (ignore, out, meta) {
        assert.equal(this.context.shared.mark, 330)
        assert.equal(this.context.peract[meta.mi].mark, 67)

        this.act('a:1', { x: 44 }, function (ignore, out, meta) {
          // NOT: NOT 440! context is preserved into children
          assert.equal(this.context.shared.mark, 3300)
          assert.equal(this.context.peract[meta.mi].mark, 89)
        })
      })
      .act('b:1', { x: 55 }, function (ignore, out, meta) {
        // NOTE: both b1 and b1p apply, so 2*2*5*5
        assert.equal(this.context.shared.mark, 5500)

        // NOTE: NOT 111.5! - this is the meta of the first prior step: b1p
        assert.equal(this.context.peract[meta.mi].mark, 111)
      })
      .act('b:1', { x: 66 }, function (ignore, out, meta) {
        assert.equal(this.context.shared.mark, 6600)
        assert.equal(this.context.peract[meta.mi].mark, 133)
      })

      .ready(fin)
  })
})
