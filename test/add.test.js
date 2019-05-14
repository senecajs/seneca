/* Copyright (c) 2019 Richard Rodger and other contributors, MIT License */
'use strict'

var Code = require('code')
var Lab = require('@hapi/lab')

var lab = (exports.lab = Lab.script())
var describe = lab.describe
var expect = Code.expect

var Shared = require('./shared')
var it = Shared.make_it(lab)

var Seneca = require('..')

describe('add', function() {
  var si = Seneca().test()

  it('action_modifier', function(fin) {
    si.private$.action_modifiers.push(function(actdef) {
      actdef.desc = actdef.func.desc
    })

    si.add({ a: 1 }, a1)

    a1.validate = { b: 2 }
    a1.desc = 'The ubiquitous a1 action.'
    function a1(m, r) {
      r()
    }

    si.ready(function() {
      var actdef = si.find('a:1')
      expect(actdef.rules.b).equal(2)
      expect(actdef.desc).equal('The ubiquitous a1 action.')
      fin()
    })
  })
})
