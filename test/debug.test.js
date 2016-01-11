/* Copyright (c) 2015 Richard Rodger, MIT License */
'use strict'

var Assert = require('assert')
var Lab = require('lab')
var Seneca = require('..')

var lab = exports.lab = Lab.script()
var describe = lab.describe
var it = lab.it
var assert = Assert

describe('debug', function () {
  it('logroute', function (done) {
    var si = Seneca({log: 'test'}).error(done)
    var lr0 = si.logroute()
    assert.equal(lr0, 'level=error -> <print>\nlevel=fatal -> <print>')

    si.ready(function () {
      setImmediate(function () {
        si.logroute({level: 'DEBUG', handler: function () {
          assert.equal('foo', arguments[3])
          done()
        }})

        si.log.debug('foo')
      })
    })
  })
})
