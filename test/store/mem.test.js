/* Copyright (c) 2010-2013 Richard Rodger */

"use strict";


var seneca = require('../..')

var shared = seneca.test.store.shared


var si = seneca()
si.use('mem-store')

si.__testcount = 0
var testcount = 0


describe('mem', function(){
  it('basic', function(done){
    testcount++
    shared.basictest(si,done)
  })

  it('close', function(done){
    shared.closetest(si,testcount,done)
  })
})

