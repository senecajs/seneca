/* Copyright (c) 2010-2015 Richard Rodger */
'use strict'

var assert = require('assert')

var seneca = require('..')

var gex = require('gex')
var Lab = require('lab')

var lab = exports.lab = Lab.script()
var describe = lab.describe
var it = lab.it

describe('entity.plugin', function () {
  it('multi', function (fin) {
    var si = seneca(
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
        errhandler: fin
      })

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
      assert.ok(gex('$-/-/foo;id=*;{a:1}').on('' + foo), '' + foo)

      foo.load$({id: foo.id}, function (err, fooR) {
        assert.equal(err, null)
        assert.ok(gex('$-/-/foo;id=*;{a:1}').on('' + fooR))

        bar.save$(function (err, bar) {
          assert.equal(err, null)
          assert.ok(gex('$-/-/bar;id=*;{b:2}').on('' + bar), '' + bar)

          bar.load$({id: bar.id}, function (err, barR) {
            assert.equal(err, null)
            assert.ok(gex('$-/-/bar;id=*;{b:2}').on('' + barR))

            faa.save$(function (err, faa) {
              assert.equal(err, null)
              assert.ok(gex('$-/-/faa;id=*;{c:3}').on('' + faa), '' + faa)

              faa.load$({id: faa.id}, function (err, faaR) {
                assert.equal(err, null)
                assert.ok(gex('$-/-/faa;id=*;{c:3}').on('' + faaR))

                zen.save$(function (err, zen) {
                  assert.equal(err, null)
                  assert.ok(gex('$-/-/zen;id=*;{d:4}').on('' + zen), '' + zen)

                  zen.load$({id: zen.id}, function (err, zenR) {
                    assert.equal(err, null)
                    assert.ok(gex('$-/-/zen;id=*;{d:4}').on('' + zenR))

                    fin()
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
