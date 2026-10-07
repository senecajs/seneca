// Tutorial: Writing a plugin. Testing the plugin with node:test.
const { test } = require('node:test')
const assert = require('node:assert/strict')

const Seneca = require('../../..') // in your project: require('seneca')
const tax = require('./tax')

test('rate and total', async () => {
  const seneca = Seneca().test().use(tax, { rates: { US: 0.07 } })
  await seneca.ready()

  assert.deepEqual(await seneca.post('role:tax,cmd:rate,country:US'), {
    country: 'US',
    rate: 0.07,
  })
  assert.deepEqual(await seneca.post('role:tax,cmd:total,country:EU,net:100'), {
    net: 100,
    country: 'EU',
    total: 120,
  })

  await seneca.close()
})

test('unknown country', async () => {
  const seneca = Seneca().test().quiet().use(tax)
  await seneca.ready()

  await assert.rejects(seneca.post('role:tax,cmd:rate,country:XX'), (err) => {
    assert.equal(err.code, 'unknown_country')
    assert.match(err.message, /country XX/)
    return true
  })

  await seneca.close()
})

test('invalid options are rejected', async () => {
  const seneca = Seneca({ log: 'silent', debug: { undead: true } })
  const failed = new Promise((resolve) => seneca.error((err) => { resolve(err) }))

  seneca.use(tax, { precision: 'two' })

  const err = await failed
  assert.equal(err.code, 'invalid_plugin_option')
})
