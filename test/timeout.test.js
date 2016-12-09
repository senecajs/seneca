/* Copyright (c) 2016 Richard Rodger, MIT License */
'use strict'

var Lab = require('lab')
var Code = require('code')


var Seneca = require('..')


var lab = exports.lab = Lab.script()
var describe = lab.describe
var it = lab.it
var expect = Code.expect

describe('timeout', function () {
  it('returns error', function (fin) {
    Seneca({timeout: 100})
      .add('a:1', function (msg, done) {
        setTimeout(function () {
          done(null, {a: 2})
        }, 300)
      })
      .act('a:1', function (err, out) {
        expect(err).to.exist()
        expect(out).to.not.exist()
        fin()
      })
  })

  it('still call error if callback not present', function (fin) {
    Seneca({timeout: 100})
      .error(function (err) {
        expect(err).to.exist()
        fin()
      })
      .add('a:1', function (msg, done) {
        setTimeout(function () {
          done(null, {a: 2})
        }, 300)
      })
      .act('a:1')
  })
})
