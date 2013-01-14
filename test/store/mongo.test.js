/* Copyright (c) 2010-2012 Richard Rodger */

"use strict";


var seneca   = require('../..')

var shared = seneca.test.store.shared



var si = seneca()
si.use('mongo-store',{
  name:'senecatest',
  host:'127.0.0.1',
  port:27017
})

si.__testcount = 0
var testcount = 0


describe('mongo', function(){
  it('basic', function(done){
    testcount++
    shared.basictest(si,done)
  })

  it('extra', function(done){
    testcount++
    extratest(si,done)
  })

  it('close', function(done){
    shared.closetest(si,testcount,done)
  })
})



function extratest(si,done) {
  console.log('EXTRA')
  si.__testcount++
  done && done()
}
