/* Copyright (c) 2014 Richard Rodger, MIT License */
"use strict";


// mocha common.test.js

var util = require('util')
var assert = require('assert')

var Lab = require('lab')

var common = require('../lib/common')


var lab      = exports.lab = Lab.script()
var describe = lab.describe
var it       = lab.it


describe('common', function(){


  it('deepextend-empty', function(done) {

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

    done()
  })


  it('deepextend-dups', function(done) {
    var aa = {a:{aa:1}}
    var bb = {a:{bb:2}}

    var out = common.deepextend(aa,bb,aa)

    assert.equal( 1,out.a.aa )
    assert.equal( 2,out.a.bb )

    out = common.deepextend( {},aa,bb,aa)
    assert.equal( 1,out.a.aa )
    assert.equal( 2,out.a.bb )
    done()
  })


  it('deepextend-objs', function(done) {
    var d = {
      s:'s',
      n:100,
      d:new Date(),
      f:function(){},
      a:arguments,
      r:/a/,
      b:Buffer('b')
    }
    var o = common.deepextend({},d)
    assert.equal(''+o,''+d)
    done()
  })


  it('argpattern', function(done){
    assert.equal( 'a:1', common.argpattern({a:1}) )
    assert.equal( 'a:1,b:2', common.argpattern({a:1,b:2}) )
    assert.equal( 'a:1,b:2', common.argpattern({a:1,b:2,c$:3}) )
    done()
  })


})
