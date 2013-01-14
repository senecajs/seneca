"use strict";

var assert  = require('chai').assert

var eyes    = require('eyes')
var async   = require('async')
var _       = require('underscore')
var gex     = require('gex')


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



var scratch = {}

var verify = exports.verify = function(cb,tests){
  return function(error,out) {
    if( error ) return cb(error);
    tests(out)
    cb()
  }
}



exports.basictest = function(si,done) {
  si.ready(function(){
    console.log('BASIC')
    assert.isNotNull(si)

    // TODO: test load$(string), remove$(string)


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
          scratch.barq = si.make('zen', 'moon','bar')
          scratch.barq.list$({}, verify(cb, function(res){
            assert.ok( 1 <= res.length)
            barverify(res[0])
          }))
        },

        query2: function(cb) {
          scratch.foo1.list$({}, verify(cb, function(res){
            assert.ok( 2 <= res.length)
          }))
        },

        query3: function(cb) {
          scratch.barq.list$({id:scratch.bar.id}, verify(cb, function(res){
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
        done && done()
      })
  })
}


exports.sqltest = function(si,done) {
  si.ready(function(){
    assert.isNotNull(si)

    var Product = si.make('product')
    var products = []

    async.series(
      {
        setup: function(cb) {

          products.push( Product.make$({name:'apple',price:100}) )
          products.push( Product.make$({name:'pear',price:200}) )

          var i = 0
          function saveproduct(){
            return function(cb) {
              products[i].save$(cb)
              i++
            }
          }

          async.series([
            saveproduct(),
            saveproduct(),
          ],cb)
        },


        query_string: function( cb ) {
          Product.list$("SELECT * FROM product ORDER BY price",function(err,list){
            var s = _.map(list,function(p){return p.toString()}).toString()
            assert.ok( 
              gex("//product:{id=*;name=apple;price=100},//product:{id=*;name=pear;price=200}").on( s ) )
            cb()
          })
        },

        query_params: function( cb ) {
          Product.list$(["SELECT * FROM product WHERE price >= ? AND price <= ?",0,1000],function(err,list){
            var s = _.map(list,function(p){return p.toString()}).toString()
            assert.ok( 
              gex("//product:{id=*;name=apple;price=100},//product:{id=*;name=pear;price=200}").on( s ) )
            cb()
          })
        },

        teardown: function(cb) {
          products.forEach(function(p){
            p.remove$()
          })
          cb()
        }
      },
      function(err,out){
        if( err ) {
          eyes.inspect( err )
        }
        si.__testcount++
        assert.isNull(err)
        done && done()
      }
    )
  })
}

exports.closetest = function(si,testcount,done) {
  var RETRY_LIMIT = 10
  var retryCnt = 0

  function retry(){
    if( testcount <= si.__testcount || retryCnt > RETRY_LIMIT ) {
      console.log('CLOSE')
      si.close()
      done && done()
    } 
    else {
      retryCnt++
      setTimeout(retry, 500);
    }
  }
  retry()
}
