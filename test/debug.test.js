/* Copyright (c) 2015 Richard Rodger, MIT License */
'use strict'

const assert = require('node:assert/strict')
const { describe, it } = require('node:test')

var Seneca = require('..')

describe('debug', function () {
  // REMOVE after Seneca 4.x
  it('logroute', function (t, done) {
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
