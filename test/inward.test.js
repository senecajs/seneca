/* Copyright (c) 2016 Richard Rodger, MIT License */
'use strict'

var Lab = require('lab')
var Code = require('code')


var Seneca = require('..')


var lab = exports.lab = Lab.script()
var describe = lab.describe
var it = lab.it
var expect = Code.expect


describe('inward', function () {
  it('happy', function (fin) {
    Seneca()
      .error(fin)
      .inward(function (ctxt, msg) {
        msg.y = 3
      })
      .add('a:1', function (msg, done) {
        done(null, {x: 2, y: msg.y})
      })
      .act('a:1', function (ignore, out) {
        expect(out.x).to.equal(2)
        expect(out.y).to.equal(3)
        fin()
      })
  })
})
