/* Copyright (c) 2014-2017 Richard Rodger, MIT License */
'use strict'

var Assert = require('assert')
var Lab = require('lab')
var Code = require('code')
var Common = require('../lib/common')

var lab = exports.lab = Lab.script()
var describe = lab.describe
var it = lab.it
var assert = Assert
var expect = Code.expect


describe('common', function () {
  it('deepextend-empty', function (done) {
    assert.equal(null, Common.deepextend({}).a)

    assert.equal(1, Common.deepextend({a: 1}).a)

    assert.equal(1, Common.deepextend({}, {a: 1}).a)
    assert.equal(1, Common.deepextend({a: 1}, {}).a)

    assert.equal(1, Common.deepextend({}, {a: 1}, {b: 2}).a)
    assert.equal(2, Common.deepextend({}, {a: 1}, {b: 2}).b)

    assert.equal(1, Common.deepextend({a: 1}, {b: 2}, {}).a)
    assert.equal(2, Common.deepextend({a: 1}, {b: 2}, {}).b)

    assert.equal(1, Common.deepextend({}, {a: 1}, {b: 2}, {}).a)
    assert.equal(2, Common.deepextend({}, {a: 1}, {b: 2}, {}).b)

    assert.equal(1, Common.deepextend({}, {a: 1}, {}, {b: 2}, {}).a)
    assert.equal(2, Common.deepextend({}, {a: 1}, {}, {b: 2}, {}).b)

    assert.equal(1, Common.deepextend({a: {b: 1}}, {}).a.b)
    assert.equal(1, Common.deepextend({}, {a: {b: 1}}).a.b)

    assert.equal(1, Common.deepextend({a: {b: 1}}, {c: {d: 2}}, {}).a.b)
    assert.equal(2, Common.deepextend({a: {b: 1}}, {c: {d: 2}}, {}).c.d)

    assert.equal(1, Common.deepextend({}, {a: {b: 1}}, {c: {d: 2}}).a.b)
    assert.equal(2, Common.deepextend({}, {a: {b: 1}}, {c: {d: 2}}).c.d)

    assert.equal(1, Common.deepextend({}, {a: {b: 1}}, {c: {d: 2}}, {}).a.b)
    assert.equal(2, Common.deepextend({}, {a: {b: 1}}, {c: {d: 2}}, {}).c.d)

    assert.equal(1, Common.deepextend({}, {a: {b: 1}}, {}, {c: {d: 2}}, {}).a.b)
    assert.equal(2, Common.deepextend({}, {a: {b: 1}}, {}, {c: {d: 2}}, {}).c.d)

    assert.equal(1, Common.deepextend({a: {b: 1}}, {a: {c: 2}}, {}).a.b)
    assert.equal(2, Common.deepextend({a: {b: 1}}, {a: {c: 2}}, {}).a.c)

    assert.equal(1, Common.deepextend({}, {a: {b: 1}}, {a: {c: 2}}).a.b)
    assert.equal(2, Common.deepextend({}, {a: {b: 1}}, {a: {c: 2}}).a.c)

    assert.equal(1, Common.deepextend({}, {a: {b: 1}}, {a: {c: 2}}, {}).a.b)
    assert.equal(2, Common.deepextend({}, {a: {b: 1}}, {a: {c: 2}}, {}).a.c)

    assert.equal(1, Common.deepextend({}, {a: {b: 1}}, {}, {a: {c: 2}}, {}).a.b)
    assert.equal(2, Common.deepextend({}, {a: {b: 1}}, {}, {a: {c: 2}}, {}).a.c)

    assert.equal(1, Common.deepextend({a: {b: 1}}, {a: {b: 1}}, {}).a.b)

    assert.equal(2, Common.deepextend({}, {a: {b: 1}}, {a: {b: 2}}).a.b)

    assert.equal(2, Common.deepextend({}, {a: {b: 1}}, {a: {b: 2}}, {}).a.b)

    assert.equal(2, Common.deepextend({}, {a: {b: 1}}, {}, {a: {b: 2}}, {}).a.b)

    done()
  })

  it('deepextend-dups', function (done) {
    var aa = {a: {aa: 1}}
    var bb = {a: {bb: 2}}

    var out = Common.deepextend(aa, bb, aa)

    assert.equal(1, out.a.aa)
    assert.equal(2, out.a.bb)

    out = Common.deepextend({}, aa, bb, aa)
    assert.equal(1, out.a.aa)
    assert.equal(2, out.a.bb)
    done()
  })

  it('deepextend-objs', function (done) {
    var d = {
      s: 's',
      n: 100,
      d: new Date(),
      f: function () {},
      a: arguments,
      r: /a/,
      b: Buffer('b')
    }
    var o = Common.deepextend({}, d)
    assert.equal('' + o, '' + d)
    done()
  })

  it('deepextend-objs with functions', function (done) {
    function noop () {}
    function f1 () {}

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

  it('pattern', function (done) {
    assert.equal('a:1', Common.pattern({a: 1}))
    assert.equal('a:1,b:2', Common.pattern({a: 1, b: 2}))
    assert.equal('a:1,b:2', Common.pattern({a: 1, b: 2, c$: 3}))
    assert.equal('a:1,b:2', Common.pattern({b: 2, c$: 3, a: 1}))
    done()
  })

  it('pincanon', function (done) {
    assert.equal('a:1', Common.pincanon({a: 1}))
    assert.equal('a:1', Common.pincanon([{a: 1}]))
    assert.equal('a:1', Common.pincanon('a:1'))
    assert.equal('a:1', Common.pincanon(['a:1']))

    assert.equal('a:1,b:2', Common.pincanon({b: 2, a: 1}))
    assert.equal('a:1,b:2', Common.pincanon([{b: 2, a: 1}]))
    assert.equal('a:1,b:2', Common.pincanon('b:2,a:1'))
    assert.equal('a:1,b:2', Common.pincanon(['b:2,a:1']))

    assert.equal('a:1;b:2', Common.pincanon([{b: 2}, {a: 1}]))
    assert.equal('a:1;b:2', Common.pincanon(['b:2', 'a:1']))
    assert.equal('a:1;b:2', Common.pincanon(['b:2', {a: 1}]))
    assert.equal('a:1;b:2', Common.pincanon([{b: 2}, 'a:1']))
    done()
  })


  it('history', function (done) {
    var h0 = Common.history(3)
    expect(h0.list()).to.equal([])
    expect(h0.get()).to.equal(null)
    expect(h0.get('a')).to.equal(null)
    expect(h0.stats()).to.equal({next: 0, size: 3, total: 0})

    h0.add()
    expect(h0.list()).to.equal([])
    expect(h0.get()).to.equal(null)
    expect(h0.get('a')).to.equal(null)
    expect(h0.stats()).to.equal({next: 0, size: 3, total: 0})

    h0.add({})
    expect(h0.list()).to.equal([])
    expect(h0.get()).to.equal(null)
    expect(h0.get('a')).to.equal(null)
    expect(h0.stats()).to.equal({next: 0, size: 3, total: 0})

    h0.add({id:'a'})
    expect(h0.list()).to.equal(['a'])
    expect(h0.get()).to.equal(null)
    expect(h0.get('a')).to.equal({id: 'a'})
    expect(h0.stats()).to.equal({next: 1, size: 3, total: 1})

    h0.add({id:'b'})
    expect(h0.list()).to.equal(['a', 'b'])
    expect(h0.get()).to.equal(null)
    expect(h0.get('a')).to.equal({id: 'a'})
    expect(h0.get('b')).to.equal({id: 'b'})
    expect(h0.stats()).to.equal({next: 2, size: 3, total: 2})

    h0.add({id:'c'})
    expect(h0.list()).to.equal(['a', 'b', 'c'])
    expect(h0.get()).to.equal(null)
    expect(h0.get('a')).to.equal({id: 'a'})
    expect(h0.get('b')).to.equal({id: 'b'})
    expect(h0.get('c')).to.equal({id: 'c'})
    expect(h0.stats()).to.equal({next: 0, size: 3, total: 3})

    h0.add({id:'d'})
    expect(h0.list()).to.equal(['b', 'c', 'd'])
    expect(h0.get()).to.equal(null)
    expect(h0.get('a')).to.equal(null)
    expect(h0.get('b')).to.equal({id: 'b'})
    expect(h0.get('c')).to.equal({id: 'c'})
    expect(h0.get('d')).to.equal({id: 'd'})
    expect(h0.stats()).to.equal({next: 1, size: 3, total: 4})

    expect(h0.list(3)).to.equal(['b', 'c', 'd'])
    expect(h0.list(2)).to.equal(['c', 'd'])
    expect(h0.list(1)).to.equal(['d'])
    expect(h0.list(0)).to.equal([])


    // empty history
    var h1 = Common.history(0)
    h1.add({id:'a'})
    expect(h1.get()).to.equal(null)
    expect(h1.get('a')).to.equal(null)
    expect(h1.list()).to.equal([])
    expect(h1.stats()).to.equal({next: 0, size: 0, total: 0})

    done()
  })
})
