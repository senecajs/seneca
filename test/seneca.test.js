/* Copyright (c) 2010-2015 Richard Rodger, MIT License */
"use strict";


// mocha seneca.test.js

var VERSION = '0.6.3'

var util   = require('util')
var stream = require('stream')
var assert  = require('assert')

var common   = require('../lib/common')
var seneca   = require('..')

var gex           = require('gex')
var parambulator  = require('parambulator')
var _             = require('lodash')
var Lab           = require('lab')


var lab      = exports.lab = Lab.script()
var describe = lab.describe
var it       = lab.it


// timerstub broken on node 0.11
//var timerstub = require('timerstub')
var timerstub = {
  setTimeout:setTimeout,
  setInterval:setInterval,
  Date:Date,
  wait:function(dur,fn){
    setTimeout(fn,dur)
  }
}



var testopts = {log:'test'}


process.setMaxListeners(0)


describe('seneca', function(){

  it('version', function(done){
    var start = Date.now()
    var si = seneca(testopts)
    assert.equal(si.version,VERSION)
    var end = Date.now()

    // ensure startup time does not degenerate
    assert.ok( end-start < 333 )

    assert.equal( si, si.seneca() )
    done()
  })



  it('quick', function(done){
    var si = seneca(testopts)
    si.use(function quickplugin(opts){
      si.add({a:1},function(args,cb){cb(null,{b:2})})
    })
    si.act({a:1},function(err,out){
      assert.equal(out.b,2)
    })
    si.act('a:1',function(err,out){
      assert.equal(out.b,2)
    })
    done()
  })



  it('require-use-safetynet', function(done){
    require('..')
      .use('echo')
      .act('role:echo,foo:1',function(err,out){
        console.log(err)
        if(err) return done(err);
        assert.equal(1,out.foo)
        done()
      })
  })



  it('ready-complex', function(done){
    var mark = {ec:0}

    timerstub.setTimeout(function(){
      //console.log(mark)

      assert.ok(mark.r0,'r0')
      assert.ok(mark.r1,'r1')
      assert.ok(mark.p1,'p1')
      assert.ok(mark.p2,'p2')
      assert.ok(1===mark.ec,'ec')

      done()
    },300)


    var si = seneca(testopts)
    si.ready(function(){
      mark.r0=true

      si.use(function p1(opts){
        si.add({init:'p1'},function(args,done){
          timerstub.setTimeout(function(){mark.p1=true;done()},40)
        })
      })

      si.on('ready',function(){
        mark.ec++
      })

      si.ready(function(){
        mark.r1=true


        si.use(function p2(opts){
          si.add({init:'p2'},function(args,done){
            timerstub.setTimeout(function(){mark.p2=true;done()},40)
          })
        })
      })
    })

    timerstub.wait(400)
  })


  it('ready-func', function(done){
    var si = seneca(testopts)

    si.ready(function(){
      //console.log('READY FUNC')
      done()
    })
  })


  it('ready-event', function(done){
    var si = seneca(testopts)

    si.on('ready',function(){
      //console.log('READY EVENT')
      done()
    })
  })


  it('ready-both', function(done){
    var si = seneca(testopts)
    var tmp = {}

    si.on('ready',function(){
      //console.log('READY EVENT')
      tmp.a = 1
      complete()
    })
    si.ready(function(){
      //console.log('READY FUNC')
      tmp.b = 1
      complete()
    })

    function complete(){
      if( tmp.a && tmp.b ) {
        done()
      }
    }
  })


  it('happy-error',function(done){
    seneca({log:'silent'})
      .add('happy_error:1',function(args,done){done(new Error('happy-error'))})
      .act('happy_error:1',function(err){
        assert.ok( null != err )
        assert.equal('seneca: Action happy_error:1 failed: happy-error.',err.message)
        done()
      })
  })


  it('errhandler',function(done){
    var tmp = {}

    function grab_all(err) {
      tmp.grab = err
      return true
    }

    function pass_on(err) {
      tmp.pass = err
    }

    var si = seneca({log:'silent'})
    si.add('cmd:grab',function(args,done){
      done(new Error('grab'))
    })
    si.add('cmd:pass',function(args,done){
      done(new Error('pass'))
    })

    si.options({errhandler:grab_all})

    si.act('cmd:grab',function(err){
      assert.fail()
    })

    setTimeout(function(){
      assert.ok( null != tmp.grab )

      si.options({errhandler:pass_on})

      si.act('cmd:pass',function(err){
        assert.ok( null != err )
        assert.ok( null != tmp.pass)
        done()
      })

    },100)

  })


  it('register', function(done) {
    var si = seneca(testopts)

    var initfn = function(){}
    var emptycb = function(){}


    try { si.register() } catch( e ) {
      assert.equal('no_input$',e.parambulator.code)
    }

    try { si.register({}) } catch( e ) {
      assert.equal('name',e.parambulator.property)
      assert.equal('required$',e.parambulator.code)
    }

    try { si.register({name:1,init:initfn},emptycb) } catch( e ) {
      assert.equal('name',e.parambulator.property)
      assert.equal('string$',e.parambulator.code)
    }

    try { si.register({name:'a',init:'b'},emptycb) } catch( e ) {
      assert.equal('init',e.parambulator.property)
      assert.equal('function$',e.parambulator.code)
    }
    done()
  })



  it('action-basic', function(done) {
    var si = seneca(testopts).error(done)
    si.options({debug:{fragile:true}})

    var a1 = 0

    si.add({op:'foo'},function(args,cb) {
      a1 = args.a1
      cb(null,{s:'+'+a1})
    })

    si.act({op:'foo',a1:100}, function(err,out) {
      assert.ok( null == err)
      assert.equal('+100',out.s)
      assert.equal(100,a1)

      si.act({op:'foo',a1:200}, function(err,out) {
        assert.ok( null == err)
        assert.equal('+200',out.s)
        assert.equal(200,a1)

        done()
      })
    })
  })


  it('action-add-invalid-args', function(done) {
    var si = seneca(testopts).error(done)

    try {
      si.add({op:'bar'})
      assert.fail()
    }
    catch(e) {
      assert.ok(e.message.match(/norma: invalid arguments/))

      try {
        si.add('a:1',function(args,done){},123)
        assert.fail()
      }
      catch(e) {
        assert.ok(e.message.match(/norma: invalid arguments/))
        done()
      }
    }
  })


  it('action-act-invalid-args', function(done) {
    var si = seneca(testopts).error(done)
    si.options({debug:{fragile:true}})

    ;try {
      si.act({op:'bad',a1:100}, function(err,out) {
        assert.fail()
      })
      assert.fail()
    }
    catch(e) {
      assert.equal(e.code,'act_not_found')

    ;try {
      // default is not an object
      si.act({op:'bad',a1:100,default$:"qaz"}, function(err,out) {
        assert.fail()
      })
      assert.fail()
    }
    catch(e) {
      assert.equal(e.code,'act_default_bad')

    ;try {
      si.act()
      assert.fail()
    }
    catch(e) {
      assert.equal(e.code,'act_not_found')

    ;try {
      si.act(function(err,out) {
        assert.fail()
      })
      assert.fail()
    }
    catch(e) {
      assert.equal(e.code,'act_not_found')

      done()
    } } } }
  })


  it('action-default', function(done) {
    var si = seneca(testopts).error(done)

    si.act({op:'bad',a1:100,default$:{a:1}}, function(err,out) {
      assert.deepEqual({a:1},out)
      done()
    })
  })


  it('action-override', function(done) {
    var si = seneca(testopts).error(done)

    function foo(args,done) {
      done(null,{ a:args.a, s:this.toString(), foo:args.meta$ })
    }

    function bar(args,done) {
      var pargs = { a:args.a, s:args.s }
      this.prior(pargs,function(e,o){
        o.b = 2
        o.bar = args.meta$
        done(e,o)
      })
    }


    function zed(args,done) {
      var m = args.meta$
      args.z = 3
      this.prior(args,function(e,o){
        o.z = 3
        o.zed = args.meta$
        done(e,o)
      })
    }


    si.ready( function(){
      si.add({op:'foo'},foo)
      si.act('op:foo,a:1',function(e,o){
        assert.ok(gex('1~Seneca/0.6.*'+'/*').on(''+o.a+'~'+o.s))
        assert.ok( o.foo.entry )

        si.add({op:'foo'},bar)
        si.act('op:foo,a:1',function(e,o){
          assert.ok(gex('1~2~Seneca/0.6.*'+'/*').on(''+o.a+'~'+o.b+'~'+o.s))
          assert.ok( o.bar.entry )
          assert.ok( !o.foo.entry )

          si.add({op:'foo'},zed)
          si.act('op:foo,a:1',function(e,o){
            assert.ok(gex('1~2~3~Seneca/0.6.*'+'/*').on(
              ''+o.a+'~'+o.b+'~'+o.z+'~'+o.s))
            assert.ok( o.zed.entry )
            assert.ok( !o.bar.entry )
            assert.ok( !o.foo.entry )

            done()
          })
        })
      })
    })

  })



  it('prior-nocache', function(done){
    var si = seneca({log:'silent',errhandler:done,trace:{act:false}})
    var count = 0, called = ''

    si.ready( function(){

      si.add('foo:a',function(args,done){
        count++
        count += args.x
        done(null,{count:count})
      })

      si.add('foo:a',function(args,done){
        count += args.y
        this.prior(args,done)
      })


      si
        .gate()
        .act('foo:a,x:10,y:0.1',function(err,out){
          assert.equal(11.1,count)
          called+='A'
        })
        .act('foo:a,x:100,y:0.01',function(err,out){
          assert.equal(112.11,count)
          called+='B'
        })
        .act('foo:a,x:10,y:0.1',function(err,out){
          assert.equal(123.21,count)
          called+='C'
        })
        .act('foo:a,x:100,y:0.01',function(err,out){
          assert.equal(224.22,count)
          called+='D'
        })
        .ready(function(){
          assert.equal('ABCD',called)
          assert.equal(224.22,count)

          this
            .add('foo:a',function(args,done){
              count += args.z
              this.prior(args,done)
            })
            .gate()
            .act('foo:a,x:10,y:0.1,z:1000000',function(err,out){
              assert.equal(1000235.32,count)
              called+='E'
            })
            .ready(function(){
              assert.equal('ABCDE',called)
              done()
            })

        })
    })
  })


  it('gating', function(done){
    var si = seneca({log:'silent',errhandler:done})
    var count = 0, called = ''

    si.add('foo:a',function(args,done){
      count++
      count+=args.x
      done(null,{count:count})
    })

    si
      .gate()
      .act('foo:a,x:10',function(err,out){
        assert.equal(11,count)
        called+='A'
      })
      .act('foo:a,x:100',function(err,out){
        assert.equal(112,count)
        called+='B'
      })
      .act('foo:a,x:1000',function(err,out){
        assert.equal(1113,count)
        called+='C'
      })
      .ready(function(){
        assert.equal('ABC',called)
        assert.equal(1113,count)
        done()
      })
  })





  it('act_if', function(done) {
    var si = seneca({log:'silent'})

    si.add({op:'foo'},function(args,done) {
      done(null,'foo'+args.bar)
    })

    si.act_if(true,{op:'foo',bar:'1'},function(err,out){
      assert.equal('foo1',out)
    })

    si.act_if(false,{op:'foo',bar:'2'},function(err,out){
      assert.fail()
    })

    si.act_if(true,"op:foo,bar:3",function(err,out){
      assert.equal('foo3',out)
    })

    try {
      si.act_if({op:'foo',bar:'2'},function(err,out){
        assert.fail()
      })
    }
    catch(e){
      assert.ok(e.message.match(/norma:/))
    }

    si = seneca(testopts)
      .add('a:1',function(args){this.good({b:args.a+1})})
      .add('a:2',function(args){this.good({b:args.a+2})})

    si.act_if( true, 'a:1', function(err,out){
      if( err ) return done(err);

      assert.equal(2,out.b)

      si.act_if( false, 'a:2', function(err,out){
        if( err ) return done(err);
        assert.fail()
      })

      process.nextTick(done)
    })
  })


  it('plugins', function(done) {
    var si = seneca({plugins:['echo'],log:'silent'})

    si.act({role:'echo',baz:'bax'},function(err,out){
      assert.ok( null == err)
      assert.equal(''+{baz:'bax'},''+out)
    })


    var si = seneca({plugins:['basic'],log:'silent'})

    si.act({role:'util',cmd:'quickcode'},function(err,code){
      assert.ok( null == err)
      assert.equal( 8, code.length )
      assert.ok( null ==  /[ABCDEFGHIJKLMNOPQRSTUVWXYZ]/.exec(code) )
    })


    function Mock1() {
      var self = this
      self.name = 'mock1'
      self.plugin = function() {
        return self
      }
      self.init = function(options){
        this.add({role:self.name,cmd:'foo'},function(args,cb){
          cb(null,'foo:'+args.foo)
        })
      }
    }


    var si = seneca(testopts)
    si.register(new Mock1(), function(err){
      assert.ok( null == err)

      si.act({role:'mock1',cmd:'foo',foo:1},function(err,out){
        assert.equal('foo:1',out)
      })
    })


    var si = seneca(testopts)
    var mock1a = new Mock1()
    mock1a.name = 'mock1a'
    si.register(mock1a, function(err){
      assert.ok( null == err)

      si.act({role:'mock1a',cmd:'foo',foo:1},function(err,out){
        assert.equal('foo:1',out)
      })
    })


    function Mock2() {
      var self = this
      self.name = 'mock2'
      self.plugin = function() {
        return self
      }
      self.init = function(options){
        this.add({role:'mock1',cmd:'foo'},function(args,cb){
          this.prior(args,function(err,out){
            cb(null,'bar:'+out)
          })
        })
      }
    }

    var si = seneca(testopts)
    si.register( new Mock1(), function(err){
      assert.ok( null == err)

      si.register( new Mock2(), function(err){
        assert.ok( null == err)

        si.act({role:'mock1',cmd:'foo',foo:2},function(err,out){
          assert.equal('bar:foo:2',out)
        })
      })
    })


    var si = seneca({log:'silent'})
    si.use('echo')
    si.act({role:'echo',cmd:'foo',bar:1},function(err,out){
      assert.equal( JSON.stringify({cmd:'foo',bar:1}), JSON.stringify(out) )
    })
    done()
  })



  it('pin', function(done) {
    var si = seneca({log:'silent'})

    var log = []

    si.add({p1:'v1',p2:'v2a'},function(args,cb){
      log.push('a'+args.p3)
      cb(null,{p3:args.p3})
    })

    si.add({p1:'v1',p2:'v2b'},function(args,cb){
      log.push('b'+args.p3)
      cb(null,{p3:args.p3})
    })

    var api = si.pin({p1:'v1',p2:'*'})

    api.v2a({p3:'A'},function(e,r){assert.equal(r.p3,'A')})
    api.v2b({p3:'B'},function(e,r){assert.equal(r.p3,'B')})

    var acts = si.pinact({p1:'v1',p2:'*'})
    assert.equal("[ { p1: 'v1', p2: 'v2a' }, { p1: 'v1', p2: 'v2b' } ]",
                 util.inspect(acts))

     done()
  })


  it('pin-star', function(done) {
    var si = seneca(testopts)

    si.add('a:1,b:x',function(){})
    si.add('a:1,c:y',function(){})

    var pin_b = si.pin('a:1,b:*')
    assert.ok( _.isFunction(pin_b.x) )
    assert.ok( null == pin_b.y )

    var pin_c = si.pin('a:1,c:*')
    assert.ok( _.isFunction(pin_c.y) )
    assert.ok( null == pin_c.x )

    assert.deepEqual( [ { a: '1', b: 'x' }, { a: '1', c: 'y' } ],
                      si.findpins('a:1') )

    assert.deepEqual( [ { a: '1', b: 'x' } ],
                      si.findpins('a:1,b:*') )

    assert.deepEqual( [ { a: '1', c: 'y' } ],
                      si.findpins('a:1,c:*') )

    done()
  })


  it('fire-and-forget', function(done) {
    var si = seneca({log:'silent'})
    si.add({a:1},function(args,done){done(null,args.a+1)})
    si.add({a:1,b:2},function(args,done){done(null,args.a+args.b)})

    si.act({a:1})
    si.act({a:1,b:2})
    si.act('a:1')
    si.act('a:1, b:2')
    si.act('a:1',{b:2})
    si.act('b:2',{a:1})
    si.act('',{a:1})
    si.act('',{a:1,b:2})
    done()
  })



  it('strargs', function(done) {
    var si = seneca({log:'silent'})
    si.add({a:1,b:2},function(args,done){
      done(null,(args.c||-1)+parseInt(args.b)+parseInt(args.a))})

    si.act({a:1,b:2,c:3},function(err,out){
      assert.ok( null == err); assert.equal(6,out) })

    si.act('a:1,b:2',{c:3},function(err,out){
      assert.ok( null == err); assert.equal(6,out) })

    si.act('a:1,b:2',function(err,out){
      assert.ok( null == err); assert.equal(2,out) })

    // strargs win!!
    si.act('a:1,b:2',{a:2},function(err,out){
      assert.ok( null == err); assert.equal(2,out) })

    try {
      si.add('a:,b:2',function(args,done){done()})
    }
    catch( e ) {
      assert.equal(e.code,'add_string_pattern_syntax')
    }

    try {
      si.act('a:,b:2',{c:3},function(err,out){assert.fail()})
    }
    catch( e ) {
      assert.equal(e.code,'add_string_pattern_syntax')
    }


    try {
      si.add('a:1,b:2',"bad-arg",function(args,done){done()})
    }
    catch( e ) {
      assert.ok(e.message.match(/norma:/))
    }

    try {
      si.add(123,function(args,done){done()})
    }
    catch( e ) {
      assert.ok(e.message.match(/norma:/))
    }
    done()
  })


  it('moreobjargs', function(done) {
    var p0 = {c:6}

    seneca({log:'silent',errhandler:done})

      .add({a:1},{b:2},
           function(args,done){done(null,{c:args.c})})

      .add({A:1},{B:{integer$:true}},
           function(args,done){done(null,{C:args.C})})

      .add('x:1',{x:2,y:3},{x:4,y:5,z:6},
           function(args,done){done(null,{k:args.k})})

      .gate()

      .act('a:1,b:2,c:3',function(err,out){
        assert.equal(3,out.c)
      })

      .act({a:1,b:2},{c:4},function(err,out){
        assert.equal(4,out.c)
      })

      .act('a:1',{b:2},{c:5},function(err,out){
        assert.equal(5,out.c)
      })

      .act({a:1,b:2},p0,function(err,out){
        assert.equal(6,out.c)
        assert.equal('{ c: 6 }',util.inspect(p0))
      })

      .act('A:1,B:2,C:33',function(err,out){
        assert.equal(33,out.C)
      })

      .act('x:1,y:3,z:6,k:7',function(err,out){
        assert.equal(7,out.k)
      })

      .ready(function(){

        // using root as ready seneca is fatal$
        this.root.options({errhandler:function(err){
          if( 'act_invalid_args' != err.code ) return done(err);
          done()
        }})

        this.root.act('A:1,B:true,C:44')

      })
  })


  it('string-add', function(done) {
    seneca(testopts)
      .error(done)

      .start(done)

      .add("i:0,a:1,b:2",
           function(args,done){
             done(null,{v:(args.c||-1)+parseInt(args.b)+parseInt(args.a)})
           })
      .act("i:0,a:1,b:2,c:3",
           function(err,out){
             assert.ok( null == err )
             assert.equal(6,out.v)
           })

      .add("i:1,a:1",{b:2},
           function(args,done){
             done(null,{v:(args.c||-1)+parseInt(args.b)+parseInt(args.a)})
           })
      .act("i:1,a:1,b:2,c:3",
           function(err,out){
             assert.ok( null == err )
             assert.equal(6,out.v)
           })

      .add("i:2,a:1",{b:2,c:{required$:true}},
           function(args,done){
             done(null,{v:(args.c||-1)+parseInt(args.b)+parseInt(args.a)})
           })
      .act("i:2,a:1,b:2,c:3",
           function(err,out){
             assert.ok( null == err);
             assert.equal(6,out.v)
           })

      .end()
  })



  it('fix', function(done) {
    var si = seneca(testopts)

    function ab(args,done){
      done(null,{r:''+args.a+(args.b||'-')+(args.c||'-')+args.z})
    }

    si
      .fix('a:1')
      .add('b:2',ab)
      .add('c:3',ab)
      .act('b:2,z:8',
           function(err,out){assert.ok( null == err);assert.equal('12-8',out.r)})
      .act('c:3,z:9',
           function(err,out){assert.ok( null == err);assert.equal('1-39',out.r)})

    si
      .act('a:1,b:2,z:8',
           function(err,out){assert.ok( null == err);assert.equal('12-8',out.r)})
      .act('a:1,c:3,z:9',
           function(err,out){assert.ok( null == err);assert.equal('1-39',out.r)})

    done()
  })


  it('parambulator', function(done) {
    var si = seneca({log:'silent'})

    si.add({a:1,b:'q',c:{required$:true,string$:true}},
           function(args,done){done(null,{})})


    function foo(args,done){done(null,{})}
    foo.validate = {
      b: { required$:true }
    }
    si.add('a:2',foo)

    si.act( {a:1,b:'q',c:'c'}, function(err){err&&done(err)})
    si.act( {a:2,b:'q'}, function(err){err&&done(err)})

    si.act( {a:1,b:'q',c:1}, function(err){
      assert.equal('act_invalid_args',err.code)

      si.act( {a:1,b:'q'}, function(err){
        assert.equal('act_invalid_args',err.code)

        si.act( {a:2}, function(err){
          assert.equal('act_invalid_args',err.code)

          done()
        })
      })
    })

  })



  it('act-param', function(done){
    seneca({log:'silent'})

      .add({a:1,b:{integer$:true}},function(args,done){
        if( !_.isNumber(args.b) ) return assert.fail();
        done(null,{a:1+args.b})
      })

      .act({a:1,b:1},function(err,out){
        try {
          assert.ok( null == err)
          assert.equal(2,out.a)
        }
        catch(e) { return done(e) }

        this.act({a:1,b:"b"},function(err,out){
          try {
            assert.equal('act_invalid_args',err.code)
            assert.equal("seneca: Action a:1 has invalid arguments; "+
                         "The property 'b', with current value: 'b', "+
                         "must be a integer (parent: top level).; arguments "+
                         "were: { a: 1, b: 'b' }.",err.message)
          } catch(e) { return done(e) }

          try {
            this.add({a:1,b:{notatypeatallatall$:true}},function(args,done){
              assert.fail()
            })
          }
          catch(e){
            try {
              assert.ok(e.message.match(/Parambulator: Unknown rule/))
            } catch(e) { return done(e) }

            done()
          }
        })
      })
  })



  it('sub', function(done){
    var si = seneca(testopts,{errhandler:done})

    var tmp = {a:0,as1:0,as2:0,as1_in:0,as1_out:0,all:0}

    si.sub({},function(args){
      // console.log(args.meta$)
      tmp.all++
    })

    si.add({a:1},function(args,done){
      tmp.a = tmp.a+1
      done(null,{b:1,y:1})
    })

    si.act({a:1},function(err,out) {
      if(err) return done(err);
      assert.equal(1,out.b)
      assert.equal(1,tmp.a)
      assert.equal(0,tmp.as1)
      assert.equal(0,tmp.as2)

      si.sub({a:1},function(args){
        assert.equal(1,args.a)
        assert.equal(true,args.in$)
        tmp.as1 = tmp.as1+1
      })

      si.sub({a:1,in$:true},function(args){
        assert.equal(1,args.a)
        assert.equal(true,args.in$)
        tmp.as1_in = tmp.as1_in+1
      })

      si.sub({a:1,out$:true},function(args,result){
        //console.log(arguments)
        assert.equal(1,args.a)
        assert.equal(1,result.y)
        assert.equal(true,args.out$)
        tmp.as1_out = tmp.as1_out+1
      })

      si.act({a:1},function(err,out) {
        if(err) return done(err);

        assert.equal(1,out.b)
        assert.equal(2,tmp.a)
        assert.equal(1,tmp.as1)
        assert.equal(1,tmp.as1_in)
        assert.equal(1,tmp.as1_out)
        assert.equal(0,tmp.as2)

        si.sub({a:1},function(args){
          tmp.as2 = tmp.as2+1
        })

        si.act({a:1,x:1},function(err,out) {
          if(err) return done(err);

          assert.equal(1,out.b)
          assert.equal(3,tmp.a)
          assert.equal(2,tmp.as1)
          assert.equal(1,tmp.as2)

          assert.ok( 0 < tmp.all )

          done()
        })
      })
    })
  })


  it('act-cache', function(done){
    var si = seneca(testopts)
    si.options({errhandler:done})

    var x = 0

    si.add({a:1},function(args,done){
      x++;this.good({x:x})
    })

    si.act({a:1},function(err,out){
      if(err) return done(err);
      assert.equal(1,out.x)
    })

    si.act({id$:'a/B',a:1},function(err,out){ 
      if(err) return done(err);

      assert.equal(2,out.x)

      si.act({a:1},function(err,out){
        if(err) return done(err);

        assert.equal(3,out.x)

        si.act({id$:'a/B',a:1},function(err,out){ 
          if(err) return done(err);

          assert.equal(2,out.x)

          si.act('role:seneca,stats:true',function(err,stats){
            if(err) return done(err);

            // --seneca.log.all and count INs
            // ... | grep act | grep IN | wc -l
            // sensitive to changes in plugin init and internal action calls
            assert.equal( '{ calls: 8, done: 8, fails: 0, cache: 1 }',
                          util.inspect(stats.act))
            done()
          })
        })
      })
    })
  })


  it('zig', function(done){
    var si = seneca(testopts)
    si.options({errhandler:done})

    si
      .add('a:1',function(a,d){d(0,{aa:a.aa})})
      .act('a:1,aa:1',function(e,o){
        assert.equal(1,o.aa)
        do_zig0()
      })

    function do_zig0() {
      si
        .start()
        .wait('a:1,aa:1')
        .end(function(e,o){
          if(e) return done(e);
          assert.equal(1,o.aa)
          do_zig1()
        })
    }

    function do_zig1() {
      si.options({xzig:{trace:true}})
      si
        .start()
        .run('a:1,aa:1')
        .run('a:1,aa:2')
        .wait(function(r,d){
          assert.deepEqual([{aa:1},{aa:2}],r)
          d()
        })
        .end(function(e,o){
          if(e) return done(e);
          do_zig2()
        })
    }

    function do_zig2() {
      si.options({xzig:{trace:true}})
      var tmp = {}

      si
        .start()
        .wait('a:1,aa:1')
        .step(function A(r,d){
          return tmp.aaa=r
        })

        .if( function(d){return !!tmp.aaa} )
        .step(function B(r,d){
          return tmp.aaaa=2
        })
        .endif()

        .if( function(d){return !!tmp.aaa} )
        .if( false )
        .step(function C(r,d){
          return tmp.aaaa=3
        })
        .endif()
        .endif()

        .end(function(e,o){
          if(e) return done(e);
          assert.equal(2,tmp.aaaa)
          do_zig3()
        })
    }

    function do_zig3() {
      si.options({xzig:{trace:true}})

      var tmp = {bb:[]}

      si
        .add('b:1',function(a,d){tmp.bb.push(a.bb);d()})

      si
        .start()
        .fire('b:1,bb:1')
        .fire('b:1,bb:2')
        .end(function(e,o){
          setTimeout(function(){
            assert.deepEqual({ bb: [ 1, 2 ] },tmp)
            do_zig4()
          },10)
        })
    }

    function do_zig4() {
      si.options({xzig:{trace:true}})

      var tmp = {bb:[]}

      si
        .add('b:1',function(a,d){d(0,{c:a.c})})

      si
        .start()
        .wait('b:1,c:2')
        .step(function(d){
          d.d=d.c
          return d
        })
        .wait('b:1,c:$.d')
        .end(function(e,o){
          assert.equal(2,o.c)
          done(e)
        })
    }

  })


  it('wrap',function(done){
    var si = seneca(testopts)
    si.options({errhandler:done})

    si.add('a:1',function(args,done){done(null,{aa:args.aa})})
    si.add('b:2',function(args,done){done(null,{bb:args.bb})})
    si.add('a:1,c:3',function(args,done){done(null,{cc:args.cc})})
    si.add('a:1,d:4',function(args,done){done(null,{dd:args.dd})})

    si.wrap('a:1',function(args,done){
      this.prior(args,function(err,out){
        out.X=1
        done(err,out)
      })
    })

    // existence predicate!! d must exist
    si.wrap('a:1,d:*',function(args,done){
      this.prior(args,function(err,out){
        out.DD=44
        done(err,out)
      })
    })

    si
      .start(done)

      .wait('a:1,aa:1')
      .step(function(out){
        assert.deepEqual({ aa: 1, X: 1 }, out)
      })

      .wait('a:1,c:3,cc:3')
      .step(function(out){
        assert.deepEqual({ cc: 1, X: 1 }, out)
      })

      .wait('a:1,d:4,dd:4')
      .step(function(out){
        assert.deepEqual({ dd: 4, X: 1, DD: 44 }, out)
      })

      .wait('b:2,bb:2')
      .step(function(out){
        assert.deepEqual({ bb: 2 }, out)
      })

      .step(function(){
        si.wrap('',function(args,done){
          this.prior(args,function(err,out){
            out.ALL=2
            done(err,out)
          })
        })
      })

      .wait('a:1,aa:1')
      .step(function(out){
        assert.deepEqual({ aa: 1, X: 1, ALL: 2 }, out)
      })

      .wait('a:1,c:3,cc:3')
      .step(function(out){
        assert.deepEqual({ cc: 1, X: 1, ALL: 2 }, out)
      })

      .wait('a:1,d:4,dd:4')
      .step(function(out){
        assert.deepEqual({ dd: 4, X: 1, DD: 44, ALL: 2 }, out)
      })

      .wait('b:2,bb:2')
      .step(function(out){
        assert.deepEqual({ bb: 2, ALL: 2 }, out)
      })

      .end()
  })


  it('meta',function(done){
    var si = seneca(testopts)
    si.options({errhandler:done})

    var meta = {}

    si.add('a:1',function(args,done){
      meta.a = args.meta$
      done(null,{aa:args.aa})
    })

    si.add('b:2',function(args,done){
      meta.b = args.meta$
      done(null,{bb:args.bb})
    })

    si.start(done)
      .wait('a:1')
      .wait('b:2')
      .end(function(err){
        if(err) return done(err);

        assert.equal( 'a:1', meta.a.pattern )
        assert.equal( 'b:2', meta.b.pattern )
        done()
      })
  })


  it('strict',function(done){
    var si = seneca({log:'silent'})

    si.add('a:1',function(a,d){d(null,"a")})
    si.act('a:1',function(err,res){
      assert.ok(err)
      assert.equal('result_not_objarr', err.code)

      si.options({strict:{result:false}})
      si.act('a:1',function(err,res){
        assert.ok(!err)
        assert.equal('a', res)
        done()
      })
    })
  })
})
