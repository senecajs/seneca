/* Copyright (c) 2010-2015 Richard Rodger, MIT License */

'use strict'

var Code = require('code')
var Lab = require('@hapi/lab')
var Util = require('util')

var testopts = { log: 'silent' }
var lab = (exports.lab = Lab.script())
var describe = lab.describe
var expect = Code.expect

var Shared = require('./shared')
var it = Shared.make_it(lab)

var Seneca = require('..')

describe('util', function() {
  var si = Seneca(testopts)

  it('seneca.util.deepextend.happy', function(done) {
    expect(
      si.util.deepextend({}, { a: 1 }, { b: { c: 2 } }, { b: { c: 3, d: 4 } })
    ).to.include({ a: 1, b: { c: 3, d: 4 } })
    expect(
      si.util.deepextend(
        {},
        { a: 1 },
        { b: [11, 22] },
        { b: [undefined, 222, 333] }
      )
    ).to.include({ a: 1, b: [11, 222, 333] })
    done()
  })

  it('seneca.util.deepextend.types with new', function(done) {
    /* eslint no-new-wrappers: 0 */
    var t1 = {
      s: 's1',
      so: new String('s2'),
      n: 1,
      no: new Number(2),
      b: true,
      bo: new Boolean(true),
      do: new Date(),
      f: function() {
        return 'f'
      },
      re: /a/
    }

    var to = si.util.deepextend({}, t1)

    expect(to.s).to.equal(t1.s)
    expect(to.so).to.equal(t1.so)
    expect(to.n).to.equal(t1.n)
    expect(to.no).to.equal(t1.no)
    expect(to.b).to.equal(t1.b)
    expect(to.bo).to.equal(t1.bo)
    expect(to.do).to.equal(t1.do)
    expect(to.f).to.equal(t1.f)
    expect(to.re).to.equal(t1.re)
    done()
  })

  it('seneca.util.deepextend.types', function(done) {
    var t1 = {
      s: 's1',
      so: String('s2'),
      n: 1,
      no: Number(2),
      b: true,
      bo: Boolean(true),
      do: Date(),
      f: function() {
        return 'f'
      },
      re: /a/
    }

    var to = si.util.deepextend({}, t1)

    expect(to.s).to.equal(t1.s)
    expect(to.so).to.equal(t1.so)
    expect(to.n).to.equal(t1.n)
    expect(to.no).to.equal(t1.no)
    expect(to.b).to.equal(t1.b)
    expect(to.bo).to.equal(t1.bo)
    expect(to.do).to.equal(t1.do)
    expect(to.f).to.equal(t1.f)
    expect(to.re).to.equal(t1.re)
    done()
  })

  it('seneca.util.deepextend.mixed', function(done) {
    var obj = si.util.deepextend(
      {},
      { a: 1, b: { bb: 1 }, c: 's', d: 'ss', e: [2, 3], f: { fa: 1, fb: 2 } },
      {
        a: { aa: 1 },
        b: { bb: { bbb: 1 } },
        c: [1],
        d: { dd: 1 },
        e: { ee: 1 },
        f: [4, 5, 6]
      }
    )

    expect(obj.a).to.equal({ aa: 1 })
    expect(obj.b).to.equal({ bb: { bbb: 1 } })
    expect(obj.c).to.equal([1])
    expect(obj.d).to.equal({ dd: 1 })
    expect(obj.e).to.equal({ '0': 2, '1': 3, ee: 1 })
    expect(obj.f).to.equal([4, 5, 6])
    expect(obj.f.fa).to.equal(1)
    expect(obj.f.fb).to.equal(2)

    done()
  })

  it('seneca.util.deepextend.entity', function(done) {
    var obj = si.util.deepextend(
      { a: { x: 1 }, b: { y: 1, entity$: 'a/b/c' } },
      { c: { z: 1 }, b: { y: 2, entity$: 'a/b/c' } }
    )

    expect(obj).to.include({
      a: { x: 1 },
      b: { y: 2, entity$: 'a/b/c' },
      c: { z: 1 }
    })
    done()
  })
})
