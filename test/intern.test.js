/* Copyright (c) 2018 Richard Rodger, MIT License */

'use strict'

var Util = require('util')

const Lab = require('@hapi/lab')
const Code = require('@hapi/code')
const Ordu = require('ordu')

const lab = (exports.lab = Lab.script())
const describe = lab.describe
const expect = Code.expect

const Shared = require('./shared')
const it = Shared.make_it(lab)

const intern = {
  outward: require('../lib/outward').test$.intern
}

describe('outward', function() {
  it('act_error', function(fin) {
    expect(intern.outward.act_error.length).equal(3)
    fin()
  })
})
