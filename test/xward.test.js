/* Copyright (c) 2016 Richard Rodger, MIT License */
'use strict'

var Lab = require('@hapi/lab')
var Code = require('code')

var lab = (exports.lab = Lab.script())
var describe = lab.describe
var expect = Code.expect

var Shared = require('./shared')
var it = Shared.make_it(lab)

var Seneca = require('..')

describe('xward', function() {
  it('happy-inward', function(fin) {
    Seneca()
      .error(fin)
      .inward(function(ctxt, data) {
        data.msg.y = 3
      })
      .add('a:1', function(msg, done) {
        done(null, { x: 2, y: msg.y })
      })
      .act('a:1', function(ignore, out) {
        expect(out.x).to.equal(2)
        expect(out.y).to.equal(3)
        fin()
      })
  })

  it('happy-outward', function(fin) {
    Seneca()
      .error(fin)
      .outward(function(ctxt, data) {
        if (data.res) {
          data.res.z = 4
        }
      })
      .add('a:1', function(msg, done) {
        done(null, { x: 2, y: msg.y })
      })
      .act('a:1,y:3', function(ignore, out) {
        expect(out.x).to.equal(2)
        expect(out.y).to.equal(3)
        expect(out.z).to.equal(4)
        fin()
      })
  })
})
