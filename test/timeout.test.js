/* Copyright (c) 2016 Richard Rodger, MIT License */
'use strict'

const assert = require('node:assert/strict')

const { describe, it } = require('node:test')

var Seneca = require('..')

describe('timeout', function () {
  it('happy', function (t, fin) {
    Seneca({ timeout: 100 })
      .test()
      .quiet()
      .add('a:1', function (msg, done) {
        setTimeout(function () {
          done(null, { a: 2 })
        }, 300)
      })
      .act('a:1', function (err, out) {
        assert.ok(null != err)
        assert.equal(err.code, 'action_timeout')
        assert.partialDeepStrictEqual(err.details, {
          timeout: 100,
          message: { a: 1 },
          pattern: 'a:1',
        })
        assert.ok(
          err.message.startsWith(
            'seneca: Action a:1 timed out. Timeout was: 100 (start: ',
          ),
        )
        assert.ok(null == out)
        fin()
      })
  })

  it('error-handler', function (t, fin) {
    Seneca({ timeout: 100 })
      .test()
      .quiet()
      .error(function (err) {
        assert.ok(null != err)
        fin()
      })
      .add('a:1', function (msg, done) {
        setTimeout(function () {
          done(null, { a: 2 })
        }, 300)
      })
      .act('a:1')
  })

  it('should accept a timeout value from options', function (t, fin) {
    var token = null // Token for clearing the setTimeout call.
    var seneca = Seneca() // Seneca instance with no timeout value specified.
    seneca.options({ timeout: 100 }) // Set a global timeout via the options function.
    seneca
      .test()
      .quiet()
      .error(function (err, meta) {
        // Should get a timeout error.
        assert.ok(null != err)
        assert.ok(null != meta)
        assert.ok(null != token)
        // Clear the timeout function to avoid duplicate callbacks.
        clearTimeout(token)
        fin()
      })
      .add('a:1', function (msg, done) {
        token = setTimeout(function () {
          done()
          fin(new Error('Should never get here'))
        }, 500)
      })
      .ready(function () {
        seneca.act('a:1')
      })
  })
})
