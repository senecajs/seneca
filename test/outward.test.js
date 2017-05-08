/* Copyright (c) 2016 Richard Rodger, MIT License */
'use strict'

var Lab = require('lab')
var Code = require('code')

var lab = (exports.lab = Lab.script())
var describe = lab.describe
var it = lab.it
var expect = Code.expect

var Seneca = require('..')
var Outward = require('../lib/outward')

describe('outward', function() {
  it('make_error', function(fin) {
    var err = new Error('foo')
    err.meta$ = { err: err }
    var data = { res: err }
    Outward.make_error({ options: { legacy: { error: false } } }, data)
    expect(data.res.message).equal('foo')
    fin()
  })
})
