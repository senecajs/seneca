/* Copyright (c) 2019 Richard Rodger and other contributors, MIT License */
'use strict'

const Code = require('@hapi/code')
const Lab = require('@hapi/lab')

var lab = (exports.lab = Lab.script())
var describe = lab.describe
var expect = Code.expect

var Shared = require('./shared')
var it = Shared.make_it(lab)

var Seneca = require('..')

describe('add', function() {
  it('name', function(fin) {
    var si = Seneca().test()

    si.add('n:0')
      .add('n:1', function() {})
      .add('n:2', function n2() {})

    // NOTE: these may need to be updates if startup action call sequence changes.

    expect(si.find('n:0')).contains({
      id: 'default_action_8',
      name: 'default_action'
    })

    expect(si.find('n:1')).contains({
      id: 'action_9',
      name: 'action'
    })

    expect(si.find('n:2')).contains({
      id: 'n2_10',
      name: 'n2'
    })

    fin()
  })

  it('action_modifier', function(fin) {
    var si = Seneca().test()

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
