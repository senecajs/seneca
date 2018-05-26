/* Copyright (c) 2018 Richard Rodger and other contributors, MIT License */
'use strict'

var Code = require('code')
var Lab = require('lab')

var lab = (exports.lab = Lab.script())
var describe = lab.describe
var it = lab.it
var expect = Code.expect

var Seneca = require('..')

describe('options', function() {
  it('strict.find', function(fin) {
    Seneca({ strict: { find: false } })
      .test(fin)
      .act('foo:1')
      .ready(fin)
  })
})
