/* Copyright (c) 2010-2015 Richard Rodger, MIT License */

'use strict'

const assert = require('node:assert/strict')
var Util = require('util')

var testopts = { log: 'silent' }
const { describe, it } = require('node:test')

var Seneca = require('..')

describe('util', function () {
  var si = Seneca(testopts)

  it('seneca.util.deep.happy', function (t, done) {
    assert.partialDeepStrictEqual(
      si.util.deep({}, { a: 1 }, { b: { c: 2 } }, { b: { c: 3, d: 4 } }),
      { a: 1, b: { c: 3, d: 4 } },
    )
    assert.partialDeepStrictEqual(
      si.util.deep({}, { a: 1 }, { b: [11, 22] }, { b: [undefined, 222, 333] }),
      { a: 1, b: [11, 222, 333] },
    )
    done()
  })

  it('seneca.util.deep.types with new', function (t, done) {
    /* eslint no-new-wrappers: 0 */
    var t1 = {
      s: 's1',
      so: new String('s2'),
      n: 1,
      no: new Number(2),
      b: true,
      bo: new Boolean(true),
      do: new Date(),
      f: function () {
        return 'f'
      },
      re: /a/,
    }

    var to = si.util.deep({}, t1)

    assert.equal(to.s, t1.s)
    assert.deepEqual(to.so, t1.so)
    assert.equal(to.n, t1.n)
    assert.deepEqual(to.no, t1.no)
    assert.equal(to.b, t1.b)
    assert.deepEqual(to.bo, t1.bo)
    assert.deepEqual(to.do, t1.do)
    assert.deepEqual(to.f, t1.f)
    assert.deepEqual(to.re, t1.re)
    done()
  })

  it('seneca.util.deep.types', function (t, done) {
    var t1 = {
      s: 's1',
      so: String('s2'),
      n: 1,
      no: Number(2),
      b: true,
      bo: Boolean(true),
      do: Date(),
      f: function () {
        return 'f'
      },
      re: /a/,
    }

    var to = si.util.deep({}, t1)

    assert.equal(to.s, t1.s)
    assert.equal(to.so, t1.so)
    assert.equal(to.n, t1.n)
    assert.equal(to.no, t1.no)
    assert.equal(to.b, t1.b)
    assert.equal(to.bo, t1.bo)
    assert.equal(to.do, t1.do)
    assert.deepEqual(to.f, t1.f)
    assert.deepEqual(to.re, t1.re)
    done()
  })

  it('seneca.util.deep.mixed', function (t, done) {
    var obj = si.util.deep(
      {},
      { a: 1, b: { bb: 1 }, c: 's', d: 'ss', e: [2, 3], f: { fa: 1, fb: 2 } },
      {
        a: { aa: 1 },
        b: { bb: { bbb: 1 } },
        c: [1],
        d: { dd: 1 },
        e: { ee: 1 },
        f: [4, 5, 6],
      },
    )

    assert.deepEqual(obj.a, { aa: 1 })
    assert.deepEqual(obj.b, { bb: { bbb: 1 } })
    assert.deepEqual(obj.c, [1])
    assert.deepEqual(obj.d, { dd: 1 })
    assert.deepEqual(obj.e, { 0: 2, 1: 3, ee: 1 })
    assert.deepEqual([...obj.f], [4, 5, 6])
    assert.equal(obj.f.fa, 1)
    assert.equal(obj.f.fb, 2)

    done()
  })

  it('seneca.util.deep.entity', function (t, done) {
    var obj = si.util.deep(
      { a: { x: 1 }, b: { y: 1, entity$: 'a/b/c' } },
      { c: { z: 1 }, b: { y: 2, entity$: 'a/b/c' } },
    )

    assert.partialDeepStrictEqual(obj, {
      a: { x: 1 },
      b: { y: 2, entity$: 'a/b/c' },
      c: { z: 1 },
    })
    done()
  })

  it('seneca.util.gex', function (t, done) {
    assert.ok(null != Seneca.util.Gex)
    assert.equal(Seneca.util.Gex('a*').match('ab'), true)
    done()
  })

  it('common.idnid-never-starts-with-digit', function (_t, done) {
    var Common = require('../lib/common.js')

    // Use a short length so a digit-first id would be common by
    // chance if the fix wasn't in place (default alphabet is
    // 0-9a-z, so ~28% chance per id of starting with a digit).
    var gen = Common.idnid({ length: 4 })

    for (var i = 0; i < 2000; i++) {
      var id = gen()
      assert.equal(id.length, 4)
      assert.equal(/^[0-9]/.test(id), false)
    }

    done()
  })
})
