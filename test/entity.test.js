/* Copyright (c) 2017 Richard Rodger, MIT License */
'use strict'

const assert = require('node:assert/strict')

const { describe, it } = require('node:test')

var Seneca = require('..')

var parents = (msg) => msg.meta$.parents.map((x) => x[0])

describe('entity', function () {
  it('happy', function (t, fin) {
    Seneca({ tag: 'e0' })
      .test(fin)
      .use('entity')
      .make$('foo', { a: 1 })
      .save$(function (err, foo) {
        assert.ok(null != foo.toString().match(/foo;.*a:1}/))
        fin()
      })
  })

  it('entity-msg', function (t, fin) {
    var si = Seneca().test(fin).use('entity')

    var foo = si.make$('foo', { a: 1 })
    var bar = si.make$('bar', { c: 3 })

    si.add('a:1', function (msg, reply) {
      msg.x = 2
      reply(msg)
    })
      .add('c:3', function (msg, reply) {
        msg.b.y = 3
        reply({ z: msg.b })
      })
      .gate()
      .act(foo, function (err, out) {
        assert.ifError(err)
        assert.ok(null != out)
        assert.partialDeepStrictEqual(out, { a: 1, x: 2 })
        assert.equal(out.canon$(), '-/-/foo')
      })
      .act({ c: 3, b: bar }, function (err, out) {
        assert.ifError(err)
        assert.ok(null != out)
        assert.ok(null != out.z)
        assert.equal(out.z.canon$(), '-/-/bar')
      })
      .ready(fin)
  })

  it('mem-ops', function (t, fin) {
    var si = Seneca({ tag: 'e0' }).test(fin).use('entity')

    si = si.gate()

    var fooent = si.make$('foo')

    fooent.load$(function (err, out) {
      assert.equal(err, null)
      assert.equal(out, null)
    })

    fooent.load$('', function (err, out) {
      assert.equal(err, null)
      assert.equal(out, null)
    })

    fooent.remove$(function (err, out) {
      assert.equal(err, null)
      assert.equal(out, null)
    })

    fooent.remove$('', function (err, out) {
      assert.equal(err, null)
      assert.equal(out, null)
    })

    fooent.list$(function (err, list) {
      assert.equal(err, null)
      assert.equal(0, list.length)
    })

    fooent.list$({ a: 1 }, function (err, list) {
      assert.equal(err, null)
      assert.equal(0, list.length)
    })

    var tmp = {}

    fooent.make$({ a: 1 }).save$(function (err, foo1) {
      assert.equal(err, null)
      assert.ok(foo1.id)
      assert.equal(1, foo1.a)
      tmp.foo1 = foo1
    })

    fooent.list$(function (err, list) {
      assert.equal(err, null)
      assert.equal(1, list.length)
      assert.equal(tmp.foo1.id, list[0].id)
      assert.equal(tmp.foo1.a, list[0].a)
      assert.equal('' + tmp.foo1, '' + list[0])
    })

    fooent.list$({ a: 1 }, function (err, list) {
      assert.equal(err, null)
      assert.equal(1, list.length)
      assert.equal(tmp.foo1.id, list[0].id)
      assert.equal(tmp.foo1.a, list[0].a)
      assert.equal('' + tmp.foo1, '' + list[0])

      si = si.gate()
      fooent = si.make$('foo')

      fooent.load$(tmp.foo1.id, function (err, foo11) {
        assert.equal(err, null)
        assert.equal(tmp.foo1.id, foo11.id)
        assert.equal(tmp.foo1.a, foo11.a)
        assert.equal('' + tmp.foo1, '' + foo11)
        foo11.a = 2
        tmp.foo11 = foo11

        foo11.save$(function (err, foo111) {
          assert.equal(err, null)
          assert.equal(tmp.foo11.id, foo111.id)
          assert.equal(2, foo111.a)
          tmp.foo111 = foo111

          fooent.list$(function (err, list) {
            assert.equal(err, null)
            assert.equal(1, list.length)
            assert.equal(tmp.foo1.id, list[0].id)
            assert.equal(2, list[0].a)
            assert.equal('' + tmp.foo111, '' + list[0])
          })

          fooent.list$({ a: 2 }, function (err, list) {
            assert.equal(err, null)
            assert.equal(1, list.length)
            assert.equal(tmp.foo1.id, list[0].id)
            assert.equal(2, list[0].a)
            assert.equal('' + tmp.foo111, '' + list[0])

            list[0].remove$(function (err) {
              assert.equal(err, null)

              si = si.gate()
              fooent = si.make$('foo')

              fooent.list$(function (err, list) {
                assert.equal(err, null)
                assert.equal(0, list.length)
              })

              fooent.list$({ a: 2 }, function (err, list) {
                assert.equal(err, null)
                assert.equal(0, list.length)
              })

              fooent.make$({ b: 1 }).save$() //function() {
              fooent.make$({ b: 2 }).save$() //function() {

              fooent.list$(function (err, list) {
                assert.equal(err, null)
                assert.equal(2, list.length)
              })

              fooent.list$({ b: 1 }, function (err, list) {
                assert.equal(err, null)
                assert.equal(1, list.length)

                si.close(fin)
              })
            })
          })
        })
      })
    })
  })
})
