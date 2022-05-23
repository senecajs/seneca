/* Copyright (c) 2018-2019 Richard Rodger and other contributors, MIT License */
'use strict'

var Patrun = require('patrun')

const Code = require('@hapi/code')
const Lab = require('@hapi/lab')

var lab = (exports.lab = Lab.script())
var describe = lab.describe
var expect = Code.expect

var Shared = require('./shared')
var it = lab.it

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
    expect(() => Seneca({ prior: { direct: 'BAD' } })).throws(/type/)
    expect(
      Seneca({ valid: { active: false }, prior: { direct: 'BAD' } })
    ).exist()
    expect(
      Seneca({ valid: { option: false }, prior: { direct: 'BAD' } })
    ).exist()
  })
})
