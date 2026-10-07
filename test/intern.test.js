/* Copyright (c) 2018-2022 Richard Rodger, MIT License */

'use strict'

var Util = require('util')

const Code = require('@hapi/code')
const Ordu = require('ordu')

const { describe } = require('node:test')
const expect = Code.expect

const Shared = require('./shared')
const it = Shared.make_it()

const { Outward } = require('../lib/outward')

const intern = {
  outward: Outward.test$.intern,
}

describe('outward', function () {
  it('act_error', function (fin) {
    expect(intern.outward.act_error.length).equal(3)
    fin()
  })
})
