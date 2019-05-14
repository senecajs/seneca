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

var test_opts = { xlog: 'test' }

describe('smoke', function() {
  // Just one test - don't add anymore to this suite!
  it('seneca-smoke', function(fin) {
    Seneca(test_opts)
      .error(fin)
      .add('a:1', function(msg, done) {
        done(null, { x: 1 })
      })
      .act('a:1', function(err, out) {
        expect(err).to.equal(null)
        expect(out.x).to.equal(1)
        fin()
      })
  })
})
