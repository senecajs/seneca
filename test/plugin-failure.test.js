/* Copyright © 2026 Richard Rodger and other contributors, MIT License. */
'use strict'

const assert = require('node:assert/strict')
const { describe, it } = require('node:test')

const Seneca = require('..')

// Load a plugin that fails at the given step, followed by another plugin,
// on an instance whose process exit is captured. Resolves with the exit
// code, the time from loading to exit, the fatal log entries, and whether
// a ready callback ran.
function fail_load(step, options) {
  return new Promise((resolve) => {
    const start = Date.now()
    const fatals = []
    let ready_called = false
    let exited = false

    function bad() {
      if ('define' === step) {
        throw new Error('BOOM define')
      }
      if ('init' === step) {
        this.init(function (done) {
          done(new Error('BOOM init'))
        })
      }
      if ('prepare' === step) {
        this.prepare(async function () {
          throw new Error('BOOM prepare')
        })
      }
    }

    if ('preload' === step) {
      bad.preload = function () {
        throw new Error('BOOM preload')
      }
    }

    const seneca = Seneca({
      log: 'silent',
      // A close that waits for ready would exit with code 2 after this.
      death_delay: 3333,
      debug: { deprecation: false },
      system: {
        exit: function (code) {
          if (!exited) {
            exited = true
            resolve({ code, ms: Date.now() - start, fatals, ready_called })
          }
        },
      },
      ...options,
    })

    seneca.on('log', function (entry) {
      if (600 <= entry.level && 'fatal' === entry.kind) {
        fatals.push(entry)
      }
    })

    seneca.use(bad)
    seneca.use(function after() {})
    seneca.ready(function () {
      ready_called = true
    })
  })
}

function check_failure(res, code, message) {
  // Reported once, with the plugin name.
  assert.equal(res.fatals.length, 1)
  const err = res.fatals[0].err
  assert.equal(err.code, code)
  assert.equal(err.plugin, 'bad')
  assert.ok(err.message.includes(message), err.message)

  // The process exits promptly with code 1, without waiting for death_delay.
  assert.equal(res.code, 1)
  assert.ok(res.ms < 2000, 'exit after ' + res.ms + 'ms')

  // The instance did not become ready.
  assert.equal(res.ready_called, false)
}

describe('plugin-failure', function () {
  it('preload', async () => {
    const res = await fail_load('preload')
    check_failure(
      res,
      'plugin_preload_failed',
      'The preload function of the plugin bad has failed: BOOM preload (',
    )
  })

  it('define', async () => {
    const res = await fail_load('define')
    check_failure(
      res,
      'plugin_define_failed',
      'The definition action for the plugin bad has failed: BOOM define (',
    )
  })

  it('init', async () => {
    const res = await fail_load('init')
    check_failure(
      res,
      'plugin_init',
      'The bad plugin failed to initialize: BOOM init.',
    )
  })

  it('prepare', async () => {
    const res = await fail_load('prepare')
    check_failure(
      res,
      'plugin_init',
      'The bad plugin failed to initialize: BOOM prepare.',
    )
  })

  it('preload-non-error', async () => {
    const res = await new Promise((resolve) => {
      const fatals = []
      function bad() {}
      bad.preload = function () {
        throw 'not an Error'
      }
      const seneca = Seneca({
        log: 'silent',
        death_delay: 3333,
        system: { exit: (code) => resolve({ code, fatals }) },
      })
      seneca.on('log', (entry) => {
        if (600 <= entry.level && 'fatal' === entry.kind) fatals.push(entry)
      })
      seneca.use(bad)
    })
    assert.equal(res.code, 1)
    assert.equal(res.fatals.length, 1)
    assert.equal(res.fatals[0].err.code, 'plugin_preload_failed')
    assert.ok(res.fatals[0].err.message.includes('has failed: not an Error'))
  })

  it('undead', (t, fin) => {
    // In undead mode (testing only) the instance lives on: the error goes
    // to the error handler, later plugins load, and ready is called.
    const errs = []
    function bad() {
      throw new Error('BOOM define')
    }
    const seneca = Seneca({ log: 'silent', debug: { undead: true } })
    seneca.error((err) => errs.push(err))
    seneca.use(bad)
    seneca.use(function after() {})
    seneca.ready(function () {
      assert.equal(errs.length, 1)
      assert.equal(errs[0].code, 'plugin_define_failed')
      assert.ok(this.has_plugin('after'))
      fin()
    })
  })
})
