/* Copyright (c) 2010-2011 Ricebridge */

var common   = require('common')

var eyes    = common.eyes
var assert  = common.assert
var _       = common._
var gex     = common.gex


module.exports = {
  underscore: function() {
    var s = '';
    _.times(2,function(){
      s+='a'
    })
    assert.equal('aa',s)
  }
}