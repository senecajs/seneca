/* Copyright (c) 2019 Richard Rodger, MIT License */
'use strict'

var tmx = parseInt(process.env.TIMEOUT_MULTIPLIER || 1, 10)

var Util = require('util')

const Lab = require('@hapi/lab')
const Code = require('@hapi/code')

var lab = (exports.lab = Lab.script())
var describe = lab.describe
var expect = Code.expect

var Shared = require('./shared')
var it = Shared.make_it(lab)

var Seneca = require('..')

describe('promise', function () {
  /* TODO: enable for Seneca 4
  it('ready', function(fin) {
    (async function work() {
      await Seneca().test().ready()
      fin()
    })()
  })
  */


  it('post', async function() {
    let s0 = Seneca().test().add('a:1',(msg,reply)=>reply({x:msg.x}))
    expect(await s0.post('a:1,x:1')).equal({x:1})
    expect(await s0.post('a:1,x:2')).equal({x:2})
    expect(await s0.post('a:1,x:3')).equal({x:3})
  })
})
