/* Copyright (c) 2019-2026 Richard Rodger and other contributors, MIT License */
'use strict'

const { it: node_it } = require('node:test')

const Lolex = require('lolex')

// node:test has no default per-test timeout; lab used 2 seconds.
const tmx = parseInt(process.env.TIMEOUT_MULTIPLIER || 1, 10)
const DEFAULT_TIMEOUT = 11111 * tmx

module.exports = {
  clock: function () {
    return Lolex.createClock()
  },

  // Adapts the test signature used throughout this suite, `function (fin)`
  // (call fin() when done, fin(err) on failure) or an async function, to the
  // node:test runner. Lab-only options such as `parallel` are dropped.
  make_it: function () {
    return function it(name, opts, func) {
      if ('function' === typeof opts) {
        func = opts
        opts = {}
      }

      const options = Object.assign({ timeout: DEFAULT_TIMEOUT }, opts)
      delete options.parallel

      if ('AsyncFunction' === func.constructor.name || 0 === func.length) {
        return node_it(name, options, func)
      }

      return node_it(name, options, (t, fin) => {
        func(fin)
      })
    }
  },
}
