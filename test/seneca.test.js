/* Copyright (c) 2010 Ricebridge */

var common   = require('common');
var Seneca   = require('seneca');

var E = common.E;

var eyes    = common.eyes
var assert  = common.assert
var gex     = common.gex

var SenecaClass = Seneca.Seneca;
var Entity = Seneca.Entity;

var logger = require('./logassert')



module.exports = {

  logging: function() {
    var log = logger(['start','close',['entity','mem','close']])

    Seneca.init(
      {logger:log},
      function(err,seneca){
        assert.isNull(err)
        seneca.close()
        assert.equal(3,log.index())
      }
    )
                
    try {
      Seneca.init()
    }
    catch( e ) {
      assert.equal( 'Seneca.init: no callback', ''+e )
    }

    try {
      Seneca.init({logger:logger(['bad'])},function(){})
    }
    catch( e ) {
      assert.equal( 'bad != start', e.actual )
    }

    log = logger(['start',['custom','foo']])
    Seneca.init(
      {logger:log},
      function(err,seneca){
        assert.isNull(err)
        seneca.log('foo')
        assert.equal(2,log.index())
      }
    )
  },


  entity: function() {

    var log = logger([
      'start',
      ['entity','mem','make'],

      ['entity','mem','make'],
      ['entity','mem','save','in'],
      ['entity','mem','save','out'],
      ['entity','mem','make'],
      ['entity','mem','load','in'],
      ['entity','mem','load','out'],

      ['entity','mem','make'],
      ['entity','mem','save','in'],
      ['entity','mem','save','out'],
      ['entity','mem','make'],
      ['entity','mem','load','in'],
      ['entity','mem','load','out'],

      ['entity','mem','make'],
      ['entity','mem','list','in'],
      ['entity','mem','list','out'],

      ['entity','mem','make'],
      ['entity','mem','list','in'],
      ['entity','mem','list','out'],

      ['entity','mem','remove'],
      ['entity','mem','make'],
      ['entity','mem','list','in'],
      ['entity','mem','list','out'],
    ])

    Seneca.init(
      {logger:log},
      function(err,seneca){
        assert.isNull(err)

        var entity = seneca.make('ten','base')
        var ent = entity.make$('ent',{p1:'v1'})
        ent.p2 = 100;
    
        ;ent.save$( function(err,ent) {
          assert.isNull(err)
          assert.ok( gex('ten/base/ent:{id=*,p1=v1,p2=100}').on(''+ent) )

        ;ent.load$( {id:ent.id}, function(err,entR) {
          assert.isNull(err)
          assert.ok( gex('ten/base/ent:{id=*,p1=v1,p2=100}').on(''+entR) )
          var ent1 = entR


          ent = entity.make$('ent',{p1:'v1'})
          ent.p3 = true
        ;ent.save$( function(err,ent) {
          assert.isNull(err)
          assert.ok( gex('ten/base/ent:{id=*,p1=v1,p3=true}').on(''+ent) )

        ;ent.load$( {id:ent.id}, function(err,entR) {
          assert.isNull(err)
          assert.ok( gex('ten/base/ent:{id=*,p1=v1,p3=true}').on(''+entR) )
          var ent2 = entR


        ;ent.list$( {p1:'v1'}, function(err,list) {
          assert.isNull(err)
          assert.equal(2,list.length)
          assert.ok( gex('ten/base/ent:{id=*,p1=v1,p2=100}').on(''+list[0]) )
          assert.ok( gex('ten/base/ent:{id=*,p1=v1,p3=true}').on(''+list[1]) )

        ;ent.list$( {p2:100}, function(err,list) {
          assert.isNull(err)
          assert.equal(1,list.length)
          assert.ok( gex('ten/base/ent:{id=*,p1=v1,p2=100}').on(''+list[0]) )

          
        ;ent.remove$( {p1:'v1'}, function(err) {
          assert.isNull(err)

        ;ent.list$( {p1:'v1'}, function(err,list) {
          assert.isNull(err)
          assert.equal(0,list.length)


        }) // list
        }) //remove

        }) // list
        }) // list

        }) // load
        }) // save

        }) // load
        }) // save
      }
    )
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

    Seneca.init(
      {logger:log},
      function(err,seneca){
        assert.isNull(err)
        var a1  = 0;

        seneca.add({op:'foo'},function(args,cb){
          a1 = args.a1
          cb(null,'+'+a1)
        });

        seneca.act({op:'foo',a1:100}, function(err,out) {
          assert.isNull(err)
          assert.equal('+100',out)
          assert.equal(100,a1)
      
          seneca.act({op:'foo',a1:200}, function(err,out) {
            assert.isNull(err)
            assert.equal('+200',out)
            assert.equal(200,a1)
          })
        })
      }
    )
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

      self.load = function(qent,q,cb) {
        cb(q.err?{err:q.err}:null,'load')
      }

      self.list = function(qent,q,cb) {
        cb(q.err?{err:q.err}:null,'list')
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

    Seneca.init( 
      {entity:'mock',logger:log},
      function(err,seneca) {
        assert.isNull(err)

        var ent1 = seneca.make('ten','foo','bar')    
        ent1.save$( function(err,out) {
          assert.isNull(err)
          assert.equal('save',out)
        })

        ent1.err = 'boom'
        ent1.save$( function(err,out) {
          assert.equal('boom',err.err)
        })
      }
    )
  }


  /*
  context: function() {
    Entity.init$('mem:',function(err,entity) {
      assert.isNull(err)
      assert.ok(entity)

      var seneca = SenecaClass.init(entity);
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