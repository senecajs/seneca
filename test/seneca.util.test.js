/* Copyright (c) 2010-2013 Richard Rodger */

"use strict";

var assert = require('chai').assert
var _      = require('underscore')
var util   = require('util')



var seneca = require('..')


describe('seneca.util', function() {
  var si = seneca()

  it('seneca.util.deepextend.happy', function() {
    assert.equal( util.inspect( si.util.deepextend({},{a:1},{b:{c:2}},{b:{c:3,d:4}}) ), "{ a: 1, b: { c: 3, d: 4 } }" )
    assert.equal( util.inspect( si.util.deepextend({},{a:1},{b:[11,22]},{b:[undefined,222,333]}) ), "{ a: 1, b: [ 11, 222, 333 ] }" )
  })

  it('seneca.util.deepextend.types', function() {
    var t1 = {
      s:"s1",
      so:new String('s2'),
      n:1,
      no:new Number(2),
      b:true,
      bo:new Boolean(true),
      do:new Date(),
      f:function(){return "f"},
      re:/a/
    }

    var to = si.util.deepextend({},t1)

    assert.equal(to.s,t1.s)
    assert.equal(to.so,t1.so)
    assert.equal(to.n,t1.n)
    assert.equal(to.no,t1.no)
    assert.equal(to.b,t1.b)
    assert.equal(to.bo,t1.bo)
    assert.equal(to.do,t1.do)
    assert.equal(to.f,t1.f)
    assert.equal(to.re,t1.re)
  })
})
