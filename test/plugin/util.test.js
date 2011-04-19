/* Copyright (c) 2010-2011 Ricebridge */

var common   = require('common')
var Seneca   = require('seneca')

var eyes    = common.eyes
var assert  = common.assert
var gex     = common.gex

var logger = require('../logassert')




module.exports = {
  
  quickcode: function() {
    Seneca.init({logger:logger([]),plugins:['util']},function(err,seneca){
      assert.isNull(err)

      seneca.act({on:'util',cmd:'quickcode'},function(err,code){
        assert.isNull(err)
        assert.equal( 8, code.length )
        assert.isNull( /[ABCDEFGHIJKLMNOPQRSTUVWXYZ]/.exec(code) )
      })
    })
  }
  
}