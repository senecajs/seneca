"use strict";

var assert = require('assert')
var util   = require('util')
var logging = require('../lib/logging')

describe('logging', function() {

  it('makelogrouter.happy', function() {

    var r = logging.makelogrouter({map:[
      {level:'info',type:'init',handler:'A'},
      {level:'info',type:'plugin',plugin:'red',handler:'B'},
    ]})
    //console.log(r.toString())
    assert.equal(''+r,'{"level":{"info":{"type":{"init":{"__data__":"A"}},"plugin":{"red":{"type":{"plugin":{"__data__":"B"}}}}}}}')
  })


  it('makelogrouter.multiplex', function() {
    var r = logging.makelogrouter({map:[
      {level:'info',type:'init',handler:'A'},
      {level:'info',type:'init',handler:'B'},
      {level:'info',type:'init',handler:'C'},
    ]})

    // fix printing for test
    r.add({level:'info',type:'init'},r.find({level:'info',type:'init'}).multiplex)
    //console.log(r.toString())
    assert.equal(''+r,'{"level":{"info":{"type":{"init":{"__data__":["A","B","C"]}}}}}')
  })

    
  it('makelogrouter.multival', function() {
    var r = logging.makelogrouter({map:[
      {level:'info',type:'init,status',handler:'A'}
    ]})
    //console.log(r.toString())
    assert.equal(''+r,'{"level":{"info":{"type":{"init":{"__data__":"A"},"status":{"__data__":"A"}}}}}')
  })


  it('makelogrouter.multimultival', function() {
    var r = logging.makelogrouter({map:[
      {level:'info,debug',type:'init,status',handler:'A'}
    ]})
    //console.log(r.toString())
    assert.equal(''+r,'{"level":{"info":{"type":{"init":{"__data__":"A"},"status":{"__data__":"A"}}},"debug":{"type":{"init":{"__data__":"A"},"status":{"__data__":"A"}}}}}')
  })


  it('makelogrouter.level.all', function() {
    var r = logging.makelogrouter({map:[
      {level:'all',type:'init',handler:'A'}
    ]})
    //console.log(r.toString())
    assert.equal(''+r,'{"level":{"debug":{"type":{"init":{"__data__":"A"}}},"info":{"type":{"init":{"__data__":"A"}}},"warn":{"type":{"init":{"__data__":"A"}}},"error":{"type":{"init":{"__data__":"A"}}},"fatal":{"type":{"init":{"__data__":"A"}}}}}')
  })


  it('makelogrouter.level.upwards', function() {
    var r = logging.makelogrouter({map:[
      {level:'warn+',type:'init',handler:'A'}
    ]})
    //console.log(r.toString())
    assert.equal(''+r,'{"level":{"warn":{"type":{"init":{"__data__":"A"}}},"error":{"type":{"init":{"__data__":"A"}}},"fatal":{"type":{"init":{"__data__":"A"}}}}}')
  })


  it('makelogrouter.level.bad', function() {
    
    try { logging.makelogrouter({map:[ {level:'bad',type:'init',handler:'A'} ]}); assert.fail() }
    catch( e ) { assert.ok( -1 != e.message.indexOf('unknown log level') )}
  })

})
