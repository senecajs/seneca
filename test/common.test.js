/* Copyright (c) 2014-2017 Richard Rodger, MIT License */
'use strict'

var Assert = require('assert')
var Lab = require('lab')
var Code = require('code')
var Common = require('../lib/common')

var lab = (exports.lab = Lab.script())
var describe = lab.describe
var it = lab.it
var assert = Assert
var expect = Code.expect

describe('common', function() {
  it('misc', function(done) {
    expect(Common.boolify(true)).to.equal(true)
    expect(Common.boolify(false)).to.equal(false)
    expect(Common.boolify('true')).to.equal(true)
    expect(Common.boolify('false')).to.equal(false)
    expect(Common.boolify(1)).to.equal(true)
    expect(Common.boolify(0)).to.equal(false)

    expect(Common.boolify()).to.equal(false)
    expect(Common.boolify(null)).to.equal(false)
    expect(Common.boolify(NaN)).to.equal(false)
    expect(Common.boolify(void 0)).to.equal(false)
    expect(Common.boolify(new Date())).to.equal(false)
    expect(Common.boolify(/a/)).to.equal(false)

    expect(Common.boolify('{')).to.equal(false)
    expect(Common.boolify('}')).to.equal(false)

    expect(Common.copydata()).to.equal(void 0)
    expect(Common.copydata(null)).to.equal(null)
    expect(Common.copydata(NaN)).to.equal(NaN)
    expect(Common.copydata(true)).to.equal(true)
    expect(Common.copydata(false)).to.equal(false)
    expect(Common.copydata(0)).to.equal(0)
    expect(Common.copydata(1)).to.equal(1)

    var d = new Date()
    expect(Common.copydata(d).getTime()).to.equal(d.getTime())

    expect(Common.copydata([])).to.equal([])
    expect(Common.copydata([1, 2, 3])).to.equal([1, 2, 3])
    expect(Common.copydata([1, ['a', 'b'], 3])).to.equal([1, ['a', 'b'], 3])

    expect(Common.copydata({})).to.equal({})
    expect(Common.copydata({ a: 1 })).to.equal({ a: 1 })
    expect(Common.copydata({ a: 1, b: { c: 2 } })).to.equal({
      a: 1,
      b: { c: 2 }
    })

    var a = { a: 1 }
    var b = Object.create(a)
    b.b = 2
    expect(Common.copydata(b)).to.equal({ b: 2 })

    expect(Common.resolve_option(1)).equal(1)
    expect(Common.resolve_option('a')).equal('a')
    expect(
      Common.resolve_option(function() {
        return 'b'
      })
    ).equal('b')
    expect(
      Common.resolve_option(
        function(opts) {
          return opts.c
        },
        { c: 2 }
      )
    ).equal(2)

    done()
  })

  it('deepextend-empty', function(done) {
    assert.equal(null, Common.deepextend({}).a)

    assert.equal(1, Common.deepextend({ a: 1 }).a)

    assert.equal(1, Common.deepextend({}, { a: 1 }).a)
    assert.equal(1, Common.deepextend({ a: 1 }, {}).a)

    assert.equal(1, Common.deepextend({}, { a: 1 }, { b: 2 }).a)
    assert.equal(2, Common.deepextend({}, { a: 1 }, { b: 2 }).b)

    assert.equal(1, Common.deepextend({ a: 1 }, { b: 2 }, {}).a)
    assert.equal(2, Common.deepextend({ a: 1 }, { b: 2 }, {}).b)

    assert.equal(1, Common.deepextend({}, { a: 1 }, { b: 2 }, {}).a)
    assert.equal(2, Common.deepextend({}, { a: 1 }, { b: 2 }, {}).b)

    assert.equal(1, Common.deepextend({}, { a: 1 }, {}, { b: 2 }, {}).a)
    assert.equal(2, Common.deepextend({}, { a: 1 }, {}, { b: 2 }, {}).b)

    assert.equal(1, Common.deepextend({ a: { b: 1 } }, {}).a.b)
    assert.equal(1, Common.deepextend({}, { a: { b: 1 } }).a.b)

    assert.equal(1, Common.deepextend({ a: { b: 1 } }, { c: { d: 2 } }, {}).a.b)
    assert.equal(2, Common.deepextend({ a: { b: 1 } }, { c: { d: 2 } }, {}).c.d)

    assert.equal(1, Common.deepextend({}, { a: { b: 1 } }, { c: { d: 2 } }).a.b)
    assert.equal(2, Common.deepextend({}, { a: { b: 1 } }, { c: { d: 2 } }).c.d)

    assert.equal(
      1,
      Common.deepextend({}, { a: { b: 1 } }, { c: { d: 2 } }, {}).a.b
    )
    assert.equal(
      2,
      Common.deepextend({}, { a: { b: 1 } }, { c: { d: 2 } }, {}).c.d
    )

    assert.equal(
      1,
      Common.deepextend({}, { a: { b: 1 } }, {}, { c: { d: 2 } }, {}).a.b
    )
    assert.equal(
      2,
      Common.deepextend({}, { a: { b: 1 } }, {}, { c: { d: 2 } }, {}).c.d
    )

    assert.equal(1, Common.deepextend({ a: { b: 1 } }, { a: { c: 2 } }, {}).a.b)
    assert.equal(2, Common.deepextend({ a: { b: 1 } }, { a: { c: 2 } }, {}).a.c)

    assert.equal(1, Common.deepextend({}, { a: { b: 1 } }, { a: { c: 2 } }).a.b)
    assert.equal(2, Common.deepextend({}, { a: { b: 1 } }, { a: { c: 2 } }).a.c)

    assert.equal(
      1,
      Common.deepextend({}, { a: { b: 1 } }, { a: { c: 2 } }, {}).a.b
    )
    assert.equal(
      2,
      Common.deepextend({}, { a: { b: 1 } }, { a: { c: 2 } }, {}).a.c
    )

    assert.equal(
      1,
      Common.deepextend({}, { a: { b: 1 } }, {}, { a: { c: 2 } }, {}).a.b
    )
    assert.equal(
      2,
      Common.deepextend({}, { a: { b: 1 } }, {}, { a: { c: 2 } }, {}).a.c
    )

    assert.equal(1, Common.deepextend({ a: { b: 1 } }, { a: { b: 1 } }, {}).a.b)

    assert.equal(2, Common.deepextend({}, { a: { b: 1 } }, { a: { b: 2 } }).a.b)

    assert.equal(
      2,
      Common.deepextend({}, { a: { b: 1 } }, { a: { b: 2 } }, {}).a.b
    )

    assert.equal(
      2,
      Common.deepextend({}, { a: { b: 1 } }, {}, { a: { b: 2 } }, {}).a.b
    )

    done()
  })

  it('deepextend-dups', function(done) {
    var aa = { a: { aa: 1 } }
    var bb = { a: { bb: 2 } }

    var out = Common.deepextend(aa, bb, aa)

    assert.equal(1, out.a.aa)
    assert.equal(2, out.a.bb)

    out = Common.deepextend({}, aa, bb, aa)
    assert.equal(1, out.a.aa)
    assert.equal(2, out.a.bb)
    done()
  })

  it('deepextend-objs', function(done) {
    var d = {
      s: 's',
      n: 100,
      d: new Date(),
      f: function() {},
      a: arguments,
      r: /a/,
      b: Buffer('b')
    }
    var o = Common.deepextend({}, d)
    assert.equal('' + o, '' + d)
    done()
  })

  it('deepextend-objs with functions', function(done) {
    function noop() {}
    function f1() {}

    var defaults = {
      a: noop,
      b: noop
    }
    var options = {
      a: f1
    }

    var out = Common.deepextend(defaults, options)

    assert.strictEqual(out.a, f1)
    assert.strictEqual(out.b, noop)
    done()
  })

  it('pattern', function(fin) {
    assert.equal('a:1', Common.pattern('a:1'))
    assert.equal('a:1', Common.pattern({ a: 1 }))
    assert.equal('a:1,b:2', Common.pattern({ a: 1, b: 2 }))
    assert.equal('a:1,b:2', Common.pattern({ a: 1, b: 2, c$: 3 }))
    assert.equal('a:1,b:2', Common.pattern({ b: 2, c$: 3, a: 1 }))
    fin()
  })

  it('nil', function(fin) {
    Common.nil({ msg: 1 }, function reply() {
      fin()
    })
  })

  it('recurse', function(fin) {
    Common.recurse(
      [1, 2, 3],
      function(i, next) {
        next()
      },
      fin
    )
  })

  it('pincanon', function(done) {
    assert.equal('a:1', Common.pincanon({ a: 1 }))
    assert.equal('a:1', Common.pincanon([{ a: 1 }]))
    assert.equal('a:1', Common.pincanon('a:1'))
    assert.equal('a:1', Common.pincanon(['a:1']))

    assert.equal('a:1,b:2', Common.pincanon({ b: 2, a: 1 }))
    assert.equal('a:1,b:2', Common.pincanon([{ b: 2, a: 1 }]))
    assert.equal('a:1,b:2', Common.pincanon('b:2,a:1'))
    assert.equal('a:1,b:2', Common.pincanon(['b:2,a:1']))

    assert.equal('a:1;b:2', Common.pincanon([{ b: 2 }, { a: 1 }]))
    assert.equal('a:1;b:2', Common.pincanon(['b:2', 'a:1']))
    assert.equal('a:1;b:2', Common.pincanon(['b:2', { a: 1 }]))
    assert.equal('a:1;b:2', Common.pincanon([{ b: 2 }, 'a:1']))
    done()
  })

  it('history', function(done) {
    var h0 = Common.history(3)
    expect(h0.list()).to.equal([])
    expect(h0.get()).to.equal(null)
    expect(h0.get('a')).to.equal(null)
    expect(h0.stats()).to.equal({ next: 0, size: 3, total: 0 })

    h0.add()
    expect(h0.list()).to.equal([])
    expect(h0.get()).to.equal(null)
    expect(h0.get('a')).to.equal(null)
    expect(h0.stats()).to.equal({ next: 0, size: 3, total: 0 })

    h0.add({})
    expect(h0.list()).to.equal([])
    expect(h0.get()).to.equal(null)
    expect(h0.get('a')).to.equal(null)
    expect(h0.stats()).to.equal({ next: 0, size: 3, total: 0 })

    h0.add({ id: 'a' })
    expect(h0.list()).to.equal(['a'])
    expect(h0.get()).to.equal(null)
    expect(h0.get('a').id).to.equal('a')
    expect(h0.stats()).to.equal({ next: 1, size: 3, total: 1 })

    h0.add({ id: 'b' })
    expect(h0.list()).to.equal(['a', 'b'])
    expect(h0.get()).to.equal(null)
    expect(h0.get('a').id).to.equal('a')
    expect(h0.get('b').id).to.equal('b')
    expect(h0.stats()).to.equal({ next: 2, size: 3, total: 2 })

    h0.add({ id: 'c' })
    expect(h0.list()).to.equal(['a', 'b', 'c'])
    expect(h0.get()).to.equal(null)
    expect(h0.get('a').id).to.equal('a')
    expect(h0.get('b').id).to.equal('b')
    expect(h0.get('c').id).to.equal('c')
    expect(h0.stats()).to.equal({ next: 0, size: 3, total: 3 })

    h0.add({ id: 'd' })
    expect(h0.list()).to.equal(['b', 'c', 'd'])
    expect(h0.get()).to.equal(null)
    expect(h0.get('a')).to.equal(null)
    expect(h0.get('b').id).to.equal('b')
    expect(h0.get('c').id).to.equal('c')
    expect(h0.get('d').id).to.equal('d')
    expect(h0.stats()).to.equal({ next: 1, size: 3, total: 4 })

    expect(h0.list({ len: 3 })).to.equal(['b', 'c', 'd'])
    expect(h0.list({ len: 2 })).to.equal(['c', 'd'])
    expect(h0.list({ len: 1 })).to.equal(['d'])
    expect(h0.list({ len: 0 })).to.equal([])

    // empty history
    var h1 = Common.history(0)
    expect(h1.toString()).equal('{ next: 0, laps: 0, size: 0, log: [] }')

    h1.add({ id: 'a' })
    expect(h1.get()).to.equal(null)
    expect(h1.get('a')).to.equal(null)
    expect(h1.list()).to.equal([])
    expect(h1.stats()).to.equal({ next: 0, size: 0, total: 0 })

    var t = 40

    // timelimits
    var h2 = Common.history(2)
    h2.add({ id: 'a', timelimit: Date.now() + t, result: [] })
    h2.add({ id: 'b' })
    h2.add({ id: 'c', timelimit: Date.now() + 3 * t, result: [] })
    h2.add({ id: 'd' })
    h2.add({ id: 'e', timelimit: Date.now() + 5 * t, result: [{}] })

    expect(h2.list()).to.equal(['a', 'c', 'd', 'e'])

    expect(h2.get('b')).to.equal(null)
    expect(h2.get('a').id).to.equal('a')
    expect(h2.get('c').id).to.equal('c')
    expect(h2.get('d').id).to.equal('d')
    expect(h2.get('e').id).to.equal('e')

    setTimeout(function() {
      expect(h2.list()).to.equal(['a', 'c', 'd', 'e'])
      expect(h2.get('a')).to.equal(null)
      expect(h2.get('b')).to.equal(null)

      expect(h2.get('c').id).to.equal('c')
      expect(h2.get('d').id).to.equal('d')
      expect(h2.get('e').id).to.equal('e')

      expect(h2.list()).to.equal(['c', 'd', 'e'])
    }, 2 * t)

    setTimeout(function() {
      expect(h2.list()).to.equal(['c', 'd', 'e'])

      expect(h2.get('a')).to.equal(null)
      expect(h2.get('b')).to.equal(null)
      expect(h2.get('c')).to.equal(null)

      expect(h2.get('d').id).to.equal('d')
      expect(h2.get('e').id).to.equal('e')

      expect(h2.list()).to.equal(['d', 'e'])
      done()
    }, 4 * t)
  })
})
