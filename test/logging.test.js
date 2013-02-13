"use strict";

var assert = require('assert')
var util   = require('util')
var logging = require('../lib/logging')


function fmt(r){ return r.toString().replace(/\s+/g,'') }

describe('logging', function() {

  it('makelogrouter.happy', function() {

    var r = logging.makelogrouter({map:[
      {level:'info',type:'init',handler:'A'},
      {level:'info',type:'plugin',plugin:'red',handler:'B'},
    ]})
    //console.log(fmt(r))
    assert.equal(fmt(r), "{k:'level',v:{info:{k:'plugin',v:{'':{k:'type',v:{init:{d:'A'}}},red:{k:'type',v:{plugin:{d:'B'}}}}}}}")
  })


  it('makelogrouter.multiplex', function() {
    var r = logging.makelogrouter({map:[
      {level:'info',type:'init',handler:'A'},
      {level:'info',type:'init',handler:'B'},
      {level:'info',type:'init',handler:'C'},
    ]})

    // fix printing for test
    r.add({level:'info',type:'init'},r.find({level:'info',type:'init'}).multiplex)
    //console.log(fmt(r))
    assert.equal(fmt(r), "{k:'level',v:{info:{k:'type',v:{init:{d:['A','B','C']}}}}}")
  })

    
  it('makelogrouter.multival.comma', function() {
    var r = logging.makelogrouter({map:[
      {level:'info',type:'init,  status',handler:'A'}
    ]})
    //console.log(fmt(r))
    assert.equal(fmt(r), "{k:'level',v:{info:{k:'type',v:{init:{d:'A'},status:{d:'A'}}}}}")
  })


  it('makelogrouter.multival.space', function() {
    var r = logging.makelogrouter({map:[
      {level:'info',type:'init status',handler:'A'}
    ]})
    //console.log(fmt(r))
    assert.equal(fmt(r), "{k:'level',v:{info:{k:'type',v:{init:{d:'A'},status:{d:'A'}}}}}")
  })


  it('makelogrouter.multimultival', function() {
    var r = logging.makelogrouter({map:[
      {level:'info,debug',type:'init,status',handler:'A'}
    ]})
    //console.log(fmt(r))
    assert.equal(fmt(r), "{k:'level',v:{info:{k:'type',v:{init:{d:'A'},status:{d:'A'}}},debug:{k:'type',v:{init:{d:'A'},status:{d:'A'}}}}}")
  })


  it('makelogrouter.level.all', function() {
    var r = logging.makelogrouter({map:[
      {level:'all',type:'init',handler:'A'}
    ]})
    //console.log(fmt(r))
    assert.equal(fmt(r), "{k:'level',v:{debug:{k:'type',v:{init:{d:'A'}}},info:{k:'type',v:{init:{d:'A'}}},warn:{k:'type',v:{init:{d:'A'}}},error:{k:'type',v:{init:{d:'A'}}},fatal:{k:'type',v:{init:{d:'A'}}}}}")
  })


  it('makelogrouter.level.upwards', function() {
    var r = logging.makelogrouter({map:[
      {level:'warn+',type:'init',handler:'A'}
    ]})
    //console.log(fmt(r))
    assert.equal(fmt(r), "{k:'level',v:{warn:{k:'type',v:{init:{d:'A'}}},error:{k:'type',v:{init:{d:'A'}}},fatal:{k:'type',v:{init:{d:'A'}}}}}")
  })


  it('makelogrouter.level.bad', function() {    
    try { logging.makelogrouter({map:[ {level:'bad',type:'init',handler:'A'} ]}); assert.fail() }
    catch( e ) { assert.ok( -1 != e.message.indexOf('unknown log level') )}
  })
})
