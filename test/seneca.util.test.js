/* Copyright (c) 2010-2015 Richard Rodger, MIT License */

'use strict'

var assert = require('assert')
var util = require('util')

var Lab = require('lab')

var testopts = {log: 'silent'}
var lab = exports.lab = Lab.script()
var describe = lab.describe
var it = lab.it

var seneca = require('..')

describe('seneca.util', function () {
  var si = seneca(testopts)

  it('seneca.util.deepextend.happy', function (done) {
    assert.equal(util.inspect(si.util.deepextend({}, {a: 1}, {b: {c: 2}}, {b: {c: 3, d: 4}})), '{ a: 1, b: { c: 3, d: 4 } }')
    assert.equal(util.inspect(si.util.deepextend({}, {a: 1}, {b: [11, 22]}, {b: [undefined, 222, 333]})), '{ a: 1, b: [ 11, 222, 333 ] }')
    done()
  })

  it('seneca.util.deepextend.types with new', function (done) {
    /* eslint no-new-wrappers: 0 */
    var t1 = {
      s: 's1',
      so: new String('s2'),
      n: 1,
      no: new Number(2),
      b: true,
      bo: new Boolean(true),
      do: new Date(),
      f: function () { return 'f' },
      re: /a/
    }

    var to = si.util.deepextend({}, t1)

    assert.equal(to.s, t1.s)
    assert.equal(to.so, t1.so)
    assert.equal(to.n, t1.n)
    assert.equal(to.no, t1.no)
    assert.equal(to.b, t1.b)
    assert.equal(to.bo, t1.bo)
    assert.equal(to.do, t1.do)
    assert.equal(to.f, t1.f)
    assert.equal(to.re, t1.re)
    done()
  })

  it('seneca.util.deepextend.types', function (done) {
    var t1 = {
      s: 's1',
      so: String('s2'),
      n: 1,
      no: Number(2),
      b: true,
      bo: Boolean(true),
      do: Date(),
      f: function () { return 'f' },
      re: /a/
    }

    var to = si.util.deepextend({}, t1)

    assert.equal(to.s, t1.s)
    assert.equal(to.so, t1.so)
    assert.equal(to.n, t1.n)
    assert.equal(to.no, t1.no)
    assert.equal(to.b, t1.b)
    assert.equal(to.bo, t1.bo)
    assert.equal(to.do, t1.do)
    assert.equal(to.f, t1.f)
    assert.equal(to.re, t1.re)
    done()
  })

  it('seneca.util.deepextend.mixed', function (done) {
    var str = util.inspect(si.util.deepextend(
      {}, {a: 1, b: {bb: 1}, c: 's', d: 'ss', e: [2, 3], f: {fa: 1, fb: 2}},
      {a: {aa: 1}, b: {bb: {bbb: 1}}, c: [1], d: {dd: 1}, e: {ee: 1}, f: [4, 5, 6]}
    )).replace(/\s+/g, ' ')

    var expect = '{ a: { aa: 1 }, b: { bb: { bbb: 1 } }, c: [ 1 ], d: { dd: 1 }, e: { ee: 1 }, f: [ 4, 5, 6 ] }'

    assert.equal(str, expect)
    done()
  })

  it('seneca.util.deepextend.entity', function (done) {
    var str = util.inspect(si.util.deepextend(
      {a: {x: 1}, b: {y: 1, entity$: 'a/b/c'}},
      {c: {z: 1}, b: {y: 2, entity$: 'a/b/c'}}
    )).replace(/\s+/g, ' ')

    var expect = "{ a: { x: 1 }, b: { y: 2, 'entity$': 'a/b/c' }, c: { z: 1 } }"

    assert.equal(str, expect)
    done()
  })

  it('seneca.util.argprops', function (done) {
    var out = si.util.argprops({a: 1, b: 2, c: 3}, {b: 22, c: 33, d: 4}, {c: 333}, ['d'])
    assert.equal('{ a: 1, b: 22, c: 333 }', util.inspect(out))

    out = si.util.argprops({}, {d: 1}, {}, 'd')
    assert.equal('{}', util.inspect(out))

    out = si.util.argprops({}, {d: 1, e: 2}, {}, 'd, e')
    assert.equal('{}', util.inspect(out))
    done()
  })
})
