/* Copyright (c) 2013 Richard Rodger */
"use strict";


// mocha entity.test.js

var util   = require('util')

var seneca   = require('..')
var entity   = require('../lib/entity')

var async   = require('async')
var gex     = require('gex')
var assert  = require('chai').assert


var testopts = {test:{silent:true}}


describe('entity', function(){

  it('parsecanon', function(){
    var si = seneca(testopts)
    function def(v,d){return void 0 == v ? d : v}
    function fmt(cn){ return def(cn.zone,'-')+'/'+def(cn.base,'-')+'/'+def(cn.name,'-') }

    assert.equal('-/-/n1',fmt(si.util.parsecanon('n1')))
    assert.equal('-/b1/n1',fmt(si.util.parsecanon('b1/n1')))
    assert.equal('z1/b1/n1',fmt(si.util.parsecanon('z1/b1/n1')))

    assert.equal('-/-/-',fmt(si.util.parsecanon('-')))
    assert.equal('-/-/-',fmt(si.util.parsecanon('-/-')))
    assert.equal('-/-/-',fmt(si.util.parsecanon('-/-/-')))
    assert.equal('-/-/0',fmt(si.util.parsecanon('0')))
    assert.equal('-/0/0',fmt(si.util.parsecanon('0/0')))
    assert.equal('0/0/0',fmt(si.util.parsecanon('0/0/0')))

    var fail
    try { si.util.parsecanon(''); fail = '' } catch(e) {}
    try { si.util.parsecanon('?'); fail = '?' } catch(e) {}
    assert.ok( void 0 == fail, fail )
  })



  it('make', function(){
    var si = seneca(testopts)

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

    var b1_n1 = si.make$('b1/n1')
    assert.equal('-/b1/n1',b1_n1.entity$)
    var z1_b1_n1 = si.make$('z1/b1/n1')
    assert.equal('z1/b1/n1',z1_b1_n1.entity$)

    var pe = si.make({entity$:'-/-/a'})
    assert.equal('-/-/a',pe.canon$({string:true}))
    assert.equal('-/-/a',pe.entity$)
    pe = si.make({entity$:'-/b/a'})
    assert.equal('-/b/a',pe.entity$)
    assert.equal('-/b/a',pe.canon$({string:true}))
    pe = si.make({entity$:'c/b/a'})
    assert.equal('c/b/a',pe.entity$)
    assert.equal('c/b/a',pe.canon$({string:true}))

    var pe = si.make({entity$:{name:'a'}})
    assert.equal('-/-/a',pe.canon$({string:true}))
    assert.equal('-/-/a',pe.entity$)
    pe = si.make({entity$:{base:'b',name:'a'}})
    assert.equal('-/b/a',pe.entity$)
    assert.equal('-/b/a',pe.canon$({string:true}))
    pe = si.make({entity$:{zone:'c',base:'b',name:'a'}})
    assert.equal('c/b/a',pe.entity$)
    assert.equal('c/b/a',pe.canon$({string:true}))

    var ap = si.make$('a',{x:1})
    assert.equal('-/-/a',ap.entity$)
    ap = si.make$('b','a',{x:1})
    assert.equal('-/b/a',ap.entity$)
    ap = si.make$('c','b','a',{x:1})
    assert.equal('c/b/a',ap.entity$)

    var esc1 = si.make$('esc',{x:1,y_$:2})
    assert.equal( esc1.toString(), '$-/-/esc:{id=;x=1;y=2}' )
  })



  it('toString', function(){
    var si = seneca(testopts)

    var f1 = si.make$('foo')
    f1.a = 1
    assert.equal("$-/-/foo:{id=;a=1}",''+f1)

    var f2 = si.make$('foo')
    f2.a = 2
    f2.b = 3
    assert.equal("$-/-/foo:{id=;a=2;b=3}",''+f2)

    var f3 = f1.make$({c:4})
    f3.d = 5
    assert.equal("$-/-/foo:{id=;c=4;d=5}",''+f3)
  })


  it('isa', function(){
    var si = seneca(testopts)

    var f1 = si.make$('foo')

    assert.ok( f1.canon$({isa:'foo'}) )
    assert.ok( f1.canon$({isa:[null,null,'foo']}) )
    assert.ok( f1.canon$({isa:{name:'foo'}}) )

    assert.ok( !f1.canon$({isa:'bar'}) )
    assert.ok( !f1.canon$({isa:[null,null,'bar']}) )
    assert.ok( !f1.canon$({isa:{name:'bar'}}) )


    var f2 = si.make$('boo/foo')

    assert.ok( f2.canon$({isa:'boo/foo'}) )
    assert.ok( f2.canon$({isa:[null,'boo','foo']}) )
    assert.ok( f2.canon$({isa:{base:'boo',name:'foo'}}) )

    assert.ok( !f2.canon$({isa:'far/bar'}) )
    assert.ok( !f2.canon$({isa:[null,'far','bar']}) )
    assert.ok( !f2.canon$({isa:{base:'far',name:'bar'}}) )


    var f3 = si.make$('zoo/boo/foo')

    assert.ok( f3.canon$({isa:'zoo/boo/foo'}) )
    assert.ok( f3.canon$({isa:['zoo','boo','foo']}) )
    assert.ok( f3.canon$({isa:{zone:'zoo',base:'boo',name:'foo'}}) )

    assert.ok( !f3.canon$({isa:'zar/far/bar'}) )
    assert.ok( !f3.canon$({isa:['zar','far','bar']}) )
    assert.ok( !f3.canon$({isa:{zone:'zar',base:'far',name:'bar'}}) )

  })

  
  it('mem-store-import-export', function(done){
    var si = seneca(testopts)


    // NOTE: zone is NOT saved! by design!

    var x1,x2,x3

    async.series([
      function(next){ si.make$('a',{x:1}).save$(function(e,o){x1=o;next()})},
      function(next){ si.make$('b','a',{x:2}).save$(function(e,o){x2=o;next()})},
      function(next){ si.make$('c','b','a',{x:3}).save$(function(e,o){x3=o;next()})},

      function(next){
        si.act('role:mem-store,cmd:dump',function(e,o){
          var t = gex(
            '{"undefined":{"a":{"*":{"entity$":"-/-/a","x":1,"id":"*"}}},"b":{"a":{"*":{"entity$":"-/b/a","x":2,"id":"*"},"*":{"entity$":"c/b/a","x":3,"id":"*"}}}}'
          ).on(JSON.stringify(o))
          assert.ok(t)
          next(e)
        })
      },

      function(next){
        si.act('role:mem-store,cmd:export',{file:'mem.json'}, function(e){
          assert.isNull(e)

          var si2 = seneca(testopts)

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
                      
                      next()
                    })
                  })
                })
              })
            })
          })
        })
      }

    ], function(err){
        done(err)
      }
    )
  })


  it('close', function(done){
    var si = seneca({log:'silent'})

    var tmp = {s0:0,s1:0,s2:0}

    function noopcb( args, cb ) { cb() }

    si.use(function store0(){
      this.store.init(this,{},{
        save:noopcb,load:noopcb,list:noopcb,remove:noopcb,native:noopcb,
        close: function( args, cb ) {
          tmp.s0++
          cb()
        }
      })
    })

    si.use(function store1(){
      this.store.init(this,{},{
        save:noopcb,load:noopcb,list:noopcb,remove:noopcb,native:noopcb, nick:'11',
        close: function( args, cb ) {
          tmp.s1++
          cb()
        }
      })
    })

    si.use(function store2(){
      this.store.init(this,{map:{'foo':'*'}},{
        save:noopcb,load:noopcb,list:noopcb,remove:noopcb,native:noopcb, nick:'22',
        close: function( args, cb ) {
          tmp.s2++
          cb()
        }
      })
    })

    si.close(function( err ){
      assert.isNull(err)

      //console.log(tmp)

      // close gets called on all of them
      // any store may have open db connections
      assert.equal(1,tmp.s0)
      assert.equal(1,tmp.s1)
      assert.equal(1,tmp.s2)

      done()
    })
  })

})
