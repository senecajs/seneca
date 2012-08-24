/* Copyright (c) 2010-2012 Richard Rodger */

var common   = require('../lib/common');
var seneca   = require('../lib/seneca');

//var E = common.E;

var eyes    = common.eyes
var assert  = common.assert
var gex     = common.gex

//var SenecaClass = Seneca.Seneca;
//var Entity = Seneca.Entity;

var logger = require('./logassert')


module.exports = {

  failgen: function() {
    seneca({},function(err,si){
      assert.isNull(err)

      
      // nothing

      err = si.fail()
      assert.equal(err.seneca.code,'unknown')
      assert.equal(err.message,'Seneca: unknown error.')


      // just a message

      err = si.fail('foo')
      assert.equal(err.seneca.code,'unknown')
      assert.equal(err.message,'Seneca: foo')

      err = si.fail(11)
      assert.equal(err.seneca.code,'unknown')
      assert.equal(err.message,'Seneca: 11')

      err = si.fail({m:1})
      assert.equal(err.seneca.code,'unknown')
      assert.equal(err.message,'Seneca: {"m":1}')


      // msg and meta

      err = si.fail('foo','code1')
      assert.equal(err.seneca.code,'code1')
      assert.equal(err.message,'Seneca: foo')

      err = si.fail('foo',{code:'code2',bar:1})
      assert.equal(err.seneca.code,'code2')
      assert.equal(err.seneca.bar,1)
      assert.equal(err.message,'Seneca: foo')

      err = si.fail('foo',{bar:1})
      assert.equal(err.seneca.code,'unknown')
      assert.equal(err.seneca.bar,1)
      assert.equal(err.message,'Seneca: foo')

      err = si.fail(11,{code:'code2',bar:1})
      assert.equal(err.seneca.code,'code2')
      assert.equal(err.seneca.bar,1)
      assert.equal(err.message,'Seneca: 11')

      err = si.fail({m:1},{code:'code2',bar:1})
      assert.equal(err.seneca.code,'code2')
      assert.equal(err.seneca.bar,1)
      assert.equal(err.message,'Seneca: {"m":1}')

      
      // callbacks
      var cblog = ''

      si.fail(function(err){
        assert.equal(err.seneca.code,'unknown')
        assert.equal(err.message,'Seneca: unknown error.')
        cblog+='a'
      })

      si.fail('msg1',function(err){
        assert.equal(err.seneca.code,'unknown')
        assert.equal(err.message,'Seneca: msg1')
        cblog+='b'
      })

      si.fail('msg1','code1',function(err){
        assert.equal(err.seneca.code,'code1')
        assert.equal(err.message,'Seneca: msg1')
        cblog+='c'
      })

      si.fail('msg1',{code:'code2',bar:1},function(err){
        assert.equal(err.seneca.code,'code2')
        assert.equal(err.seneca.bar,1)
        assert.equal(err.message,'Seneca: msg1')
        cblog+='d'
      })


      si.fail(function(err,a1,a2){
        assert.equal(err.seneca.code,'unknown')
        assert.equal(err.message,'Seneca: unknown error.')
        assert.equal('arg1',a1)
        assert.equal('arg2',a2)
        cblog+='e'
      },'arg1','arg2')

      si.fail('m1',function(err,a1,a2){
        assert.equal(err.seneca.code,'unknown')
        assert.equal(err.message,'Seneca: m1')
        assert.equal('arg1',a1)
        assert.equal('arg2',a2)
        cblog+='f'
      },'arg1','arg2')

      si.fail('m1','c1',function(err,a1,a2){
        assert.equal(err.seneca.code,'c1')
        assert.equal(err.message,'Seneca: m1')
        assert.equal('arg1',a1)
        assert.equal('arg2',a2)
        cblog+='g'
      },'arg1','arg2')


      assert.equal('abcdefg',cblog)
    })

    seneca({plugins:['error']},function(err,si){
      assert.isNull(err)

      si.act({on:'error'},function(err){
        assert.equal('Seneca: m1', err.message)
        assert.equal('plugin', err.seneca.code)
        assert.equal('error', err.seneca.plugin.name)
        assert.equal('fail', err.seneca.plugin.role)
      })
    })
  },


  register: function() {
    seneca({},function(err,si){
      var initfn = function(){}

      try { si.register() } catch( e ) { 
        assert.equal('register',e.seneca.code)
      }

      try { si.register({}) } catch( e ) { 
        //console.log(e)
        assert.equal('register',e.seneca.code)
        assert.equal("Seneca: register(plugin): The property 'name' is missing and is always required (parent: plugin).",e.message)
      }

      try { si.register({name:1,init:initfn}) } catch( e ) { 
        assert.equal('register',e.seneca.code)
      }

      try { si.register({name:'a',role:1,init:initfn}) } catch( e ) { 
        //console.log(e)
        assert.equal('register',e.seneca.code)
      }

      try { si.register({name:'a',init:'b'}) } catch( e ) { 
        //console.log(e)
        assert.equal('register',e.seneca.code)
      }

    })
  }


/*
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
      assert.equal( 'no_callback', e.err )
    }

    try {
      Seneca.init({logger:logger(['bad'])},function(){})
    }
    catch( e ) {
      assert.equal( 'bad != start', e.actual )
    }

    log = logger(['start','foo'])
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
      //['entity','mem','make'],
      ['entity','mem','load','in'],
      ['entity','mem','load','out'],

      ['entity','mem','make'],
      ['entity','mem','save','in'],
      ['entity','mem','save','out'],
      //['entity','mem','make'],
      ['entity','mem','load','in'],
      ['entity','mem','load','out'],

      //['entity','mem','make'],
      ['entity','mem','list','in'],
      ['entity','mem','list','out'],

      //['entity','mem','make'],
      ['entity','mem','list','in'],
      ['entity','mem','list','out'],

      ['entity','mem','remove'],
      //['entity','mem','make'],
      ['entity','mem','list','in'],
      ['entity','mem','list','out'],
    ])

    Seneca.init(
      {logger:log},
      function(err,seneca){
        assert.isNull(err)

        var entity = seneca.make('ten','base',null)
        var ent = entity.make$('ent',{p1:'v1'})
        ent.p2 = 100;
    
        ;ent.save$( function(err,ent) {
          assert.isNull(err)
          assert.ok( gex('ten/base/ent:{id=*;p1=v1;p2=100}').on(''+ent), ''+ent )

        ;ent.load$( {id:ent.id}, function(err,entR) {
          assert.isNull(err)
          assert.ok( gex('ten/base/ent:{id=*;p1=v1;p2=100}').on(''+entR) )
          var ent1 = entR


          ent = entity.make$('ent',{p1:'v1'})
          ent.p3 = true
        ;ent.save$( function(err,ent) {
          assert.isNull(err)
          assert.ok( gex('ten/base/ent:{id=*;p1=v1;p3=true}').on(''+ent) )

        ;ent.load$( {id:ent.id}, function(err,entR) {
          assert.isNull(err)
          assert.ok( gex('ten/base/ent:{id=*;p1=v1;p3=true}').on(''+entR) )
          var ent2 = entR


        ;ent.list$( {p1:'v1'}, function(err,list) {
          assert.isNull(err)
          assert.equal(2,list.length)
          assert.ok( gex('ten/base/ent:{id=*;p1=v1;p2=100}').on(''+list[0]) )
          assert.ok( gex('ten/base/ent:{id=*;p1=v1;p3=true}').on(''+list[1]) )

        ;ent.list$( {p2:100}, function(err,list) {
          assert.isNull(err)
          assert.equal(1,list.length)
          assert.ok( gex('ten/base/ent:{id=*;p1=v1;p2=100}').on(''+list[0]) )

          
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


/*
  plugins: function() {


    Seneca.init({logger:logger([]),plugins:['echo']},function(err,seneca){
      assert.isNull(err)

      seneca.act({on:'echo',baz:'bax'},function(err,out){
        assert.isNull(err)
        assert.equal(''+{baz:'bax'},''+out)
      })
    })


    Seneca.init({logger:logger([]),plugins:['util']},function(err,seneca){
      assert.isNull(err)

      seneca.act({on:'util',cmd:'quickcode'},function(err,code){
        assert.isNull(err)
        assert.equal( 8, code.length )
        assert.isNull( /[ABCDEFGHIJKLMNOPQRSTUVWXYZ]/.exec(code) )
      })
    })



    function Mock1() {
      var self = this
      self.name = 'mock1'
      self.plugin = function() {
        return self
      }
      self.init = function(seneca,opts,cb){
        seneca.add({on:self.name,cmd:'foo'},function(args,seneca,cb){
          cb(null,'foo:'+args.foo)
        })
        cb()
      }
    }

    Seneca.register(new Mock1())

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
    Seneca.register(mock1a)

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
      self.plugin = function() {
        return self
      }
      self.init = function(seneca,opts,cb){
        seneca.add({on:'mock1',cmd:'foo'},function(args,seneca,cb){
          args.parent$(args,seneca,function(err,out){
            cb(null,'bar:'+out)
          })
        })
        cb()
      }
    }

    Seneca.register(new Mock2())

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



    Seneca.init(
      {plugins:['mock3'], logger:logger()},
      function(err,seneca){
        assert.isNull(err)

        seneca.act({on:'mock3',cmd:'qaz',foo:3},function(err,out){
          assert.equal('qaz:3',out)
        })
      }
    )


  }
*/

}