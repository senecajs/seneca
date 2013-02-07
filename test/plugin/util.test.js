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

  it('generate_id', function() {
    util.generate_id({},function(err,code){
      assert.isNull(err)
      assert.equal( 6, code.length )
      assert.isNotNull( /^[0-9a-z]{6,6}$/.exec(code) )
    })
    util.generate_id({length:4},function(err,code){
      assert.isNull(err)
      assert.equal( 4, code.length )
      assert.isNotNull( /^[0-9a-z]{4,4}$/.exec(code) )
    })
  })

})