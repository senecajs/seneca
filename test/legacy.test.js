/* Copyright © 2010-2022 Richard Rodger and other contributors, MIT License. */
'use strict'

const Util = require('util')

const assert = require('node:assert/strict')

const { describe, it } = require('node:test')

const { Legacy } = require('../lib/legacy.js')

const Seneca = require('..')

// TODO: move all legacy functions here and isolate lack of test coverage

describe('legacy', function () {
  it('nil', function (t, fin) {
    Legacy.nil({ msg: 1 }, function reply() {
      fin()
    })
  })

  it('copydata', function (t, fin) {
    assert.equal(Legacy.copydata(), void 0)
    assert.equal(Legacy.copydata(null), null)
    assert.equal(Legacy.copydata(NaN), NaN)
    assert.equal(Legacy.copydata(true), true)
    assert.equal(Legacy.copydata(false), false)
    assert.equal(Legacy.copydata(0), 0)
    assert.equal(Legacy.copydata(1), 1)

    var d = new Date()
    assert.equal(Legacy.copydata(d).getTime(), d.getTime())

    assert.deepEqual(Legacy.copydata([]), [])
    assert.deepEqual(Legacy.copydata([1, 2, 3]), [1, 2, 3])
    assert.deepEqual(Legacy.copydata([1, ['a', 'b'], 3]), [1, ['a', 'b'], 3])

    assert.deepEqual(Legacy.copydata({}), {})
    assert.deepEqual(Legacy.copydata({ a: 1 }), { a: 1 })
    assert.deepEqual(Legacy.copydata({ a: 1, b: { c: 2 } }), {
      a: 1,
      b: { c: 2 },
    })

    var a = { a: 1 }
    var b = Object.create(a)
    b.b = 2
    assert.deepEqual(Legacy.copydata(b), { b: 2 })

    fin()
  })

  it('recurse', function (t, fin) {
    Legacy.recurse(
      [1, 2, 3],
      function (i, next) {
        next()
      },
      fin,
    )
  })

  it('fail', function (t, fin) {
    var f0 = Legacy.make_legacy_fail({})
    var e0 = f0.call({ log: { error: function () {} } }, { code: 'foo' })
    assert.equal(e0.code, 'foo')
    fin()
  })

  // it('argprops', function (fin) {
  //   var out = Seneca.util.argprops(
  //     { a: 1, b: 2, c: 3 },
  //     { b: 22, c: 33, d: 4 },
  //     { c: 333 },
  //     ['d'],
  //   )
  //   assert.partialDeepStrictEqual(out, { a: 1, b: 22, c: 333 })

  //   out = Seneca.util.argprops({}, { d: 1 }, {}, 'd')
  //   assert.equal('{}', Util.inspect(out))

  //   out = Seneca.util.argprops({}, { d: 1, e: 2 }, {}, 'd, e')
  //   assert.equal('{}', Util.inspect(out))
  //   fin()
  // })

  it('router', function (t, fin) {
    assert.ok(null != Seneca.util.router())
    fin()
  })

  it('no-default-transport', function (t, fin) {
    Seneca({ default_plugins: { transport: false } })
      .test()
      .ready(function () {
        assert.ok(null == this.list_plugins().transport)
        fin()
      })
  })

  // it('meta_arg_remove', function (fin) {
  //   Seneca({ legacy: { meta_arg_remove: true } })
  //     .test(fin)
  //     .add('a:1', (msg, reply, meta) => {
  //       assert.partialDeepStrictEqual(msg, { x: 2 })
  //       assert.equal(typeof reply, 'function')
  //       assert.ok(null == meta)
  //       reply({ y: 3 })
  //     })
  //     .act('a:1', { x: 2 }, (err, out, meta) => {
  //       assert.ifError(err)
  //       assert.partialDeepStrictEqual(out, { y: 3 })
  //       assert.ok(null == meta)
  //       fin()
  //     })
  // })

  it('act_if', function (t, done) {
    var si = Seneca({ log: 'silent', strict: { result: false } })

    si.add({ op: 'foo' }, function (args, next) {
      next(null, 'foo' + args.bar)
    })

    si.act_if(true, { op: 'foo', bar: '1' }, function (err, out) {
      assert.equal(err, null)
      assert.equal('foo1', out)
    })

    si.act_if(false, { op: 'foo', bar: '2' }, function () {
      assert.equal(true, false)
    })

    si.act_if(true, 'op:foo,bar:3', function (err, out) {
      assert.equal(err, null)
      assert.equal('foo3', out)
    })

    try {
      si.act_if({ op: 'foo', bar: '2' }, function () {
        assert.equal(true, false)
      })
      assert.equal(true, false)
    } catch (e) {
      assert.match(e.message, /not of type boolean/)
    }

    si = Seneca({ log: 'test' })
      .add('a:1', function (msg, reply) {
        reply({ b: msg.a + 1 })
      })
      .add('a:2', function (msg, reply) {
        reply({ b: msg.a + 2 })
      })

    si.act_if(true, 'a:1', function (err, out) {
      assert.equal(!err, true)
      assert.equal(2, out.b)

      si.act_if(false, 'a:2', function () {
        assert.equal(true, false)
      })

      process.nextTick(done)
    })
  })
})
