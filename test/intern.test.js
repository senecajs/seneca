/* Copyright (c) 2017 Richard Rodger, MIT License */
'use strict'

var Assert = require('assert')

var Lab = require('lab')
var Code = require('code')
var Seneca = require('..')

var lab = (exports.lab = Lab.script())
var describe = lab.describe
var it = lab.it
var expect = Code.expect


var intern = Seneca.intern


describe('intern', function() {
  it('make_actmsg', function(fin) {
/*

    var om0 = {a:1, b$: 2}
    om0.__proto__ = {c:3}
    var am0 = intern.make_actmsg(om0)
    expect(am0.a).equal(1)
    expect(am0.c).equal(3)
    expect(am0.b$).to.not.exist()
    expect(Object.keys(am0)).equal(['a'])
    expect(om0.__proto__ === am0.__proto__)


    var se = Seneca().use('entity')
    var om1 = se.make$('foo',{a:1})
    expect('-/-/foo').equal(om1.canon$())

    var am1 = intern.make_actmsg(om1)
    expect(om1.__proto__ === am1.__proto__)
    expect('-/-/foo').equal(am1.entity$)
    expect('-/-/foo').equal(am1.canon$())
*/

    fin()
  })
})
