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

describe('timeout', function() {
  it('returns error', function(fin) {
    Seneca({ timeout: 100 })
      .add('a:1', function(msg, done) {
        setTimeout(function() {
          done(null, { a: 2 })
        }, 300)
      })
      .act('a:1', function(err, out) {
        expect(err).to.exist()
        expect(out).to.not.exist()
        fin()
      })
  })

  it('still call error if callback not present', function(fin) {
    Seneca({ timeout: 100 })
      .error(function(err) {
        expect(err).to.exist()
        fin()
      })
      .add('a:1', function(msg, done) {
        setTimeout(function() {
          done(null, { a: 2 })
        }, 300)
      })
      .act('a:1')
  })

  it('should accept a timeout value from options', function(fin) {
    var token = null // Token for clearing the setTimeout call.
    var seneca = Seneca() // Seneca instance with no timeout value specified.
    seneca.options({ timeout: 100 }) // Set a global timeout via the options function.
    seneca
      .error(function(err, meta) {
        // Should get a timeout error.
        expect(err).to.exist()
        expect(meta).to.exist()
        expect(token).to.exist()
        // Clear the timeout function to avoid duplicate callbacks.
        clearTimeout(token)
        fin()
      })
      .add('a:1', function(msg, done) {
        token = setTimeout(function() {
          done()
          fin(new Error('Should never get here'))
        }, 500)
      })
      .ready(function() {
        seneca.act('a:1')
      })
  })
})
