/* Copyright (c) 2016 Richard Rodger, MIT License */
'use strict'

var Lab = require('lab')
var Code = require('code')
var Ward = require('../lib/ward')


var lab = exports.lab = Lab.script()
var describe = lab.describe
var it = lab.it
var expect = Code.expect


describe('ward', function () {
  it('construct', function (fin) {
    var w = Ward()
    expect(w).to.exist()

    var wn = ('' + w).replace(/ward\d+/g, 'ward0')
    expect(wn).to.equal('ward0:[]')
    fin()
  })

  it('happy', function (fin) {
    var w = Ward()

    w.add(function (ctxt, data) {
      data.x = 1
    })

    var ctxt = {}
    var data = {}

    expect(data.x).to.not.exist()

    var res = w.process(ctxt, data)

    expect(res).to.not.exist()
    expect(data.x).to.equal(1)

    w.add(function failer (ctxt, data) {
      return {kind: 'error'}
    })

    data = {}
    res = w.process(ctxt, data)

    expect(data.x).to.equal(1)
    expect(res.kind).to.equal('error')
    expect(res.index$).to.equal(1)
    expect(res.taskname$).to.equal('failer')
    expect(res.ctxt$).to.equal(ctxt)
    expect(res.data$).to.equal(data)

    var wn = ('' + w).replace(/ward\d+/g, 'ward1')
    expect(wn).to.equal('ward1:[ward1_task0,failer]')

    fin()
  })


  it('list', function (fin) {
    var w = Ward({name: 'foo'})

    w.add(function zero () {})
    w.add(function () {})
    w.add(function two () {})

    expect(w.tasknames()).to.equal(['zero', 'foo_task1', 'two'])
    expect('' + w).to.equal('foo:[zero,foo_task1,two]')
    fin()
  })
})
