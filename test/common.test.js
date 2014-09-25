/* Copyright (c) 2014 Richard Rodger, MIT License */
"use strict";


// mocha common.test.js

var util = require('util')

var _ = require('underscore')
var assert  = require('chai').assert


var common = require('../lib/common')


describe('common', function(){


  it('deepextend-empty', function() {

    assert.equal(null, common.deepextend({}).a )

    assert.equal(1, common.deepextend({a:1}).a )

    assert.equal(1, common.deepextend({},{a:1}).a )
    assert.equal(1, common.deepextend({a:1},{}).a )




    assert.equal(1, common.deepextend({},{a:1},{b:2}).a )
    assert.equal(2, common.deepextend({},{a:1},{b:2}).b )

    assert.equal(1, common.deepextend({a:1},{b:2},{}).a )
    assert.equal(2, common.deepextend({a:1},{b:2},{}).b )

    assert.equal(1, common.deepextend({},{a:1},{b:2},{}).a )
    assert.equal(2, common.deepextend({},{a:1},{b:2},{}).b )

    assert.equal(1, common.deepextend({},{a:1},{},{b:2},{}).a )
    assert.equal(2, common.deepextend({},{a:1},{},{b:2},{}).b )


    assert.equal(1, common.deepextend({a:{b:1}},{}).a.b )
    assert.equal(1, common.deepextend({},{a:{b:1}}).a.b )


    assert.equal(1, common.deepextend({a:{b:1}},{c:{d:2}},{}).a.b )
    assert.equal(2, common.deepextend({a:{b:1}},{c:{d:2}},{}).c.d )

    assert.equal(1, common.deepextend({},{a:{b:1}},{c:{d:2}}).a.b )
    assert.equal(2, common.deepextend({},{a:{b:1}},{c:{d:2}}).c.d )

    assert.equal(1, common.deepextend({},{a:{b:1}},{c:{d:2}},{}).a.b )
    assert.equal(2, common.deepextend({},{a:{b:1}},{c:{d:2}},{}).c.d )

    assert.equal(1, common.deepextend({},{a:{b:1}},{},{c:{d:2}},{}).a.b )
    assert.equal(2, common.deepextend({},{a:{b:1}},{},{c:{d:2}},{}).c.d )


    assert.equal(1, common.deepextend({a:{b:1}},{a:{c:2}},{}).a.b )
    assert.equal(2, common.deepextend({a:{b:1}},{a:{c:2}},{}).a.c )

    assert.equal(1, common.deepextend({},{a:{b:1}},{a:{c:2}}).a.b )
    assert.equal(2, common.deepextend({},{a:{b:1}},{a:{c:2}}).a.c )

    assert.equal(1, common.deepextend({},{a:{b:1}},{a:{c:2}},{}).a.b )
    assert.equal(2, common.deepextend({},{a:{b:1}},{a:{c:2}},{}).a.c )

    assert.equal(1, common.deepextend({},{a:{b:1}},{},{a:{c:2}},{}).a.b )
    assert.equal(2, common.deepextend({},{a:{b:1}},{},{a:{c:2}},{}).a.c )


    assert.equal(1, common.deepextend({a:{b:1}},{a:{b:1}},{}).a.b )

    assert.equal(2, common.deepextend({},{a:{b:1}},{a:{b:2}}).a.b )

    assert.equal(2, common.deepextend({},{a:{b:1}},{a:{b:2}},{}).a.b )

    assert.equal(2, common.deepextend({},{a:{b:1}},{},{a:{b:2}},{}).a.b )

  })


  it('deepextend-dups', function() {
    var aa = {a:{aa:1}}
    var bb = {a:{bb:2}}

    var out = common.deepextend(aa,bb,aa)

    assert.equal( 1,out.a.aa )
    assert.equal( 2,out.a.bb )


    // FIX: make this work too
    out = common.deepextend( {},aa,bb,aa)
    assert.equal( 1,out.a.aa )
    assert.equal( 2,out.a.bb )
  })


  it('argpattern', function(){
    assert.equal( 'a:1', common.argpattern({a:1}) )
    assert.equal( 'a:1,b:2', common.argpattern({a:1,b:2}) )
    assert.equal( 'a:1,b:2', common.argpattern({a:1,b:2,c$:3}) )
  })


})
