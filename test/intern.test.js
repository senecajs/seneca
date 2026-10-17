/* Copyright (c) 2018-2022 Richard Rodger, MIT License */

'use strict'

var Util = require('util')

const assert = require('node:assert/strict')
const Ordu = require('ordu')

const { describe, it } = require('node:test')

const { Outward } = require('../lib/outward')

const intern = {
  outward: Outward.test$.intern,
}

describe('outward', function () {
  it('act_error', function (t, fin) {
    assert.equal(intern.outward.act_error.length, 3)
    fin()
  })
})
