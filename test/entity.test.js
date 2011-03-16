/* Copyright (c) 2010 Ricebridge */

var common   = require('common');
var entity   = require('entity');

var E = common.E;

var util    = common.util
var eyes    = common.eyes
var assert  = common.assert
var gex     = common.gex

var Entity = entity.Entity;


module.exports = {
  mem: function() {
    Entity.init$('mem:',function(err,entity) {
      assert.isNull(err)
      assert.equal('mem',entity.$.store$.name);

      var ent1 = entity.make$({tenant$:'test',base$:'foo',name$:'bar',p1:'v1'});
      ent1.p2 = 100;
    
      util.debug( 'pre save: '+ent1);
    
      ent1.save$( function(err,ent1) {
        util.debug( 'err: '+JSON.stringify(err)+' post save: '+ent1);
        assert.ok( gex('test/foo/bar:{id=*,p1=v1,p2=100}').on(''+ent1) )

        ent1.find$( ent1.id, function(err,ent1 ) {
          util.debug( 'err: '+err+' found: '+ent1);
          assert.ok( gex('test/foo/bar:{id=*,p1=v1,p2=100}').on(''+ent1) )
          ent1.p1 = 'v1x';
    
          ent1.save$( function(err,ent1) {
            util.debug( 'post save: '+ent1);
            assert.ok( gex('test/foo/bar:{id=*,p1=v1x,p2=100}').on(''+ent1) )

            ent1.find$( ent1.id, function(err,ent1 ) {
              util.debug( 'found: '+ent1);
              assert.ok( gex('test/foo/bar:{id=*,p1=v1x,p2=100}').on(''+ent1) )

              ent1.remove$( ent1.id, function(err) {
                util.debug( 'removed: '+ent1);
                assert.isNull(err)
    
                ent1.find$( ent1.id, function(err,ent1) {
                  util.debug( 'found: '+ent1);
                  assert.isNull(err)
                  assert.isUndefined(ent1)
                });
              });
            });
          });
        });
      });
    });
  },

}