/* Copyright (c) 2019 Richard Rodger and other contributors, MIT License */
'use strict'

const Util = require('util')

const LegacyOrdu = require('ordu').LegacyOrdu

const Code = require('@hapi/code')
const Lab = require('@hapi/lab')

const lab = (exports.lab = Lab.script())
const describe = lab.describe
const expect = Code.expect

const Shared = require('./shared')
const it = Shared.make_it(lab)

const Seneca = require('..')
const Act = require('../lib/act.js')

const intern = Act.intern

describe('act', function () {
  it('make_actmsg', function (fin) {
    var origmsg = {
      a: 1,
      b: { c: 11 },
      id$: 2,
      caller$: 3,
      meta$: 4,
      transport$: 5,
    }

    var actmsg = intern.make_actmsg(origmsg)

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

  it('process_outward', function (fin) {
    var outward = LegacyOrdu({ name: 'outward' })
      .add(function (ctxt, data) {
        data.x = 1
      })
      .add(function (ctxt, data) {
        if (data.a) {
          return { kind: 'error', error: new Error('a') }
        }
      })
      .add(function (ctxt, data) {
        if (data.b) {
          return { kind: 'error', code: 'b', info: { b: 1 } }
        }
      })
      .add(function (ctxt, data) {
        if (data.c) {
          return { kind: 'result', result: { c: 1 } }
        }
      })
      .add(function (ctxt, data) {
        if (data.d) {
          return { kind: 'bad' }
        }
      })

    var actctxt = {
      seneca: { private$: { outward: outward } },
    }

    var d0 = { a: 1, meta: {} }
    intern.process_outward(actctxt, d0)
    expect(d0.x).equals(1)
    //expect(Util.isError(d0.res)).true()
    expect(Util.isError(d0.err)).true()
    expect(d0.meta.error).true()

    var d1 = { b: 2, meta: {} }
    intern.process_outward(actctxt, d1)
    expect(d1.x).equals(1)
    //expect(Util.isError(d1.res)).true()
    expect(Util.isError(d1.err)).true()
    //expect(d1.res.code).equal('b')
    expect(d1.err.code).equal('b')
    expect(d1.meta.error).true()

    var d2 = { c: 3, meta: {} }
    intern.process_outward(actctxt, d2)
    expect(d2.x).equals(1)
    expect(d2.res).equal({ c: 1 })
    expect(d2.meta.error).not.exists()

    var d3 = { d: 4 }
    intern.process_outward(actctxt, d3)
    //expect(d3.res.code).equals('invalid-process-outward-code')
    expect(d3.err.code).equals('invalid-process-outward-code')
    expect(d3.meta.error).exists()

    var d4 = {}
    intern.process_outward(actctxt, d4)
    expect(d4.x).equals(1)

    fin()
  })
})
