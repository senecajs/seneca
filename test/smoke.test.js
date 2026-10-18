/* Copyright (c) 2016 Richard Rodger, MIT License */
'use strict'

const assert = require('node:assert/strict')

const { describe, it } = require('node:test')

var Seneca = require('..')

describe('smoke', function () {
  // Just one test - don't add anymore to this suite!
  it('seneca-smoke', function (t, fin) {
    Seneca({ log: 'silent' })
      .error(fin)
      .add('a:1', function (msg, done) {
        done(null, { x: 1 })
      })
      .act('a:1', function (err, out) {
        assert.equal(err, null)
        assert.equal(out.x, 1)
        fin()
      })
  })
})
