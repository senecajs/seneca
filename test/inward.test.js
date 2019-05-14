/* Copyright © 2016-2018 Richard Rodger and other contributors, MIT License. */
'use strict'

var Lab = require('@hapi/lab')
var Code = require('code')

var lab = (exports.lab = Lab.script())
var describe = lab.describe
var expect = Code.expect

var Shared = require('./shared')
var it = Shared.make_it(lab)

var Seneca = require('..')

var Inward = require('../lib/inward')
var API = require('../lib/api')

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
      Inward.announce({ seneca: seneca, actdef: {} }, { msg: { a: 2 } })
    })
  })

  it('arg-check', function(fin) {
    try {
      API.inward()
      expect(false).true()
    } catch (e) {
      expect(e.code).equal('invalid_arguments')
    }

    fin()
  })
})
