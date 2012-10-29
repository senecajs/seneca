/* Copyright (c) 2010-2012 Richard Rodger */

var common   = require('../../lib/common')
var seneca   = require('../../lib/seneca')
var shared   = require('./shared')


var assert  = common.assert
var eyes    = common.eyes
var async   = common.async


var config = 
{ log:'print',
  plugins:[
    { name:'mongo-store', 
      opts:{
        name:'senecatest',
        host:'127.0.0.1',
        port:27017
      } 
    }
  ]
}


var si = seneca(config)
si.__testcount = 0
var testcount = 0

module.exports = {
  basictest: (testcount++, shared.basictest(si)),
  extratest: (testcount++, extratest(si)),
  closetest: shared.closetest(si,testcount)
}



function extratest(si) {
  console.log('EXTRA')
  si.__testcount++
}