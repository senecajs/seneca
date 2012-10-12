/* Copyright (c) 2010-2012 Ricebridge */

var seneca   = require('../../lib/seneca.js')
var common   = require('../../lib/common.js')


var eyes    = common.eyes
var assert  = common.assert
var gex     = common.gex






module.exports = {
  
  quickcode: function() {
    var si = seneca({log:'print',plugins:['util']})

    si.act({role:'util',cmd:'quickcode'},function(err,code){
      assert.isNull(err)
      assert.equal( 8, code.length )
      assert.isNull( /[ABCDEFGHIJKLMNOPQRSTUVWXYZ]/.exec(code) )
    })
  }
  
}