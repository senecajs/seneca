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

    try { seneca(); assert.fail() }
    catch(e) { assert.equal('Seneca: no options for init(opts,cb).',e.message) }

    try { seneca({}); assert.fail() }
    catch(e) { assert.equal('Seneca: no callback for init(opts,cb).',e.message) }


    try {
      var i = 0
      seneca({},function(err,si){
        assert.equal( 0, i )
        throw new Error('after init '+(i++))
      })
      assert.fail()
    }
    catch(e) {
      assert.equal('after init 0',e.seneca.error.message)
      assert.equal('seneca/callback_exception',e.seneca.code)
    }


    try {
      var i = 0
      seneca({plugins:['error']},function(err,si){
        assert.equal( 0, i )
        throw new Error('plugins after init '+(i++))
      })
      assert.fail()
    }
    catch(e) {
      //console.log(e)
      assert.equal('seneca/callback_exception',e.seneca.code)
      assert.equal('plugins after init 0',e.seneca.error.message)
    }



    seneca({},function(err,si){
      assert.isNull(err)

      
      // nothing

      var err = si.fail()
      //eyes.inspect(err)
      assert.equal(err.seneca.code,'unknown')
      assert.equal(err.message,'Seneca: unknown error.')


      // just meta

      // unresolved code gets used as message
      err = si.fail('code1')
      //eyes.inspect(err)
      assert.equal(err.seneca.code,'code1')
      assert.equal(err.message,'Seneca: code1')

      // no code
      err = si.fail({bar:1})
      //eyes.inspect(err)
      assert.equal(err.seneca.code,'unknown')
      assert.equal(err.seneca.bar,1)
      assert.equal(err.message,'Seneca: unknown error.')

      // additional meta props dragged along
      err = si.fail({code:'code2',bar:2})
      //eyes.inspect(err)
      assert.equal(err.seneca.code,'code2')
      assert.equal(err.seneca.bar,2)
      assert.equal(err.message,'Seneca: code2')



      
      // callbacks
      var cblog = ''

      si.fail(function(err){
        assert.equal(err.seneca.code,'unknown')
        assert.equal(err.message,'Seneca: unknown error.')
        cblog+='a'
      })

      si.fail('msg1',function(err){
        assert.equal(err.seneca.code,'msg1')
        assert.equal(err.message,'Seneca: msg1')
        cblog+='b'
      })

      si.fail('code1',function(err){
        assert.equal(err.seneca.code,'code1')
        assert.equal(err.message,'Seneca: code1')
        cblog+='c'
      })

      si.fail({code:'code2',bar:1},function(err){
        assert.equal(err.seneca.code,'code2')
        assert.equal(err.seneca.bar,1)
        assert.equal(err.message,'Seneca: code2')
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
        assert.equal(err.seneca.code,'m1')
        assert.equal(err.message,'Seneca: m1')
        assert.equal('arg1',a1)
        assert.equal('arg2',a2)
        cblog+='f'
      },'arg1','arg2')

      assert.equal('abcdef',cblog)
    })



    seneca({},function(err,si){
      assert.isNull(err)

      try { si.service('not-a-plugin') } catch( e ) { 
        assert.equal('seneca/service_unknown_plugin',e.seneca.code)
        assert.equal('not-a-plugin',e.seneca.pluginname)
        assert.equal('Seneca: service(pluginname): unable to build service, unknown plugin name: not-a-plugin',e.message)
      }

      try { si.plugin('not-a-plugin') } catch( e ) { 
        assert.equal('seneca/plugin_unknown_plugin',e.seneca.code)
        assert.equal('not-a-plugin',e.seneca.pluginname)
        assert.equal('Seneca: service(pluginname): unknown plugin name: not-a-plugin',e.message)
      }

      try { 
        si.act({on:'not-a-plugin',cmd:'not-a-cmd'},function(err){
          //eyes.inspect(err)
          //console.log(err)
          assert.isNotNull(err)
        }) 
      } catch( e ) { console.log(e); assert.fail();}

    })



    try {

      var i = 0;
      seneca({plugins:['echo','error']},function(err,si){
        assert.isNull(err)
        assert.equal(0,i)

        si.act({on:'error'},function(err){
          assert.isNull(err)
        })

        try {
          si.act({on:'error'},function(err){
            throw new Error('inside callback')
          })
          assert.fail()
        }
        catch(e) {
          assert.equal(e.seneca.code,'seneca/act_error')
        }


        throw new Error('inside callback 3')
      })
    }
    catch(e) {
      //eyes.inspect(e)
      assert.equal('seneca/callback_exception',e.seneca.code)
      assert.equal('inside callback 3',e.seneca.error.message)
    }


    seneca({plugins:['echo','error']},function(err,si){
      var cblog = ''

      si.act({on:'error',how:'fail'},function(err){
        //console.log('HOW-fail')
        //eyes.inspect(err)
        assert.equal('error_code1',err.seneca.code)
        cblog += 'a'
      })

      si.act({on:'error',how:'msg'},function(err){
        //console.log('HOW-msg')
        //eyes.inspect(err)
        assert.equal('an error message',err.seneca.code)
        assert.equal('Seneca: an error message',err.message)
        cblog += 'b'
      })

      si.act({on:'error',how:'errobj'},function(err){
        //console.log('HOW-errobj')
        //eyes.inspect(err)
        assert.equal('unknown',err.seneca.code)
        assert.equal('Seneca: an Error object',err.message)
        cblog += 'c'
      })


      si.act({on:'error',how:'str'},function(err){
        //console.log('HOW-str')
        //eyes.inspect(err)
        assert.equal('a string error',err.seneca.code)
        assert.equal('Seneca: a string error',err.message)
        cblog += 'd'
      })


      si.act({on:'error',how:'obj'},function(err){
        //console.log('HOW-obj')
        //eyes.inspect(err)
        assert.equal('unknown',err.seneca.code)
        assert.equal('an object',err.seneca.error)
        assert.equal('Seneca: unknown error.',err.message)
        cblog += 'e'
      })

      assert.equal('abcde',cblog)
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