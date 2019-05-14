/* Copyright (c) 2018-2019 Richard Rodger and other contributors, MIT License */
'use strict'

var Patrun = require('patrun')

var Code = require('code')
var Lab = require('@hapi/lab')

var lab = (exports.lab = Lab.script())
var describe = lab.describe
var expect = Code.expect

var Shared = require('./shared')
var it = lab.it

var Seneca = require('..')

describe('options', function() {
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
        subrouter: new Patrun({ gex: true })
      }
    })
      .test()
      .add('foo:1')
      .act('foo:1')
      .ready()
  })
})
