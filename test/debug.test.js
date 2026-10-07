/* Copyright (c) 2015 Richard Rodger, MIT License */
'use strict'

var Assert = require('assert')
const { describe } = require('node:test')
var assert = Assert

var Shared = require('./shared')
var it = Shared.make_it()

var Seneca = require('..')

describe('debug', function () {
  // REMOVE after Seneca 4.x
  it('logroute', function (done) {
    var si = Seneca({ log: 'test' }).error(done)

    // test not applicable to new logging in Seneca 3.x
    if (!si.options().legacy.logging) {
      return done()
    }

    var lr0 = si.logroute()
    assert.equal(lr0, 'level=error -> <print>\nlevel=fatal -> <print>')

    si.ready(function () {
      setImmediate(function () {
        si.logroute({
          level: 'DEBUG',
          handler: function () {
            assert.equal('foo', arguments[3])
            done()
          },
        })

        si.log.debug('foo')
      })
    })
  })
})
