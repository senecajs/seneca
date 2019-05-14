/* Copyright (c) 2018 Richard Rodger, MIT License */

'use strict'

var Util = require('util')

var Lab = require('@hapi/lab')
var Code = require('code')
var Ordu = require('ordu')

var lab = (exports.lab = Lab.script())
var describe = lab.describe
var expect = Code.expect

var Shared = require('./shared')
var it = Shared.make_it(lab)

var intern = {
  seneca: require('..').test$.intern,
  outward: require('../lib/outward').test$.intern
}

describe('seneca', function() {
  it('make_actmsg', function(fin) {
    var origmsg = {
      a: 1,
      b: { c: 11 },
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

  it('process_outward', function(fin) {
    var outward = Ordu({ name: 'outward' })
      .add(function(ctxt, data) {
        data.x = 1
      })
      .add(function(ctxt, data) {
        if (data.a) {
          return { kind: 'error', error: new Error('a') }
        }
      })
      .add(function(ctxt, data) {
        if (data.b) {
          return { kind: 'error', code: 'b', info: { b: 1 } }
        }
      })
      .add(function(ctxt, data) {
        if (data.c) {
          return { kind: 'result', result: { c: 1 } }
        }
      })
      .add(function(ctxt, data) {
        if (data.d) {
          return { kind: 'bad' }
        }
      })

    var actctxt = {
      seneca: { private$: { outward: outward } }
    }

    var d0 = { a: 1, meta: {} }
    intern.seneca.process_outward(actctxt, d0)
    expect(d0.x).equals(1)
    expect(Util.isError(d0.res)).true()
    expect(d0.meta.error).true()

    var d1 = { b: 2, meta: {} }
    intern.seneca.process_outward(actctxt, d1)
    expect(d1.x).equals(1)
    expect(Util.isError(d1.res)).true()
    expect(d1.res.code).equal('b')
    expect(d1.meta.error).true()

    var d2 = { c: 3, meta: {} }
    intern.seneca.process_outward(actctxt, d2)
    expect(d2.x).equals(1)
    expect(d2.res).equal({ c: 1 })
    expect(d2.meta.error).not.exists()

    var d3 = { d: 4 }
    try {
      intern.seneca.process_outward(actctxt, d3)
    } catch (e) {
      if (8 <= parseInt(process.versions.node.substring(0, 1), 10)) {
        expect(e.code).equal('ERR_ASSERTION')
      }

      expect(e.message).contains('unknown outward kind: bad')
      expect(d3.x).equals(1)
      fin()
    }

    var d4 = {}
    intern.seneca.process_outward(actctxt, d4)
    expect(d4.x).equals(1)
  })
})

describe('outward', function() {
  it('act_error', function(fin) {
    expect(intern.outward.act_error.length).equal(3)
    fin()
  })
})
