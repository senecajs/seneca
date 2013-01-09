/* Copyright (c) 2010-2013 Richard Rodger */

"use strict";

var common = require('../lib/common')

var assert = common.assert
var _      = common._
var util   = common.util

var seneca = require('..')


describe('seneca.util', function() {
  var si = seneca()

  it('seneca.util.deepextend', function() {
    assert.equal( util.inspect( si.util.deepextend({},{a:1},{b:{c:2}},{b:{c:3,d:4}}) ), "{ a: 1, b: { c: 3, d: 4 } }" )
    assert.equal( util.inspect( si.util.deepextend({},{a:1},{b:[11,22]},{b:[undefined,222,333]}) ), "{ a: 1, b: [ 11, 222, 333 ] }" )
  })

})
