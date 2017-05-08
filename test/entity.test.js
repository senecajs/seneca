/* Copyright (c) 2017 Richard Rodger, MIT License */
'use strict'

var Lab = require('lab')
var Code = require('code')
var Seneca = require('..')

var lab = (exports.lab = Lab.script())
var describe = lab.describe
var it = lab.it
var expect = Code.expect

var parents = msg => msg.meta$.parents.map(x => x[0])

describe('entity', function() {
  it('happy', function(fin) {
    Seneca({ tag: 'e0' })
      .test(fin)
      .use('entity')
      .make$('foo', {a:1})
      .save$(function(err, foo) {
        console.log(err)
        console.log(''+foo)
        //console.dir(foo,{depth:null})
        fin()
      })
  })
})
