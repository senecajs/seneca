"use strict";

var common   = require('../../lib/common')

var assert  = common.assert
var eyes    = common.eyes
var async   = common.async


var bartemplate = { 
  name$:'bar', 
  base$:'moon', 
  zone$:'zen',  

  str:'aaa',
  int:11,
  dec:33.33,
  bol:false,
  wen:new Date(2020,1,1),
  arr:[2,3],
  obj:{a:1,b:[2],c:{d:3}}
}


var barverify = function(bar) {
  assert.equal('aaa', bar.str)
  assert.equal(11,    bar.int)
  assert.equal(33.33, bar.dec)
  assert.equal(false, bar.bol)
  assert.equal(new Date(2020,1,1).toISOString(), bar.wen.toISOString())
  assert.equal(''+[2,3],''+bar.arr)
  assert.equal(JSON.stringify({a:1,b:[2],c:{d:3}}),JSON.stringify(bar.obj))
}





var assert  = common.assert
var eyes    = common.eyes
var async   = common.async


var scratch = {}

var verify = exports.verify = function(cb,tests){
  return function(error,out) {
    if( error ) return cb(error);
    tests(out)
    cb()
  }
}



exports.basictest = function(si) {
  return function() {
    si.ready(function(){
      console.log('BASIC')
      assert.isNotNull(si)

      /* Set up a data set for testing the store.
       * //foo contains [{p1:'v1',p2:'v2'},{p2:'v2'}]
       * zen/moon/bar contains [{..bartemplate..}]
       */
      async.series(
        {
          save1: function(cb) {
            var foo1 = si.make({name$:'foo'}) ///si.make('foo')
            foo1.p1 = 'v1'
            
            foo1.save$( verify(cb, function(foo1){
              assert.isNotNull(foo1.id)
              assert.equal('v1',foo1.p1)
              scratch.foo1 = foo1
            }))
          },

          load1: function(cb) {
            scratch.foo1.load$( scratch.foo1.id, verify(cb,function(foo1){
              assert.isNotNull(foo1.id)
              assert.equal('v1',foo1.p1)
              scratch.foo1 = foo1
            }))
          },

          save2: function(cb) {
            scratch.foo1.p1 = 'v1x'
            scratch.foo1.p2 = 'v2'
            scratch.foo1.save$( verify(cb,function(foo1){
              assert.isNotNull(foo1.id)
              assert.equal('v1x',foo1.p1)
              assert.equal('v2',foo1.p2)
              scratch.foo1 = foo1
            })) 
          },
          
          load2: function(cb) {
            scratch.foo1.load$( scratch.foo1.id, verify(cb, function(foo1){
              assert.isNotNull(foo1.id)
              assert.equal('v1x',foo1.p1)
              assert.equal('v2',foo1.p2)
              scratch.foo1 = foo1
            }))
          },

          save3: function(cb) {
            scratch.bar = si.make( bartemplate )
            var mark = scratch.bar.mark = Math.random()

            scratch.bar.save$( verify(cb, function(bar){
              assert.isNotNull(bar.id)
              barverify(bar)
              assert.equal( mark, bar.mark )
              scratch.bar = bar
            }))
          },

          save4: function(cb) {
            scratch.foo2 = si.make({name$:'foo'})
            scratch.foo2.p2 = 'v2'
            
            scratch.foo2.save$( verify(cb, function(foo2){
              assert.isNotNull(foo2.id)
              assert.equal('v2',foo2.p2)
              scratch.foo2 = foo2
            }))
          },

          query1: function(cb) {
            scratch.bar.list$({}, verify(cb, function(res){
              assert.ok( 1 <= res.length)
            }))
          },

          query2: function(cb) {
            scratch.foo1.list$({}, verify(cb, function(res){
              assert.ok( 2 <= res.length)
            }))
          },

          query3: function(cb) {
            scratch.bar.list$({id:scratch.bar.id}, verify(cb, function(res){
              assert.equal( 1, res.length )
              barverify(res[0])
            }))
          },

          query4: function(cb) {
            scratch.bar.list$({mark:scratch.bar.mark}, verify(cb, function(res){
              assert.equal( 1, res.length )
              barverify(res[0])
            }))
          },

          query5: function(cb) {
            scratch.foo1.list$({p2:'v2'}, verify(cb, function(res){
              assert.ok( 2 <= res.length )
            }))
          },


          query6: function(cb) {
            scratch.foo1.list$({p2:'v2',p1:'v1x'}, verify(cb, function(res){
              assert.ok( 1 <= res.length )
              res.forEach(function(foo){
                assert.equal('v2',foo.p2)
                assert.equal('v1x',foo.p1)
              })
            }))
          },

          remove1: function(cb) {
            var foo = si.make({name$:'foo'})
            
            foo.remove$( {all$:true}, function(err, res){
              assert.isNull(err)
              //assert.ok( 2 <= res.length )
              foo.list$({},verify(cb,function(res){
                assert.equal(0,res.length)
              }))
            })
          },

          remove2: function(cb) {
            scratch.bar.remove$({mark:scratch.bar.mark}, function(err,res){
              assert.isNull(err)
              scratch.bar.list$({mark:scratch.bar.mark}, verify(cb, function(res){
                assert.equal( 0, res.length )
              }))
            })
          },
        },
        function(err,out) {
          if( err ) {
            eyes.inspect( err )
          }
          si.__testcount++
          assert.isNull(err)
        })
    })
  }
}


exports.closetest = function(si,testcount) {
  return function() {
    function retry(){
      console.log(si.__testcount)
      if( testcount <= si.__testcount ) {
        console.log('CLOSE')
        si.close()
      }
      else setTimeout(retry,500);
    }
    retry()
  }
}
