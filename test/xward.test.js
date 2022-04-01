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
})
