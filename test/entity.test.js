/* Copyright (c) 2013 Richard Rodger */
"use strict";


// mocha entity.test.js

var util   = require('util')

var seneca   = require('..')

var assert  = require('chai').assert


describe('entity', function(){

  it('make', function(){
    var si = seneca()

    var foo = si.make$('foo')
    assert.equal('-/-/foo',foo.entity$)
    assert.equal('-/-/foo',foo.canon$())
    assert.equal('-/-/foo',foo.canon$({string:true}))
    assert.equal('$-/-/foo',foo.canon$({string$:true}))
    assert.equal(',,foo',''+foo.canon$({array:true}))
    assert.equal(',,foo',''+foo.canon$({array$:true}))
    assert.equal("{ zone: undefined, base: undefined, name: 'foo' }",util.inspect(foo.canon$({object:true})))
    assert.equal("{ 'zone$': undefined, 'base$': undefined, 'name$': 'foo' }",util.inspect(foo.canon$({object$:true})))
    assert.equal(',,foo',''+foo.canon$({}))
  })

})
