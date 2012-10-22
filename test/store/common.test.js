/* Copyright (c) 2010-2012 Richard Rodger */

var seneca   = require('../../lib/seneca')
var common   = require('../../lib/common')
var shared   = require('./shared')

var assert  = common.assert
var eyes    = common.eyes
var async   = common.async


var scratch = {}
var verify = function(cb,tests){
  return function(error,out) {
    err = error
    if( error ) return cb(err);
    tests(out)
    cb()
  }
}

var si

exports.test = function(config, cb) {
    try {
      si = seneca(
        config,

        function(err,si) {
          assert.isNull(err)

          /* Set up a data set for testing the store.
           * //foo contains [{p1:'v1',p2:'v2'},{p2:'v2'}]
           * zen/moon/bar contains [{..bartemplate..}]
           */
          async.series({
            commonsave1: function(cb) {
              var foo1 = si.make({name$:'foo'}) ///si.make('foo')
              foo1.p1 = 'v1'
        
              foo1.save$( verify(cb, function(foo1){
                assert.isNotNull(foo1.id)
                assert.equal('v1',foo1.p1)
                scratch.foo1 = foo1
              }))
            },


            commonload1: function(cb) {
              scratch.foo1.load$( scratch.foo1.id, verify(cb,function(foo1){
                assert.isNotNull(foo1.id)
                assert.equal('v1',foo1.p1)
                scratch.foo1 = foo1
              }))
            },

            commonsave2: function(cb) {
              scratch.foo1.p1 = 'v1x'
              scratch.foo1.p2 = 'v2'
              scratch.foo1.save$( verify(cb,function(foo1){
                assert.isNotNull(foo1.id)
                assert.equal('v1x',foo1.p1)
                assert.equal('v2',foo1.p2)
                scratch.foo1 = foo1
              })) 
            },

            
            commonload2: function(cb) {
              scratch.foo1.load$( scratch.foo1.id, verify(cb, function(foo1){
                assert.isNotNull(foo1.id)
                assert.equal('v1x',foo1.p1)
                scratch.foo1 = foo1
              }))
            },


            commonsave3: function(cb) {
              scratch.bar = si.make( shared.bartemplate )
              scratch.bar.mark = Math.random()

              scratch.bar.save$( verify(cb, function(bar){
                assert.isNotNull(bar.id)
                shared.barverify(bar)
                scratch.bar = bar
              }))
            },


            commonsave4: function(cb) {
              scratch.foo2 = si.make({name$:'foo'})
              scratch.foo2.p2 = 'v2'
        
              scratch.foo2.save$( verify(cb, function(foo2){
                assert.isNotNull(foo2.id)
                assert.equal('v2',foo2.p2)
                scratch.foo2 = foo2
              }))
            },



            commonquery1: function(cb) {
              scratch.bar.list$({}, verify(cb, function(res){
                assert.ok( 1 <= res.length)
              }))
            },

            commonquery2: function(cb) {
              scratch.foo1.list$({}, verify(cb, function(res){
                assert.ok( 2 <= res.length)
              }))
            },

            commonquery3: function(cb) {
              scratch.bar.list$({id:scratch.bar.id}, verify(cb, function(res){
                assert.equal( 1, res.length )
                shared.barverify(res[0])
              }))
            },

            commonquery4: function(cb) {
              scratch.bar.list$({mark:scratch.bar.mark}, verify(cb, function(res){
                assert.equal( 1, res.length )
                shared.barverify(res[0])
              }))
            },

            commonquery5: function(cb) {
              scratch.foo1.list$({p2:'v2'}, verify(cb, function(res){
                assert.ok( 2 <= res.length )
              }))
            },


            commonquery6: function(cb) {
              scratch.foo1.list$({p2:'v2',p1:'v1x'}, verify(cb, function(res){
                assert.ok( 1 <= res.length )
                res.forEach(function(foo){
                  assert.equal('v2',foo.p2)
                  assert.equal('v1x',foo.p1)
                })
              }))
            },

            // add store specific queries here
            // - string queries
            // - {native$:true, ...}
            // - custom function

            commonremove1: function(cb) {
              var foo = si.make({name$:'foo'})
        
              foo.remove$( {all$:true}, function(err, res){
                assert.isNull(err)
                //assert.ok( 2 <= res.length )
                foo.list$({},verify(cb,function(res){
                  assert.equal(0,res.length)
                }))
              })
            },


            commonremove2: function(cb) {
              scratch.bar.remove$({mark:scratch.bar.mark}, function(err,res){
                assert.isNull(err)
                scratch.bar.list$({mark:scratch.bar.mark}, verify(cb, function(res){
                  assert.equal( 0, res.length )
                }))
              })
            },

          }
          , function(err,out) {
            if( err ) {
              eyes.inspect( err )
            }
            assert.isNull(err)
            si.close()
            if (cb && cb.length > 0){
              var cbarr = (cb.length == 1) ? [] : cb.slice(1, cb.length)
              cb[0]( config, cbarr )
            }
          })
        }
      )
    }
    catch( e ) {
      si && si.close()
      throw e
    }
  }