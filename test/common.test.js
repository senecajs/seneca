/* Copyright (c) 2014 Richard Rodger, MIT License */
"use strict";


// mocha common.test.js

var util = require('util')

var _ = require('underscore')
var assert  = require('chai').assert


var common = require('../lib/common')


describe('common', function(){

  it('deepextend', function() {
    var aa = {a:{aa:1}}
    var bb = {a:{bb:2}}

    // FIX: make this work too
    //var out = common.deepextend( {},aa,bb,aa)

    var out = common.deepextend( aa,bb,aa)

    assert.equal( 1,out.a.aa )
    assert.equal( 2,out.a.bb )
  })


  it('argpattern', function(){
    assert.equal( 'a:1', common.argpattern({a:1}) )
    assert.equal( 'a:1,b:2', common.argpattern({a:1,b:2}) )
  })


})
