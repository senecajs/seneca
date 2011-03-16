/* Copyright (c) 2010 Ricebridge */

var common   = require('common');
var seneca   = require('seneca');

var E = common.E;

var eyes    = common.eyes
var assert  = common.assert
var gex     = common.gex

var Seneca = seneca.Seneca;
var Entity = seneca.Entity;

var logger = require('./logassert')



module.exports = {

  logging: function() {
    var log = logger(['start','close',['entity','mem','close']])
    var seneca = new Seneca({logger:log});
    seneca.close()
    assert.equal(3,log.index())

    try {
      seneca = new Seneca({logger:logger(['bad'])});
    }
    catch( e ) {
      assert.equal( 'bad != start', e.actual )
    }

    log = logger(['start',['custom','foo']])
    seneca = new Seneca({logger:log});
    seneca.log('foo')
    assert.equal(2,log.index())
  },


  savefind: function() {

    // default memstore
    var log = logger([
      'start',
      ['entity','mem','make'],
      ['entity','mem','save','in'],
      ['entity','mem','save','out'],
      ['entity','mem','make'],
      ['entity','mem','find'],
    ])
    var seneca = new Seneca({logger:log})
    var entity = seneca.entity

    var ent1 = entity.make$({tenant$:'ten',base$:'foo',name$:'bar',p1:'v1'})
    ent1.p2 = 100;
    
    ent1.save$( function(err,ent1) {
      assert.isNull(err)
      assert.ok( gex('ten/foo/bar:{id=*,p1=v1,p2=100}').on(''+ent1) )

      ent1.find$( {id:ent1.id}, function(err,ent1a) {
        assert.isNull(err)
        assert.ok( gex('ten/foo/bar:{id=*,p1=v1,p2=100}').on(''+ent1a) )
      })
    })


    // entity store
    var log = logger([
      'start',
      ['entity','mem','make'],
      ['entity','mem','save','in'],
      ['entity','mem','save','out'],
      ['entity','mem','make'],
      ['entity','mem','find'],
    ])

    Entity.init$('mem',function(err,entity) {
      assert.isNull(err)
      assert.ok(entity)
      entity.tag = 'abc'

      var seneca = new Seneca( {entity:entity,logger:log} )
      assert.equal('abc',seneca.entity.tag)

      var ent1 = entity.make$({tenant$:'ten',base$:'foo',name$:'bar',p1:'v1'})
      ent1.p2 = 100;
    
      ent1.save$( function(err,ent1) {
        assert.isNull(err)
        assert.ok( gex('ten/foo/bar:{id=*,p1=v1,p2=100}').on(''+ent1) )

        ent1.find$( {id:ent1.id}, function(err,ent1a) {
          assert.isNull(err)
          assert.ok( gex('ten/foo/bar:{id=*,p1=v1,p2=100}').on(''+ent1a) )
        })
      })
    })
  },


  action: function() {
    var log = logger([
      'start',
      'add',
      ['act','in','action'],
      ['act','out','action'],
      ['act','in','action'],
      ['act','out','action'],
    ])

    var seneca = new Seneca({logger:log})
    var a1  = 0;

    seneca.add({op:'foo'},function(args,cb){
      a1 = args.a1
      cb(null,'+'+a1)
    });

    seneca.act({zone:'action',op:'foo',a1:100}, function(err,out) {
      assert.isNull(err)
      assert.equal('+100',out)
      assert.equal(100,a1)
      
      seneca.act({zone:'action',op:'foo',a1:200}, function(err,out) {
        assert.isNull(err)
        assert.equal('+200',out)
        assert.equal(200,a1)
      })
    })
  },


  register: function() {

    function MockStore() {
      var self = this;
      self.name = 'mock';

      self.init = function(url,cb) {
        cb('init')
      }

      self.save = function(ent,cb) {
        cb(ent.err?{err:ent.err}:null,'save')
      }

      self.find = function(qent,q,cb) {
        cb(q.err?{err:q.err}:null,'find')
      }

      self.remove = function(qent,q,cb) {
        cb(q.err?{err:q.err}:null,'remove')
      }

      self.close = function(cb){
        cb('close')
      }
    }
    Entity.register$( new MockStore() );

    var log = logger([
      'start',
    ])

    Entity.init$('mock',function(err,entity) {
      assert.isNull(err)
      assert.ok(entity)

      var seneca = new Seneca( {entity:entity,logger:log} )

      var ent1 = entity.make$({tenant$:'ten',base$:'foo',name$:'bar'})    
      ent1.save$( function(err,out) {
        assert.isNull(err)
        assert.equal('save',out)
      })

      ent1.err = 'boom'
      ent1.save$( function(err,out) {
        assert.equal('boom',err.err)
      })

    })
  }

  /*
  context: function() {
    Entity.init$('mem:',function(err,entity) {
      assert.isNull(err)
      assert.ok(entity)

      var seneca = Seneca.init(entity);
      var ctxt = seneca.context({foo:'bar'});
      assert.equal('Context:{"foo":"bar"}',''+ctxt);
      assert.equal('bar',ctxt.get$('foo'));

      var s;
      seneca.add({a:1},function(args){
        s = args.context$.get$('foo');
      });
      var act1 = seneca.actcontext(ctxt);

      act1({a:1});
      assert.equal('bar',s);
    });
  }
  */
}