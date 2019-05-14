/* Copyright (c) 2019 Richard Rodger, MIT License */
'use strict'

var tmx = parseInt(process.env.TIMEOUT_MULTIPLIER || 1, 10)

var Util = require('util')

var Lab = require('@hapi/lab')
var Code = require('code')
var Hoek = require('hoek')

var lab = (exports.lab = Lab.script())
var describe = lab.describe
var expect = Code.expect

var Shared = require('./shared')
var it = Shared.make_it(lab)

var Seneca = require('..')

describe('promise', function() {
  /* TODO: enable for Seneca 4
  it('ready', function(fin) {
    (async function work() {
      await Seneca().test().ready()
      fin()
    })()
  })
*/
})
