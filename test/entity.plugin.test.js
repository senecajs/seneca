/* Copyright (c) 2010-2015 Richard Rodger */
'use strict'

var Assert = require('assert')
var Gex = require('gex')
var Lab = require('lab')
var Seneca = require('..')

var lab = exports.lab = Lab.script()
var describe = lab.describe
var it = lab.it
var assert = Assert


describe('entity.plugin', function () {
  it('multi', function (done) {
    var si = Seneca(
      {
        plugins: [

          {name: 'mem-store', opts: {
            tag: 'foo',
            map: {
              '//foo': '*'
            }
          }},

          {name: 'mem-store', opts: {
            tag: 'bar',
            map: {
              '//bar': '*'
            }
          }},

          {name: 'mem-store', opts: {
            tag: 'foo',
            map: {
              '//faa': '*'
            }
          }}
        ],
        log: 'silent',
        errhandler: done
      })

    si.ready(function () {
      // mem/foo
      var foo = si.make('foo')
      foo.a = 1

      // mem/bar
      var bar = si.make('bar')
      bar.b = 2

      // also mem/foo instance
      var faa = si.make('faa')
      faa.c = 3

      // handled by default mem instance
      var zen = si.make('zen')
      zen.d = 4

      foo.save$(function (err, foo) {
        assert.equal(err, null)
        assert.ok(Gex('$-/-/foo;id=*;{a:1}').on('' + foo), '' + foo)

        foo.load$({id: foo.id}, function (err, fooR) {
          assert.equal(err, null)
          assert.ok(Gex('$-/-/foo;id=*;{a:1}').on('' + fooR))

          bar.save$(function (err, bar) {
            assert.equal(err, null)
            assert.ok(Gex('$-/-/bar;id=*;{b:2}').on('' + bar), '' + bar)

            bar.load$({id: bar.id}, function (err, barR) {
              assert.equal(err, null)
              assert.ok(Gex('$-/-/bar;id=*;{b:2}').on('' + barR))

              faa.save$(function (err, faa) {
                assert.equal(err, null)
                assert.ok(Gex('$-/-/faa;id=*;{c:3}').on('' + faa), '' + faa)

                faa.load$({id: faa.id}, function (err, faaR) {
                  assert.equal(err, null)
                  assert.ok(Gex('$-/-/faa;id=*;{c:3}').on('' + faaR))

                  zen.save$(function (err, zen) {
                    assert.equal(err, null)
                    assert.ok(Gex('$-/-/zen;id=*;{d:4}').on('' + zen), '' + zen)

                    zen.load$({id: zen.id}, function (err, zenR) {
                      assert.equal(err, null)
                      assert.ok(Gex('$-/-/zen;id=*;{d:4}').on('' + zenR))

                      si.close(done)
                    })
                  })
                })
              })
            })
          })
        })
      })
    })
  })
})
