/* Copyright (c) 2016 Richard Rodger, MIT License */
'use strict'

const Code = require('@hapi/code')

const { describe } = require('node:test')
var expect = Code.expect

var Shared = require('./shared')
var it = Shared.make_it()

var Seneca = require('..')

describe('smoke', function () {
  // Just one test - don't add anymore to this suite!
  it('seneca-smoke', function (fin) {
    Seneca({ log: 'silent' })
      .error(fin)
      .add('a:1', function (msg, done) {
        done(null, { x: 1 })
      })
      .act('a:1', function (err, out) {
        expect(err).to.equal(null)
        expect(out.x).to.equal(1)
        fin()
      })
  })
})
