/* Copyright (c) 2018-2019 Richard Rodger and other contributors, MIT License */
'use strict'

var Patrun = require('patrun')

const assert = require('node:assert/strict')
const { describe, it } = require('node:test')

var Seneca = require('..')

describe('options', function () {
  it('strict.find', async () => {
    await Seneca({ strict: { find: false } })
      .test()
      .act('foo:1')
      .ready()
  })

  it('internal.routers', async () => {
    await Seneca({
      internal: {
        actrouter: new Patrun({ gex: true }),
        subrouter: new Patrun({ gex: true }),
      },
    })
      .test()
      .add('foo:1')
      .act('foo:1')
      .ready()
  })

  it('default_plugins', async () => {
    await Seneca({ legacy: false, default_plugins: { foo: true } })
      .test()
      .ready()
  })

  it('validate', async () => {
    assert.throws(() => Seneca({ prior: { direct: 'BAD' } }), {
      message: /type/,
    })
    assert.ok(
      null != Seneca({ valid: { active: false }, prior: { direct: 'BAD' } }),
    )
    assert.ok(
      null != Seneca({ valid: { option: false }, prior: { direct: 'BAD' } }),
    )
  })
})
