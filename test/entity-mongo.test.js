/* Copyright (c) 2010 Ricebridge */

var common   = require('common');
var entity   = require('entity');
require('entity-mongo');

var E = common.E;

var assert  = common.assert
var eyes    = common.eyes
var util    = common.util

var Entity = entity.Entity;


module.exports = {
  happy: function() {
    Entity.init$('mongo://localhost/entity_mongo_test',function(err,entity) {
      assert.isNull(err)
      assert.equal('mongo',entity.$.store$().name);

      try {

        var ent1 = entity.make$({tenant$:'test',base$:'foo',name$:'bar',p1:'v1'});
        ent1.p2 = 100;
        
        util.debug( 'pre save: '+ent1);
        
        ent1.save$( function(err,ent1) {
          E(err);
          util.debug( 'post save: '+ent1);

          ent1.load$( ent1.id, function(err,ent1 ) {
            E(err);
            util.debug( 'found: '+ent1);
            ent1.p1 = 'v1x';
            
            ent1.save$( function(err,ent1) {
              E(err);
              util.debug( 'post save: '+ent1);
              
              ent1.load$( ent1.id, function(err,ent1 ) {
                util.debug( 'found: '+ent1);

                ent1.remove$( ent1.id, function(err) {
                  util.debug( 'removed: '+ent1);
                  
                  ent1.load$( ent1.id, function(err,ent1 ) {
                    util.debug( 'found: '+ent1);

                    entity.close$();
                  });
                });
              });
            });
          });
        });
      }
      catch( e ) {
        util.debug(e);
        entity.close$();
      }
    });
  },


  remote: function() {
    Entity.init$('mongo://username:password@mongodb.example.com:27272/database',function(err,entity) {
      assert.isNull(err)
      assert.equal('mongo',entity.$.store$().name);

      var ent1 = entity.make$({tenant$:'test',base$:'foo',name$:'bar',p1:'v1'});
      ent1.p2 = 100;
      
      util.debug( 'pre save: '+ent1);
      
      ent1.save$( function(err,ent1) {
        assert.isNull(err)
        util.debug( 'post save: '+ent1);
        
        ent1.load$( ent1.id, function(err,ent1 ) {
          assert.isNull(err)
          util.debug( 'found: '+ent1);
          
          entity.close$();
        })
      })
    })
  }

}