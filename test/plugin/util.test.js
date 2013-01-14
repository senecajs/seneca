/* Copyright (c) 2010-2013 Ricebridge */


"use strict";

var assert = require('chai').assert

var seneca = require('../..')


var si = seneca()
si.use('util')


var util = si.pin({role:'util',cmd:'*'})


describe('util', function() {

  it('quickcode', function() {
    util.quickcode({},function(err,code){
      assert.isNull(err)
      assert.equal( 8, code.length )
      assert.isNull( /[ABCDEFGHIJKLMNOPQRSTUVWXYZ]/.exec(code) )
    })
  })
})