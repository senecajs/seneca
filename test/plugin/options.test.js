/* Copyright (c) 2014-2015 Richard Rodger, MIT License */
'use strict'

var Assert = require('assert')
var Lab = require('lab')
var Seneca = require('../..')

var lab = exports.lab = Lab.script()
var describe = lab.describe
var it = lab.it
var assert = Assert

describe('plugin.options', function () {
  it('happy', function (done) {
    var si = Seneca({log: 'silent'})

    si.use('options', {a: 1})
    assert.equal(1, si.export('options').a)

    si.use('options', require('./options.file.js'))
    assert.equal(2, si.export('options').b)
    done()
  })
})
