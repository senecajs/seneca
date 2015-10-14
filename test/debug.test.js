/* Copyright (c) 2015 Richard Rodger, MIT License */
'use strict'

var assert = require('assert')
var lab = exports.lab = require('lab').script()
var seneca = require('..')
var testopts = {log: 'test'}

process.setMaxListeners(0)

lab.experiment('debug', function () {
  lab.test('logroute', function (done) {
    var si = seneca(testopts).error(done)
    var lr0 = si.logroute()
    assert.equal(lr0, 'level=error -> <print>\nlevel=fatal -> <print>')

    si.ready(function () {
      setImmediate(function () {
        si.logroute({level: 'DEBUG', handler: function () {
            // console.log(arguments)
          assert.equal('foo', arguments[3])
          done()
        }})

        si.log.debug('foo')
      })
    })
  })
})
