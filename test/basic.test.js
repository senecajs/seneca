/* Copyright (c) 2010-2015 Richard Rodger, MIT License */
'use strict'

var Assert = require('assert')
var Lab = require('lab')
var Seneca = require('..')
var Async = require('async')

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

  it('note', function (fin) {
    var si = Seneca({log: 'test'})

    Async.series([
      function (done) {
        si.act('role:util,note:true,cmd:set,key:foo,value:red', done)
      },
      function (done) {
        si.act('role:util,note:true,cmd:get,key:foo', function (err, o) {
          assert.equal(err, null)
          assert.equal('red', o.value)
          done()
        })
      },
      function (done) {
        si.act('role:util,note:true,cmd:list,key:foo', function (err, o) {
          assert.equal(err, null)
          assert.equal(0, o.length)
          done()
        })
      },
      function (done) {
        si.act('role:util,note:true,cmd:push,key:foo,value:aaa', done)
      },
      function (done) {
        si.act('role:util,note:true,cmd:list,key:foo', function (err, o) {
          assert.equal(err, null)
          assert.equal(1, o.length)
          assert.equal('aaa', o[0])
          done()
        })
      },
      function (done) {
        si.act('role:util,note:true,cmd:push,key:foo,value:bbb', done)
      },
      function (done) {
        si.act('role:util,note:true,cmd:list,key:foo', function (err, o) {
          assert.equal(err, null)
          assert.equal(2, o.length)
          assert.equal('aaa', o[0])
          assert.equal('bbb', o[1])
          done()
        })
      },
      function (done) {
        si.act('role:util,note:true,cmd:pop,key:foo', function (err, o) {
          assert.equal(err, null)
          assert.equal('bbb', o.value)
          done()
        })
      },
      function (done) {
        si.act('role:util,note:true,cmd:list,key:foo', function (err, o) {
          assert.equal(err, null)
          assert.equal(1, o.length)
          assert.equal('aaa', o[0])
          done()
        })
      },
      function (done) {
        si.act('role:util,note:true,cmd:pop,key:foo', function (err, o) {
          assert.equal(err, null)
          assert.equal('aaa', o.value)
          done()
        })
      },
      function (done) {
        si.act('role:util,note:true,cmd:list,key:foo', function (err, o) {
          assert.equal(err, null)
          assert.equal(0, o.length)
          done()
        })
      }],
      function (err, results) {
        assert.equal(err, null)

        fin()
      })
  })
})
