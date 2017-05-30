/* Copyright (c) 2016-2017 Richard Rodger, MIT License */
'use strict'

var Util = require('util')

var Lab = require('lab')
var Code = require('code')

var lab = (exports.lab = Lab.script())
var describe = lab.describe
var it = lab.it
var expect = Code.expect

var Outward = require('../lib/outward')

describe('outward', function() {
  it('make_error', function(fin) {
    var err = { message: 'foo', meta$: { err: true } }
    var data = { meta: {error:true}, res: err }

    Outward.make_error({ options: { legacy: { error: false } } }, data)
    expect(data.res.message).equal('foo')
    expect(Util.isError(data.res))

    data = { res: err }
    Outward.make_error({ options: { legacy: { error: true } } }, data)
    expect(data.res.message).equal('foo')
    expect(!Util.isError(data.res))

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
})
