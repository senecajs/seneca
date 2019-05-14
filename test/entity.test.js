/* Copyright (c) 2017 Richard Rodger, MIT License */
'use strict'

var Assert = require('assert')

var Lab = require('@hapi/lab')
var Code = require('code')

var lab = (exports.lab = Lab.script())
var describe = lab.describe
var expect = Code.expect

var Shared = require('./shared')
var it = Shared.make_it(lab)

var Seneca = require('..')

var parents = msg => msg.meta$.parents.map(x => x[0])

describe('entity', function() {
  it('happy', function(fin) {
    Seneca({ tag: 'e0' })
      .test(fin)
      .use('entity')
      .make$('foo', { a: 1 })
      .save$(function(err, foo) {
        expect(foo.toString().match(/foo;.*a:1}/)).exists()
        fin()
      })
  })

  it('entity-msg', function(fin) {
    var si = Seneca()
      .test(fin)
      .use('entity')

    var foo = si.make$('foo', { a: 1 })
    var bar = si.make$('bar', { c: 3 })

    si.add('a:1', function(msg, reply) {
      msg.x = 2
      reply(msg)
    })
      .add('c:3', function(msg, reply) {
        msg.b.y = 3
        reply({ z: msg.b })
      })
      .gate()
      .act(foo, function(err, out) {
        expect(err).not.exist()
        expect(out).exist()
        expect(out).includes({ a: 1, x: 2 })
        expect(out.canon$()).equal('-/-/foo')
      })
      .act({ c: 3, b: bar }, function(err, out) {
        expect(err).not.exist()
        expect(out).exist()
        expect(out.z).exist()
        expect(out.z.canon$()).equal('-/-/bar')
      })
      .ready(fin)
  })

  it('mem-ops', function(fin) {
    var si = Seneca({ tag: 'e0' })
      .test(fin)
      .use('entity')

    si = si.gate()

    var fooent = si.make$('foo')

    fooent.load$(function(err, out) {
      Assert.equal(err, null)
      Assert.equal(out, null)
    })

    fooent.load$('', function(err, out) {
      Assert.equal(err, null)
      Assert.equal(out, null)
    })

    fooent.remove$(function(err, out) {
      Assert.equal(err, null)
      Assert.equal(out, null)
    })

    fooent.remove$('', function(err, out) {
      Assert.equal(err, null)
      Assert.equal(out, null)
    })

    fooent.list$(function(err, list) {
      Assert.equal(err, null)
      Assert.equal(0, list.length)
    })

    fooent.list$({ a: 1 }, function(err, list) {
      Assert.equal(err, null)
      Assert.equal(0, list.length)
    })

    var tmp = {}

    fooent.make$({ a: 1 }).save$(function(err, foo1) {
      Assert.equal(err, null)
      Assert.ok(foo1.id)
      Assert.equal(1, foo1.a)
      tmp.foo1 = foo1
    })

    fooent.list$(function(err, list) {
      Assert.equal(err, null)
      Assert.equal(1, list.length)
      Assert.equal(tmp.foo1.id, list[0].id)
      Assert.equal(tmp.foo1.a, list[0].a)
      Assert.equal('' + tmp.foo1, '' + list[0])
    })

    fooent.list$({ a: 1 }, function(err, list) {
      Assert.equal(err, null)
      Assert.equal(1, list.length)
      Assert.equal(tmp.foo1.id, list[0].id)
      Assert.equal(tmp.foo1.a, list[0].a)
      Assert.equal('' + tmp.foo1, '' + list[0])

      si = si.gate()
      fooent = si.make$('foo')

      fooent.load$(tmp.foo1.id, function(err, foo11) {
        Assert.equal(err, null)
        Assert.equal(tmp.foo1.id, foo11.id)
        Assert.equal(tmp.foo1.a, foo11.a)
        Assert.equal('' + tmp.foo1, '' + foo11)
        foo11.a = 2
        tmp.foo11 = foo11

        foo11.save$(function(err, foo111) {
          Assert.equal(err, null)
          Assert.equal(tmp.foo11.id, foo111.id)
          Assert.equal(2, foo111.a)
          tmp.foo111 = foo111

          fooent.list$(function(err, list) {
            Assert.equal(err, null)
            Assert.equal(1, list.length)
            Assert.equal(tmp.foo1.id, list[0].id)
            Assert.equal(2, list[0].a)
            Assert.equal('' + tmp.foo111, '' + list[0])
          })

          fooent.list$({ a: 2 }, function(err, list) {
            Assert.equal(err, null)
            Assert.equal(1, list.length)
            Assert.equal(tmp.foo1.id, list[0].id)
            Assert.equal(2, list[0].a)
            Assert.equal('' + tmp.foo111, '' + list[0])

            list[0].remove$(function(err) {
              Assert.equal(err, null)

              si = si.gate()
              fooent = si.make$('foo')

              fooent.list$(function(err, list) {
                Assert.equal(err, null)
                Assert.equal(0, list.length)
              })

              fooent.list$({ a: 2 }, function(err, list) {
                Assert.equal(err, null)
                Assert.equal(0, list.length)
              })

              fooent.make$({ b: 1 }).save$() //function() {
              fooent.make$({ b: 2 }).save$() //function() {

              fooent.list$(function(err, list) {
                Assert.equal(err, null)
                Assert.equal(2, list.length)
              })

              fooent.list$({ b: 1 }, function(err, list) {
                Assert.equal(err, null)
                Assert.equal(1, list.length)

                si.close(fin)
              })
            })
          })
        })
      })
    })
  })
})
