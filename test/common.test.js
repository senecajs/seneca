/* Copyright © 2010-2023 Richard Rodger and other contributors, MIT License. */
'use strict'

const assert = require('node:assert/strict')
const Common = require('../lib/common')

const { describe, it } = require('node:test')

describe('common', function () {
  it('stringify', function (t, fin) {
    assert.equal(Common.stringify({}), '{}')
    assert.equal(Common.stringify({ a: 1 }), '{"a":1}')
    fin()
  })

  it('misc', function (t, fin) {
    assert.equal(Common.resolve_option(1), 1)
    assert.equal(Common.resolve_option('a'), 'a')
    assert.equal(
      Common.resolve_option(function () {
        return 'b'
      }),
      'b',
    )
    assert.equal(
      Common.resolve_option(
        function (opts) {
          return opts.c
        },
        { c: 2 },
      ),
      2,
    )

    fin()
  })

  it('deep-empty', function (t, fin) {
    assert.equal(1, Common.deep({ a: 1 }).a)

    assert.ok(null == Common.deep({}).a)

    assert.equal(1, Common.deep({ a: 1 }).a)

    assert.equal(1, Common.deep({}, { a: 1 }).a)
    assert.equal(1, Common.deep({ a: 1 }, {}).a)

    assert.equal(1, Common.deep({}, { a: 1 }, { b: 2 }).a)
    assert.equal(2, Common.deep({}, { a: 1 }, { b: 2 }).b)

    assert.equal(1, Common.deep({ a: 1 }, { b: 2 }, {}).a)
    assert.equal(2, Common.deep({ a: 1 }, { b: 2 }, {}).b)

    assert.equal(1, Common.deep({}, { a: 1 }, { b: 2 }, {}).a)
    assert.equal(2, Common.deep({}, { a: 1 }, { b: 2 }, {}).b)

    assert.equal(1, Common.deep({}, { a: 1 }, {}, { b: 2 }, {}).a)
    assert.equal(2, Common.deep({}, { a: 1 }, {}, { b: 2 }, {}).b)

    assert.equal(1, Common.deep({ a: { b: 1 } }, {}).a.b)
    assert.equal(1, Common.deep({}, { a: { b: 1 } }).a.b)

    assert.equal(1, Common.deep({ a: { b: 1 } }, { c: { d: 2 } }, {}).a.b)
    assert.equal(2, Common.deep({ a: { b: 1 } }, { c: { d: 2 } }, {}).c.d)

    assert.equal(1, Common.deep({}, { a: { b: 1 } }, { c: { d: 2 } }).a.b)
    assert.equal(2, Common.deep({}, { a: { b: 1 } }, { c: { d: 2 } }).c.d)

    assert.equal(1, Common.deep({}, { a: { b: 1 } }, { c: { d: 2 } }, {}).a.b)
    assert.equal(2, Common.deep({}, { a: { b: 1 } }, { c: { d: 2 } }, {}).c.d)

    assert.equal(
      1,
      Common.deep({}, { a: { b: 1 } }, {}, { c: { d: 2 } }, {}).a.b,
    )
    assert.equal(
      2,
      Common.deep({}, { a: { b: 1 } }, {}, { c: { d: 2 } }, {}).c.d,
    )

    assert.equal(1, Common.deep({ a: { b: 1 } }, { a: { c: 2 } }, {}).a.b)
    assert.equal(2, Common.deep({ a: { b: 1 } }, { a: { c: 2 } }, {}).a.c)

    assert.equal(1, Common.deep({}, { a: { b: 1 } }, { a: { c: 2 } }).a.b)
    assert.equal(2, Common.deep({}, { a: { b: 1 } }, { a: { c: 2 } }).a.c)

    assert.equal(1, Common.deep({}, { a: { b: 1 } }, { a: { c: 2 } }, {}).a.b)
    assert.equal(2, Common.deep({}, { a: { b: 1 } }, { a: { c: 2 } }, {}).a.c)

    assert.equal(
      1,
      Common.deep({}, { a: { b: 1 } }, {}, { a: { c: 2 } }, {}).a.b,
    )
    assert.equal(
      2,
      Common.deep({}, { a: { b: 1 } }, {}, { a: { c: 2 } }, {}).a.c,
    )

    assert.equal(1, Common.deep({ a: { b: 1 } }, { a: { b: 1 } }, {}).a.b)

    assert.equal(2, Common.deep({}, { a: { b: 1 } }, { a: { b: 2 } }).a.b)

    assert.equal(2, Common.deep({}, { a: { b: 1 } }, { a: { b: 2 } }, {}).a.b)

    assert.equal(
      2,
      Common.deep({}, { a: { b: 1 } }, {}, { a: { b: 2 } }, {}).a.b,
    )

    fin()
  })

  it('deep-dups', function (t, fin) {
    var aa = { a: { aa: 1 } }
    var bb = { a: { bb: 2 } }

    var out = Common.deep(aa, bb, aa)

    assert.equal(1, out.a.aa)
    assert.equal(2, out.a.bb)

    out = Common.deep({}, aa, bb, aa)
    assert.equal(1, out.a.aa)
    assert.equal(2, out.a.bb)
    fin()
  })

  it('deep-objs', function (t, fin) {
    var d = {
      s: 's',
      n: 100,
      d: new Date(),
      f: function () {},
      a: arguments,
      r: /a/,
      b: Buffer.from('b'),
    }
    var o = Common.deep({}, d)
    assert.equal('' + o, '' + d)
    fin()
  })

  it('deep-objs with functions', function (t, fin) {
    function noop() {}
    function f1() {}

    var defaults = {
      a: noop,
      b: noop,
    }
    var options = {
      a: f1,
    }

    var out = Common.deep(defaults, options)

    assert.strictEqual(out.a, f1)
    assert.strictEqual(out.b, noop)
    fin()
  })

  it('pattern', function (t, fin) {
    assert.equal('a:1', Common.pattern('a:1'))
    assert.equal('a:1', Common.pattern({ a: 1 }))
    assert.equal('a:1,b:2', Common.pattern({ a: 1, b: 2 }))
    assert.equal('a:1,b:2', Common.pattern({ a: 1, b: 2, c$: 3 }))
    assert.equal('a:1,b:2', Common.pattern({ b: 2, c$: 3, a: 1 }))
    assert.equal('a:1,b:2', Common.pattern({ b: 2, c: { x: 1 }, a: 1 }))
    assert.equal('a:1,b:2', Common.pattern({ b: 2, c: () => {}, a: 1 }))
    fin()
  })

  it('pincanon', function (t, fin) {
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
    fin()
  })

  it('history', function (t, fin) {
    function itemlist(item) {
      return item.id + '~' + item.timelimit
    }

    var h0 = Common.history()

    h0.add({ id: 'a0', timelimit: 100 })
    assert.deepEqual(h0._list.map(itemlist), ['a0~100'])

    h0.add({ id: 'a1', timelimit: 200 })
    assert.deepEqual(h0._list.map(itemlist), ['a0~100', 'a1~200'])

    h0.add({ id: 'a2', timelimit: 300 })
    assert.deepEqual(h0._list.map(itemlist), ['a0~100', 'a1~200', 'a2~300'])

    h0.add({ id: 'a3', timelimit: 200 })
    assert.deepEqual(h0._list.map(itemlist), [
      'a0~100',
      'a1~200',
      'a3~200',
      'a2~300',
    ])

    h0.add({ id: 'a4', timelimit: 300 })
    assert.deepEqual(h0._list.map(itemlist), [
      'a0~100',
      'a1~200',
      'a3~200',
      'a2~300',
      'a4~300',
    ])

    h0.add({ id: 'a5', timelimit: 100 })
    assert.deepEqual(h0._list.map(itemlist), [
      'a0~100',
      'a5~100',
      'a1~200',
      'a3~200',
      'a2~300',
      'a4~300',
    ])

    assert.deepEqual(Object.keys(h0._map), ['a0', 'a1', 'a2', 'a3', 'a4', 'a5'])

    h0.add({ id: 'a6', timelimit: 101 })
    assert.deepEqual(h0._list.map(itemlist), [
      'a0~100',
      'a5~100',
      'a6~101',
      'a1~200',
      'a3~200',
      'a2~300',
      'a4~300',
    ])

    h0.add({ id: 'a7', timelimit: 199 })
    assert.deepEqual(h0._list.map(itemlist), [
      'a0~100',
      'a5~100',
      'a6~101',
      'a7~199',
      'a1~200',
      'a3~200',
      'a2~300',
      'a4~300',
    ])

    h0.prune(99)
    assert.deepEqual(h0._list.map(itemlist), [
      'a0~100',
      'a5~100',
      'a6~101',
      'a7~199',
      'a1~200',
      'a3~200',
      'a2~300',
      'a4~300',
    ])

    h0.prune(100)
    assert.deepEqual(h0._list.map(itemlist), [
      'a6~101',
      'a7~199',
      'a1~200',
      'a3~200',
      'a2~300',
      'a4~300',
    ])

    h0.prune(101)
    assert.deepEqual(h0._list.map(itemlist), [
      'a7~199',
      'a1~200',
      'a3~200',
      'a2~300',
      'a4~300',
    ])

    h0.prune(299)
    assert.deepEqual(h0._list.map(itemlist), ['a2~300', 'a4~300'])

    h0.prune(299)
    assert.deepEqual(h0._list.map(itemlist), ['a2~300', 'a4~300'])

    h0.prune(300)
    assert.deepEqual(h0._list.map(itemlist), [])

    var h1 = Common.history()

    h1.add({ id: 'a0', timelimit: 100 })
    assert.deepEqual(h1._list.map(itemlist), ['a0~100'])

    h1.add({ id: 'a1', timelimit: 50 })
    assert.deepEqual(h1._list.map(itemlist), ['a1~50', 'a0~100'])

    h1.add({ id: 'a2', timelimit: 25 })
    assert.deepEqual(h1._list.map(itemlist), ['a2~25', 'a1~50', 'a0~100'])

    assert.deepEqual(Object.keys(h1._map), ['a0', 'a1', 'a2'])

    h1.prune(0)
    assert.deepEqual(h1._list.map(itemlist), ['a2~25', 'a1~50', 'a0~100'])

    h1.prune(25)
    assert.deepEqual(h1._list.map(itemlist), ['a1~50', 'a0~100'])

    h1.prune(100)
    assert.deepEqual(h1._list.map(itemlist), [])

    var h2 = Common.history()

    h2.add({ id: 'a0', timelimit: 100 })
    assert.deepEqual(h2._list.map(itemlist), ['a0~100'])

    h2.add({ id: 'a1', timelimit: 200 })
    assert.deepEqual(h2._list.map(itemlist), ['a0~100', 'a1~200'])

    h2.add({ id: 'a2', timelimit: 150 })
    assert.deepEqual(h2._list.map(itemlist), ['a0~100', 'a2~150', 'a1~200'])

    h2.add({ id: 'a3', timelimit: 125 })
    assert.deepEqual(h2._list.map(itemlist), [
      'a0~100',
      'a3~125',
      'a2~150',
      'a1~200',
    ])

    h2.add({ id: 'a4', timelimit: 175 })
    assert.deepEqual(h2._list.map(itemlist), [
      'a0~100',
      'a3~125',
      'a2~150',
      'a4~175',
      'a1~200',
    ])

    assert.deepEqual(Object.keys(h2._map), ['a0', 'a1', 'a2', 'a3', 'a4'])

    fin()
  })

  it('clean', function (t, fin) {
    assert.deepEqual(Common.clean({}), {})
    assert.deepEqual(Common.clean({ a: 1 }), { a: 1 })
    assert.deepEqual(Common.clean({ b$: 2, a: 1 }), { a: 1 })
    assert.deepEqual(Common.clean({ b$: 2 }), {})

    assert.deepEqual(Common.clean([]), [])
    assert.deepEqual(Common.clean([1]), [1])
    assert.deepEqual(Common.clean([1, 2]), [1, 2])

    var a = [1, 2, 3]
    a.foo = 4
    a.bar$ = 5
    var ca = Common.clean(a)
    assert.deepEqual([...ca], [1, 2, 3])
    assert.equal(ca.foo, 4)
    assert.ok(null == ca.bar$)

    fin()
  })

  it('parse_jsonic', function (t, fin) {
    assert.deepEqual({ ...Common.parse_jsonic('a:b') }, { a: 'b' })
    assert.deepEqual({ ...Common.parse_jsonic('\na:b') }, { a: 'b' })

    try {
      Common.parse_jsonic('a::')
      assert.equal(false, true)
    } catch (e) {
      assert.equal(e.code, 'bad_jsonic')
    }

    try {
      Common.parse_jsonic('\n\na::\n\n  x}')
      assert.equal(false, true)
    } catch (e) {
      assert.equal(e.code, 'bad_jsonic')
    }

    fin()
  })

  it('make_plugin_key', function (t, fin) {
    assert.equal(Common.make_plugin_key('foo'), 'foo')
    assert.equal(Common.make_plugin_key('foo', '0'), 'foo$0')
    assert.equal(Common.make_plugin_key('foo', 0), 'foo$0')
    assert.equal(Common.make_plugin_key('foo$0'), 'foo$0')
    assert.equal(Common.make_plugin_key({ name: 'foo' }, '0'), 'foo$0')
    assert.equal(Common.make_plugin_key({ name: 'foo', tag: '0' }), 'foo$0')
    assert.equal(
      Common.make_plugin_key({ name: 'foo', tag: '0' }, 'a'),
      'foo$0',
    )

    assert.equal(Common.make_plugin_key('foo.1~2-3$_'), 'foo.1~2-3$_')

    try {
      Common.make_plugin_key()
      assert.equal(false, true)
    } catch (e) {
      assert.equal(e.code, 'missing_plugin_name')
    }

    try {
      Common.make_plugin_key({})
      assert.equal(false, true)
    } catch (e) {
      assert.equal(e.code, 'bad_plugin_name')
    }

    try {
      Common.make_plugin_key('')
      assert.equal(false, true)
    } catch (e) {
      assert.equal(e.code, 'bad_plugin_name')
    }

    try {
      Common.make_plugin_key('$')
      assert.equal(false, true)
    } catch (e) {
      assert.equal(e.code, 'bad_plugin_name')
    }

    try {
      Common.make_plugin_key('a', '$')
      assert.equal(false, true)
    } catch (e) {
      assert.equal(e.code, 'bad_plugin_tag')
    }

    var b = []
    for (var i = 0; i < 1026; i++) {
      b.push('b')
    }
    var s = b.join('')

    try {
      Common.make_plugin_key(s)
      assert.equal(false, true)
    } catch (e) {
      assert.equal(e.code, 'bad_plugin_name')
    }

    try {
      Common.make_plugin_key('a', s)
      assert.equal(false, true)
    } catch (e) {
      assert.equal(e.code, 'bad_plugin_tag')
    }

    fin()
  })
})
