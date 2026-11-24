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

// A plugin named `name` that fails at the given step.
function failing_plugin(step, name) {
  const plugin = function () {
    if ('define' === step) {
      throw new Error('BOOM define ' + name)
    }
  }
  Object.defineProperty(plugin, 'name', { value: name })
  if ('preload' === step) {
    plugin.preload = function () {
      throw new Error('BOOM preload ' + name)
    }
  }
  return plugin
}

// Load two plugins that both fail, one after the other, or both from the
// definition of a third plugin. Resolves like fail_load, plus any
// unhandled rejections, such as a [DEATH LOOP] thrown by die.
function fail_two(first, second, nested) {
  return new Promise((resolve) => {
    const start = Date.now()
    const fatals = []
    const rejections = []
    let exited = false

    const on_rejection = (err) => rejections.push(err)
    process.on('unhandledRejection', on_rejection)

    const seneca = Seneca({
      log: 'silent',
      death_delay: 3333,
      debug: { deprecation: false },
      system: {
        exit: function (code) {
          if (!exited) {
            exited = true
            const ms = Date.now() - start
            setImmediate(() => {
              process.removeListener('unhandledRejection', on_rejection)
              resolve({ code, ms, fatals, rejections })
            })
          }
        },
      },
    })

    seneca.on('log', function (entry) {
      if (600 <= entry.level && 'fatal' === entry.kind) {
        fatals.push(entry)
      }
    })

    const bad = failing_plugin(first, 'bad')
    const worse = failing_plugin(second, 'worse')

    if (nested) {
      seneca.use(function outer() {
        this.use(bad)
        this.use(worse)
      })
    } else {
      seneca.use(bad)
      seneca.use(worse)
    }
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

  // The error handler is called once, with the plugin_init error, whatever
  // it returns: an error handler that consumes errors (returns true) does
  // not consume the failure of a plugin load.
  for (const step of ['init', 'prepare']) {
    for (const ret of [true, false, undefined]) {
      it(step + '-errhandler-returns-' + ret, async () => {
        const handled = []
        const res = await fail_load(step, {
          // An unresolved init would end with the define action timeout.
          timeout: 4444,
          errhandler: function (err) {
            handled.push(err.code)
            return ret
          },
        })
        check_failure(
          res,
          'plugin_init',
          'The bad plugin failed to initialize: BOOM ' + step + '.',
        )
        assert.deepEqual(handled, ['plugin_init'])
      })
    }
  }

  // A second plugin that fails while the instance closes after the first
  // failure is not reported again, and does not stop the prompt exit.
  for (const [first, second, nested] of [
    ['preload', 'preload'],
    ['preload', 'define'],
    ['define', 'preload'],
    ['define', 'define'],
    ['preload', 'preload', true],
    ['define', 'define', true],
  ]) {
    it(
      'two-failures-' + (nested ? 'nested-' : '') + first + '-' + second,
      async () => {
        const res = await fail_two(first, second, nested)
        assert.deepEqual(
          res.rejections.map((err) => err.code + ': ' + err.message),
          [],
        )
        assert.equal(res.fatals.length, 1)
        assert.ok(
          ['plugin_preload_failed', 'plugin_define_failed'].includes(
            res.fatals[0].err.code,
          ),
          res.fatals[0].err.code,
        )
        assert.ok(['bad', 'worse'].includes(res.fatals[0].err.plugin))
        assert.equal(res.code, 1)
        assert.ok(res.ms < 2000, 'exit after ' + res.ms + 'ms')
      },
    )
  }

  it('undead-init', (t, fin) => {
    // The error handler used here returns a number, which consumes action
    // errors; the init failure still reaches it, once, as plugin_init.
    const errs = []
    function bad() {
      this.init(function (done) {
        done(new Error('BOOM init'))
      })
    }
    const seneca = Seneca({ log: 'silent', debug: { undead: true } })
    seneca.error((err) => errs.push(err))
    seneca.use(bad)
    seneca.use(function after() {})
    seneca.ready(function () {
      assert.equal(errs.length, 1)
      assert.equal(errs[0].code, 'plugin_init')
      assert.ok(this.has_plugin('after'))
      fin()
    })
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
