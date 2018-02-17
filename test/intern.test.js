/* Copyright (c) 2018 Richard Rodger, MIT License */
'use strict'

var Lab = require('lab')
var Code = require('code')

var lab = (exports.lab = Lab.script())
var describe = lab.describe
var it = lab.it
var expect = Code.expect

var intern = {
  seneca: require('..').test$.intern,
  outward: require('../lib/outward').test$.intern,
}

describe('seneca', function() {
  it('make_actmsg', function(fin) {
    var origmsg = {
      a: 1,
      b: {c: 11},
      id$: 2,
      caller$: 3,
      meta$: 4,
      transport$: 5
    }

    var actmsg = intern.seneca.make_actmsg(origmsg)

    expect(actmsg.a).equal(1)
    expect(actmsg.b.c).equal(11)
    expect(actmsg.id$).not.exist()
    expect(actmsg.caller$).not.exist()
    expect(actmsg.meta$).not.exist()

    expect(actmsg.transport$).equal(5)

    actmsg.a = 111
    expect(origmsg.a).equal(1)
    
    fin()
  })
})

describe('outward', function() {
  it('act_error', function(fin) {
    expect(intern.outward.act_error.length).equal(3)
    fin()
  })
})
