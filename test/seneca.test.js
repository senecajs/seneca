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

        seneca.add({op:'foo'},function(args,seneca,cb) {
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
        cb(null,self)
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
  },


  plugins: function() {

    function Mock1() {
      var self = this
      self.name = 'mock1'
      self.init = function(seneca,cb){
        seneca.add({on:self.name,cmd:'foo'},function(args,seneca,cb){
          cb(null,'foo:'+args.foo)
        })
        cb()
      }
    }

    Seneca.init(
      {plugins:[new Mock1()], logger:logger()},
      function(err,seneca){
        assert.isNull(err)

        seneca.act({on:'mock1',cmd:'foo',foo:1},function(err,out){
          assert.equal('foo:1',out)
        })
      }
    )


    var mock1a = new Mock1()
    mock1a.name = 'mock1a'
    Seneca.init(
      {plugins:[mock1a], logger:logger()},
      function(err,seneca){
        assert.isNull(err)

        seneca.act({on:'mock1a',cmd:'foo',foo:1},function(err,out){
          assert.equal('foo:1',out)
        })
      }
    )


    function Mock2() {
      var self = this
      self.name = 'mock2'
      self.init = function(seneca,cb){
        seneca.add({on:'mock1',cmd:'foo'},function(args,seneca,cb){
          args.parent$(args,seneca,function(err,out){
            cb(null,'bar:'+out)
          })
        })
        cb()
      }
    }

    Seneca.init(
      {plugins:[new Mock1(), new Mock2()], logger:logger()},
      function(err,seneca){
        assert.isNull(err)

        seneca.act({on:'mock1',cmd:'foo',foo:2},function(err,out){
          assert.equal('bar:foo:2',out)
        })
      }
    )


    Seneca.init(
      {plugins:['echo'], logger:logger()},
      function(err,seneca){
        assert.isNull(err)

        seneca.act({on:'echo',cmd:'foo',bar:1},function(err,out){
          assert.equal( JSON.stringify({cmd:'foo',bar:1}), JSON.stringify(out) )
        })
      }
    )



  }


}