/* Copyright (c) 2016 Richard Rodger, MIT License */
'use strict'

var Lab = require('lab')
var Code = require('code')

var lab = (exports.lab = Lab.script())
var describe = lab.describe
var it = lab.it
var expect = Code.expect

var Seneca = require('..')
var Inward = require('../lib/inward')

describe('inward', function() {
  it('announce', function(fin) {
    var seneca = Seneca().test(fin)
    var seen = 0

    seneca.ready(function() {
      seneca.on('act-in', function(ev) {
        expect(ev.a).equal(2)
        fin()
      })

      Inward.announce({ seneca: seneca }, { msg: { a: 1 } })
      Inward.announce({ seneca: seneca, actmeta: {} }, { msg: { a: 2 } })
    })
  })
})
