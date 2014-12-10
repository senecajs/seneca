"use strict";

var assert = require('assert')
var util   = require('util')
var logging = require('../lib/logging')


function fmt(r){ return r.toString(true).replace(/\s+/g,'') }

describe('logging', function() {

  it('makelogrouter.happy', function() {

    var r = logging.makelogrouter({map:[
      {level:'info',type:'init',handler:'A'},
      {level:'info',type:'plugin',plugin:'red',handler:'B'},
    ]})
    //console.log(fmt(r))
    assert.equal(fmt(r), "level:info->plugin:red->type:plugin-><B>*->type:init-><A>")
  })


  it('makelogrouter.short', function() {
    var r = logging.makelogrouter('level:info,type:plugin')
    //console.log(fmt(r))
    assert.equal(fmt(r), "level:info->type:plugin-><print>")

    r = logging.makelogrouter(['level:info,type:plugin','level:debug,type:act'])
    //console.log(fmt(r))
    assert.equal(fmt(r), "level:info->type:plugin-><print>debug->type:act-><print>")
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
    assert.equal(fmt(r), "level:info->type:init-><A,B,C>")
  })

    
  it('makelogrouter.multival.comma', function() {
    var r = logging.makelogrouter({map:[
      {level:'info',type:'init,  status',handler:'A'}
    ]})
    //console.log(fmt(r))
    assert.equal(fmt(r), "level:info->type:init-><A>status-><A>")
  })


  it('makelogrouter.multival.space', function() {
    var r = logging.makelogrouter({map:[
      {level:'info',type:'init status',handler:'A'}
    ]})
    //console.log(fmt(r))
    assert.equal(fmt(r), "level:info->type:init-><A>status-><A>")
  })


  it('makelogrouter.multimultival', function() {
    var r = logging.makelogrouter({map:[
      {level:'info,debug',type:'init,status',handler:'A'}
    ]})
    //console.log(fmt(r))
    assert.equal(fmt(r), "level:info->type:init-><A>status-><A>debug->type:init-><A>status-><A>")
  })


  it('makelogrouter.level.all', function() {
    var r = logging.makelogrouter({map:[
      {level:'all',type:'init',handler:'A'}
    ]})
    //console.log(fmt(r))
    assert.equal(fmt(r), "level:debug->type:init-><A>info->type:init-><A>warn->type:init-><A>error->type:init-><A>fatal->type:init-><A>")
  })


  it('makelogrouter.level.upwards', function() {
    var r = logging.makelogrouter({map:[
      {level:'warn+',type:'init',handler:'A'}
    ]})
    //console.log(fmt(r))
    assert.equal(fmt(r), "level:warn->type:init-><A>error->type:init-><A>fatal->type:init-><A>")
  })


  it('makelogrouter.level.bad', function() {    
    try { logging.makelogrouter({map:[ {level:'bad',type:'init',handler:'A'} ]}); assert.fail() }
    catch( e ) { 
      assert.equal('invalid_log_level',e.code)
    }
  })


  


})
