/* Copyright (c) 2016-2017 Richard Rodger, MIT License */
'use strict'

var Util = require('util')

var Lab = require('@hapi/lab')
var Code = require('code')

var lab = (exports.lab = Lab.script())
var describe = lab.describe
var expect = Code.expect

var Shared = require('./shared')
var it = Shared.make_it(lab)

var Outward = require('../lib/outward')
var API = require('../lib/api')

describe('outward', function() {
  it('make_error', function(fin) {
    var err = { message: 'foo', meta$: { err: true } }
    var data = { meta: { error: true }, res: err }

    Outward.make_error({ options: { legacy: { error: false } } }, data)
    expect(data.res.message).equal('foo')
    expect(Util.isError(data.res)).false()

    data = { res: err }
    Outward.make_error({ options: { legacy: { error: true } } }, data)
    expect(data.res.message).equal('foo')
    expect(!Util.isError(data.res)).true()

    fin()
  })

  it('act_stats', function(fin) {
    var private$ = {
      stats: { act: { done: 0 }, actmap: {} },
      timestats: { point: function() {} }
    }
    Outward.act_stats(
      { actdef: { pattern: 'foo:1' }, seneca: { private$: private$ } },
      { meta: {} }
    )
    expect(private$.stats.act.done).equal(1)
    fin()
  })

  it('arg-check', function(fin) {
    try {
      API.outward()
      expect(false).true()
    } catch (e) {
      expect(e.code).equal('invalid_arguments')
    }

    fin()
  })
})
