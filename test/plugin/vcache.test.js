/* Copyright (c) 2011 Ricebridge */

var common   = require('common')
var Seneca   = require('seneca')


var assert  = common.assert
var eyes    = common.eyes
var util    = common.util


var logger = require('../logassert')

module.exports = {
  mem: function() {
    Seneca.init({logger:logger([]),entity:'mem:',plugins:['vcache']},function(err,seneca){
      assert.isNull(err)
      assert.equal('vcache~mem',seneca.$.entity.$.store$().name);

      try {

        var ent1 = seneca.make({tenant$:'test',base$:'foo',name$:'bar',p1:'v1'});
        ent1.p2 = 100;
        
        util.debug( 'pre save: '+ent1);
        
        ent1.save$( function(err,ent1) {
          assert.isNull(err)
          util.debug( 'post save: '+ent1);

          ent1.load$( ent1.id, function(err,ent1 ) {
            assert.isNull(err)
            util.debug( 'found: '+ent1);
            ent1.p1 = 'v1x';
            
            ent1.save$( function(err,ent1) {
              assert.isNull(err)
              util.debug( 'post save: '+ent1);
              
              ent1.load$( ent1.id, function(err,ent1 ) {
                assert.isNull(err)
                util.debug( 'found a: '+ent1);

                ent1.load$( ent1.id, function(err,ent1 ) {
                  assert.isNull(err)
                  util.debug( 'found b: '+ent1);

                  ent1.remove$( ent1.id, function(err) {
                    assert.isNull(err)
                    util.debug( 'removed: '+ent1);
                  
                    ent1.load$( ent1.id, function(err,out ) {
                      assert.isNull(err)
                      assert.isNull(out)
                      util.debug( 'not found: '+ent1.id);

                      seneca.close();
                    });
                  });
                });
              });
            });
          });
        });
      }
      catch( e ) {
        util.debug(e);
        seneca.close();
      }
    });
  }
}