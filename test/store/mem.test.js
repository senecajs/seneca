/* Copyright (c) 2010-2012 Richard Rodger */

var seneca   = require('../../lib/seneca')
var common   = require('../../lib/common')

var shared   = require('./shared')

var assert  = common.assert
var eyes    = common.eyes
var async   = common.async



var res
var verify = function(cb,tests){
  return function(err,out) {
    res = out
    if( err ) return cb(err);
    tests()
    cb()
  }
}



module.exports = {

  happy: function() {
    var si

    try {
      si = seneca(
        { plugins:['mem-store'] },

        function(err,si) {
          assert.isNull(err)

          async.series({


            save1: function(cb) {
              var foo = si.make({name$:'foo'})
              foo.p1 = 'v1'
        
              foo.save$( verify(cb, function(){
                assert.isNotNull(res.id)
                assert.equal('v1',res.p1)
              }))
            },


            load1: function(cb) {
              res.load$( res.id, verify(cb,function(){
                assert.isNotNull(res.id)
                assert.equal('v1',res.p1)
              }))
            },

            save2: function(cb) {
              res.p1 = 'v1x'
              res.save$( verify(cb,function(){
                assert.isNotNull(res.id)
                assert.equal('v1x',res.p1)
              })) 
            },

            
            load2: function(cb) {
              res.load$( res.id, verify(cb, function(){
                assert.isNotNull(res.id)
                assert.equal('v1x',res.p1)
              }))
            },


            save3: function(cb) {
              var bar = si.make( shared.bartemplate )
        
              bar.save$( verify(cb, function(){
                assert.isNotNull(res.id)
                shared.barverify(res)
              }))
            },


            list1: function(cb) {
              res.list$({}, verify(cb, function(){
                assert.ok( 1 <= res.length)
              }))
            }

          }, function(err,out) {
            if(err) {
              eyes.inspect(err)
            }
            assert.isNull(err)
            si.close();
          })


          /*

          ent1.load$( ent1.id, function(err,ent1 ) {
            assert.isNull(err)
            util.debug( 'found: '+ent1);
            ent1.p1 = 'v1x';
            
            ent1.save$( function(err,ent1) {
              assert.isNull(err)
              util.debug( 'post save: '+ent1);
              
              ent1.load$( ent1.id, function(err,ent1 ) {
                assert.isNull(err)
                util.debug( 'found: '+ent1);

                ent1.remove$( ent1.id, function(err) {
                  assert.isNull(err)
                  util.debug( 'removed: '+ent1);
                  
                  ent1.load$( ent1.id, function(err,ent1 ) {
                    assert.isNull(err)
                    util.debug( 'found: '+ent1);

                    entity.close$();
                  });
                });
              });
            });
          });
        });
            */
        })
    }
    catch( e ) {
      //eyes.inspect(e)
      si && si.close()
      throw e
    }
  }
}