/* Copyright (c) 2026 Richard Rodger and other contributors, MIT License */
'use strict'

const assert = require('node:assert/strict')
const { describe, it, beforeEach } = require('node:test')

const Seneca = require('..')
const { Deprecate } = require('../lib/deprecate')

// Collects deprecations from both channels: Node.js DeprecationWarnings
// (emitted on the next tick) and Seneca log entries.
function collect(si) {
  const node = []
  const log = []
  const onwarn = (w) => {
    if ('DeprecationWarning' === w.name && String(w.code).startsWith('SENECA_DEP_')) {
      node.push(w.code)
    }
  }
  process.on('warning', onwarn)
  if (si) {
    si.on('log', (entry) => {
      if ('DEPRECATED' === entry.case && 'notice' === entry.kind) {
        log.push(entry.code)
      }
    })
  }
  return {
    node,
    log,
    async done() {
      await new Promise((r) => setImmediate(r))
      process.removeListener('warning', onwarn)
      return this
    },
  }
}

describe('deprecate', () => {
  beforeEach(() => Deprecate.reset())

  it('reports-once-on-both-channels', async () => {
    const si = Seneca({ log: 'silent' })
    const c = collect(si)
    si.add('a:1', (m, r) => r({ x: 1 }))

    si.findact('a:1')
    si.findact('a:1')
    si.hasact('a:1')

    await c.done()
    assert.deepEqual(c.node, ['SENECA_DEP_FINDACT', 'SENECA_DEP_HASACT'])
    assert.deepEqual(c.log, ['SENECA_DEP_FINDACT', 'SENECA_DEP_HASACT'])
    await si.close()
  })

  it('aliases-still-work', async () => {
    const si = Seneca({ log: 'silent', debug: { deprecation: false } })
    si.add('a:1', (m, r) => r({ x: 1 }))
    await si.ready()

    assert.deepEqual(si.findact('a:1'), si.find('a:1'))
    assert.equal(si.hasact('a:1'), true)
    assert.equal(si.act_if(false, 'a:1'), si)
    assert.deepEqual(si.findpins('a:1'), si.list('a:1'))
    assert.deepEqual(si.pinact('a:1'), si.list('a:1'))
    assert.deepEqual(si.plugins(), si.list_plugins())
    assert.equal(si.hasplugin('nope'), false)
    assert.deepEqual(si.util.deepextend({ a: 1 }, { b: 2 }), { a: 1, b: 2 })
    assert.equal(si.util.Gubu, si.valid)
    assert.equal(si.find('a:1').gubu, si.find('a:1').shape)
    assert.equal(si.closed, false)
    await si.close()
    assert.equal(si.closed, true)
  })

  it('debug-deprecation-false', async () => {
    const si = Seneca({ log: 'silent', debug: { deprecation: false } })
    const c = collect(si)
    si.add('a:1', (m, r) => r())
    si.findact('a:1')
    si.export('util')
    si.on('act-err-4', () => {})
    await c.done()
    assert.deepEqual(c.node, [])
    assert.deepEqual(c.log, [])
    await si.close()
  })

  it('options', async () => {
    const c = collect()
    const si = Seneca({
      log: 'silent',
      deathdelay: 4444,
      legacy: { transport: true, timeout_string: false, error: true },
    })
    // The deprecated deathdelay is used as death_delay.
    assert.equal(si.options().death_delay, 4444)
    await c.done()
    assert.deepEqual(c.node, [
      'SENECA_DEP_DEATHDELAY',
      'SENECA_DEP_LEGACY_ERROR',
      'SENECA_DEP_LEGACY_FLAG',
      'SENECA_DEP_LEGACY_FLAG',
    ])
    await si.close()
  })

  it('short-logs', async () => {
    // Identifiers are no longer shortened: a repeated message id is answered
    // from the action history, so short ids made different messages collide.
    const c = collect()
    const si = Seneca({ log: 'silent', debug: { short_logs: true } }).add(
      'a:1',
      function (msg, reply, meta) {
        reply({ mi: meta.mi, tx: meta.tx })
      },
    )
    const si2 = Seneca({ log: { level: 'none', short: true } })
    const out = await si.post('a:1')
    assert.equal(out.mi.length, 12)
    assert.equal(out.tx.length, 12)
    assert.equal(si.id.split('/')[0].length, 12)
    assert.equal(si2.id.split('/')[0].length, 12)
    await c.done()
    assert.deepEqual(c.node, ['SENECA_DEP_SHORT_LOGS', 'SENECA_DEP_SHORT_LOGS'])
    await si.close()
    await si2.close()
  })

  it('death_delay-wins-over-deathdelay', async () => {
    const si = Seneca({
      log: 'silent',
      debug: { deprecation: false },
      deathdelay: 4444,
      death_delay: 3333,
    })
    assert.equal(si.options().death_delay, 3333)
    await si.close()
  })

  it('statics-and-events', async () => {
    const si = Seneca({ log: 'silent' })
    const c = collect(si)
    si.add('a:1', (m, r) => r())

    si.export('util')
    Seneca.util.flatten([], 'x')
    void Seneca.util.Gubu
    void si.find('a:1').gubu
    si.on('act-err-4', () => {})

    await c.done()
    assert.deepEqual(c.node, [
      'SENECA_DEP_EXPORT_UTIL',
      'SENECA_DEP_UTIL_FLATTEN',
      'SENECA_DEP_UTIL_GUBU',
      'SENECA_DEP_ACTDEF_GUBU',
      'SENECA_DEP_ACT_ERR_4',
    ])
    // Static utilities report on the most recently created instance.
    assert.deepEqual(c.log, c.node)
    await si.close()
  })

  it('plugins', async () => {
    const si = Seneca({ log: 'silent' })
    const c = collect(si)
    si.use({ name: 'old0', init: function () {} })
    si.use({ name: 'old0', tag: 'b', init: function () {} })
    si.use({ name: 'old1', init: function () {} })
    si.use({ name: 'new0', define: function () {} })
    si.use({ name: 'promisify', define: function () {} })
    await si.ready()
    await c.done()
    assert.deepEqual(c.node, [
      'SENECA_DEP_PLUGIN_INIT',
      'SENECA_DEP_PLUGIN_INIT',
      'SENECA_DEP_PROMISIFY',
    ])
    await si.close()
  })

  it('legacy-builtin-actions', async () => {
    const si = Seneca({ log: 'silent', legacy: { builtin_actions: true } })
    const c = collect(si)
    await si.ready()
    await si.post('role:seneca,cmd:ping')
    await si.post('role:seneca,cmd:ping')
    // close calls role:seneca,cmd:close itself; that is not reported.
    await si.close()
    await c.done()
    assert.deepEqual(c.node, ['SENECA_DEP_ROLE_SENECA'])
  })

  it('legacy-close-hook', async () => {
    const si = Seneca({ log: 'silent' })
    const c = collect()
    si.use({
      name: 'hooky',
      define: function () {
        this.add('role:seneca,cmd:close', function (msg, reply) {
          reply()
        })
      },
    })
    await si.ready()
    await si.close()
    await c.done()
    assert.deepEqual(c.node, ['SENECA_DEP_LEGACY_CLOSE_HOOK'])
  })
})
