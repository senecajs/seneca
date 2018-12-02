/* Copyright (c) 2016-2017 Richard Rodger, MIT License */
'use strict'

var Lab = require('lab')
var Code = require('code')

var Legacy = require('../lib/legacy.js')

var lab = (exports.lab = Lab.script())
var describe = lab.describe
var it = lab.it
var expect = Code.expect

describe('legacy', function() {
  it('fail', function(fin) {
    var f0 = Legacy.make_legacy_fail({})
    var e0 = f0.call({ log: { error: function() {} } }, { code: 'foo' })
    expect(e0.code).equal('foo')
    fin()
  })
})
