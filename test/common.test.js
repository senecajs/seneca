/* Copyright (c) 2010-2013 Richard Rodger */

"use strict";

var common = require('../lib/common')

var assert = common.assert
var _      = common._


describe('common', function(){
  it('underscore.require', function(){
    var s = '';
    _.times(2,function(){
      s+='a'
    })
    assert.equal('aa',s)
  })
})

