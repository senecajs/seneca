/* Copyright (c) 2010-2015 Richard Rodger, MIT License */
'use strict'

var Assert = require('assert')
var Lab = require('lab')
var Seneca = require('../..')

var lab = exports.lab = Lab.script()
var describe = lab.describe
var it = lab.it
var assert = Assert

describe('basic', function () {
  it('action.generate_id', function (fin) {
    var si = Seneca({log: 'test'}).error(fin)

    // .pin call can happen before ready, but will only be usable after ready
    var basic = si.pin({role: 'basic', cmd: '*'})

    si.ready(function () {
      basic.generate_id({}, function (err, code) {
        assert.equal(err, null)
        assert.equal(6, code.length)
        assert.ok(/^[0-9a-z]{6,6}$/.exec(code))

        basic.generate_id({length: 4}, function (err, code) {
          assert.equal(err, null)
          assert.equal(4, code.length)
          assert.ok(/^[0-9a-z]{4,4}$/.exec(code))

          fin()
        })
      })
    })
  })

  it('ensure_entity', function (fin) {
    var si = Seneca({log: 'test'})
    si.options({errhandler: fin})

    var foo_ent = si.make$('util_foo')
    var fooid = {}
    var foos = []
    foo_ent.make$({a: 1}).save$(function (e, o) {
      fooid[1] = o.id; foos.push(o)

      foo_ent.make$({a: 2}).save$(function (e, o) {
        fooid[2] = o.id; foos.push(o)

        si.add({bar: 1, cmd: 'A'}, function (args, done) {
          var foo = args.foo
          foo.a = 10 * foo.a
          foo.save$(done)
        })

        si.act({
          role: 'util', cmd: 'ensure_entity',
          pin: {bar: 1, cmd: '*'},
          entmap: { foo: foo_ent }
        }, function () {
          // just use ent if given
          si.act({bar: 1, cmd: 'A', foo: foos[0]}, function (e, o) {
            assert.equal(10, o.a)

            // load from id
            si.act({bar: 1, cmd: 'A', foo: fooid[1]}, function (e, o) {
              assert.equal(100, o.a)

              // initialize from data
              si.act({bar: 1, cmd: 'A', foo: foos[1].data$()}, function (e, o) {
                assert.equal(20, o.a)

                fin()
              })
            })
          })
        })
      })
    })
  })

  it('note', function (fin) {
    var si = Seneca({log: 'test'})
    si
      .start(fin)
      .wait('role:util,note:true,cmd:set,key:foo,value:red')

      .wait('role:util,note:true,cmd:get,key:foo')
      .step(function (o) {
        assert.equal('red', o.value)
        return true
      })

      .wait('role:util,note:true,cmd:list,key:foo')
      .step(function (o) {
        assert.equal(0, o.length)
        return true
      })

      .wait('role:util,note:true,cmd:push,key:foo,value:aaa')

      .wait('role:util,note:true,cmd:list,key:foo')
      .step(function (o) {
        assert.equal(1, o.length)
        assert.equal('aaa', o[0])
      })

      .wait('role:util,note:true,cmd:push,key:foo,value:bbb')

      .wait('role:util,note:true,cmd:list,key:foo')
      .step(function (o) {
        assert.equal(2, o.length)
        assert.equal('aaa', o[0])
        assert.equal('bbb', o[1])
      })

      .wait('role:util,note:true,cmd:pop,key:foo')
      .step(function (o) {
        assert.equal('bbb', o.value)
      })

      .wait('role:util,note:true,cmd:list,key:foo')
      .step(function (o) {
        assert.equal(1, o.length)
        assert.equal('aaa', o[0])
      })

      .wait('role:util,note:true,cmd:pop,key:foo')
      .step(function (o) {
        assert.equal('aaa', o.value)
      })

      .wait('role:util,note:true,cmd:list,key:foo')
      .step(function (o) {
        assert.equal(0, o.length)
      })

      .end()
  })
})
