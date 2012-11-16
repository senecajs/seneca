/* Copyright (c) 2010-2012 Richard Rodger */

var seneca   = require('../../lib/seneca')
var common   = require('../../lib/common')

var shared   = require('./shared')

var assert  = common.assert
var eyes    = common.eyes
var async   = common.async


var configMemStore = 
{ log:'print',
  plugins:[
    { name:'mem-store' }
  ]
}

var si = seneca(configMemStore)
si.__testcount = 0
var testcount = 0

module.exports = {
  basictest: (testcount++, shared.basictest(si)),
  closetest: shared.closetest(si,testcount)
}