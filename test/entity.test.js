/* Copyright (c) 2013 Richard Rodger */
"use strict";


// mocha entity.test.js

var util   = require('util')

var seneca   = require('..')

var gex     = require('gex')
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

  
  it('mem-store-import-export', function(done){
    var si = seneca()

    // NOTE: zone is NOT saved! by design!

    var x1,x2,x3
    si.make$('a',{x:1}).save$(function(e,o){x1=o})
    si.make$('b','a',{x:2}).save$(function(e,o){x2=o})
    si.make$('c','b','a',{x:3}).save$(function(e,o){x3=o})

    si.act('role:mem-store,cmd:dump',function(e,o){
      assert.ok( gex('{"undefined":{"a":{"*":{"entity$":"-/-/a","x":1,"id":"*"}}},"b":{"a":{"*":{"entity$":"-/b/a","x":2,"id":"*"},"*":{"entity$":"c/b/a","x":3,"id":"*"}}}}').on(JSON.stringify(o)) )
    })

    si.act('role:mem-store,cmd:export',{file:'mem.json'}, function(e){
      assert.isNull(e)

      var si2 = seneca()

      si2.act('role:mem-store,cmd:import',{file:'mem.json'}, function(e){
        assert.isNull(e)

        si2.act('role:mem-store,cmd:dump',function(e,o){
          assert.ok( gex('{"undefined":{"a":{"*":{"entity$":"-/-/a","x":1,"id":"*"}}},"b":{"a":{"*":{"entity$":"-/b/a","x":2,"id":"*"},"*":{"entity$":"c/b/a","x":3,"id":"*"}}}}').on(JSON.stringify(o)) )

          si2.make('a').load$({x:1},function(e,nx1){
            assert.equal('$-/-/a:{id='+x1.id+';x=1}',''+nx1)

            si2.make('a').load$({x:1},function(e,nx1){
              assert.equal('$-/-/a:{id='+x1.id+';x=1}',''+nx1)

              si2.make('b','a').load$({x:2},function(e,nx2){
                assert.equal('$-/b/a:{id='+x2.id+';x=2}',''+nx2)

                si2.make('c', 'b','a').load$({x:3},function(e,nx3){
                  assert.equal('$c/b/a:{id='+x3.id+';x=3}',''+nx3)
            
                  done()
                })
              })
            })
          })
        })
      })
    })
  })

})
