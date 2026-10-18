/* Copyright © 2016-2018 Richard Rodger and other contributors, MIT License. */
'use strict'

const assert = require('node:assert/strict')

const { describe, it } = require('node:test')

var Seneca = require('..')

var { Inward } = require('../lib/inward')
var { API } = require('../lib/api')

describe('inward', function () {
  it('announce', function (t, fin) {
    var seneca = Seneca().test(fin)
    var seen = 0

    seneca.ready(function () {
      seneca.on('act-in', function (ev) {
        assert.equal(ev.a, 2)
        fin()
      })

      Inward.inward_announce({
        ctx: { seneca: seneca },
        data: { msg: { a: 1 } },
      })
      Inward.inward_announce({
        ctx: { seneca: seneca, actdef: {} },
        data: { msg: { a: 2 } },
      })
    })
  })

  it('arg-check', function (t, fin) {
    try {
      API.inward()
      assert.equal(false, true)
    } catch (e) {
      assert.equal(
        e.message,
        'seneca: Validation failed for property "inward"' +
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
        path: 'inward',
        type: 'function',
      })
    }

    fin()
  })
})
