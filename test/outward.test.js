/* Copyright (c) 2016-2017 Richard Rodger, MIT License */
'use strict'

const assert = require('node:assert/strict')

const { describe, it } = require('node:test')

var { Outward } = require('../lib/outward')
var { API } = require('../lib/api')

describe('outward', function () {
  it('make_error', function (t, fin) {
    var err = { message: 'foo', meta$: { err: true } }
    var data = { meta: { error: true }, res: err }

    Outward.outward_make_error({
      ctx: { options: { legacy: { error: false } } },
      data,
    })
    assert.equal(data.res.message, 'foo')
    assert.equal(data.res instanceof Error, false)

    data = { res: err }
    Outward.outward_make_error({
      ctx: { options: { legacy: { error: true } } },
      data,
    })
    assert.equal(data.res.message, 'foo')
    assert.equal(!(data.res instanceof Error), true)

    fin()
  })

  it('act_stats', function (t, fin) {
    var private$ = {
      stats: { act: { done: 0 }, actmap: {} },
      timestats: { point: function () {} },
    }
    Outward.outward_act_stats({
      ctx: { actdef: { pattern: 'foo:1' }, seneca: { private$: private$ } },
      data: { meta: {} },
    })
    assert.equal(private$.stats.act.done, 1)
    fin()
  })

  it('arg-check', function (t, fin) {
    try {
      API.outward()
      assert.equal(false, true)
    } catch (e) {
      assert.equal(
        e.message,
        'seneca: Validation failed for property "outward"' +
          ' because the property is missing.',
      )
      assert.partialDeepStrictEqual(
        { ...e },
        {
          shape: true,
          code: 'shape',
        },
      )
      assert.partialDeepStrictEqual(e.props[0], {
        path: 'outward',
        type: 'function',
      })
    }

    fin()
  })
})
