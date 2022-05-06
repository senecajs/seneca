/* Copyright (c) 2016 Richard Rodger, MIT License */
'use strict'

const Lab = require('@hapi/lab')
const Code = require('@hapi/code')

const lab = (exports.lab = Lab.script())
const describe = lab.describe
const expect = Code.expect

const Shared = require('./shared')
const it = Shared.make_it(lab)

const Seneca = require('..')

describe('xward', function () {
  it('happy-inward', function (fin) {
    Seneca()
      .test(fin)
      .inward(function (spec) {
        spec.data.msg.y = 3
      })
      .add('a:1', function (msg, done) {
        done(null, { x: 2, y: msg.y })
      })
      .act('a:1', function (ignore, out) {
        expect(out.x).to.equal(2)
        expect(out.y).to.equal(3)
        fin()
      })
  })

  it('happy-outward', function (fin) {
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
        expect(out.x).to.equal(2)
        expect(out.y).to.equal(3)
        expect(out.z).to.equal(4)
        fin()
      })
  })

  it('per-action-context', function (fin) {
    const seneca = Seneca() // {legacy:true})
      .test(fin)
      .inward(function (spec) {
        let context = spec.ctx.seneca.context
        context.shared = context.shared || {}
        context.shared.mark = (context.shared.mark || spec.data.msg.x) * 2
        
        let mi = spec.data.meta.mi
        context.peract = context.peract || {}
        let peract = (context.peract[mi] = (context.peract[mi] || {}))

        expect(peract.mark).not.exist()
        peract.mark = 2 * parseInt(spec.data.msg.x)
      })
      .outward(function (spec) {
        let context = spec.ctx.seneca.context

        if(context.shared) {
          context.shared.mark = context.shared.mark * 5
        }

        if(context.peract) {
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
        this.prior(msg, function(err, out) {
          return done({ x: out.x + 0.5 })
        })
      })

    seneca
      .act('a:1', {x:11}, function (ignore, out, meta) {
        expect(this.context.shared.mark).equal(110)
        expect(this.context.peract[meta.mi].mark).equal(23)
      })
      .act('a:1', {x:22}, function (ignore, out, meta) {
        expect(this.context.shared.mark).equal(220)
        expect(this.context.peract[meta.mi].mark).equal(45)
      })
      .act('a:1', {x:33}, function (ignore, out, meta) {
        expect(this.context.shared.mark).equal(330)
        expect(this.context.peract[meta.mi].mark).equal(67)

        this.act('a:1', {x:44}, function (ignore, out, meta) {
          // NOT: NOT 440! context is preserved into children
          expect(this.context.shared.mark).equal(3300)
          expect(this.context.peract[meta.mi].mark).equal(89)
        })
      })
      .act('b:1', {x:55}, function (ignore, out, meta) {
        // NOTE: both b1 and b1p apply, so 2*2*5*5
        expect(this.context.shared.mark).equal(5500)

        // NOTE: NOT 111.5! - this is the meta of the first prior step: b1p
        expect(this.context.peract[meta.mi].mark).equal(111)
      })
      .act('b:1', {x:66}, function (ignore, out, meta) {
        expect(this.context.shared.mark).equal(6600)
        expect(this.context.peract[meta.mi].mark).equal(133)
      })

      .ready(fin)
  })

})
