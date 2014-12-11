/* Copyright (c) 2010-2014 Richard Rodger, MIT License */
"use strict";


// mocha seneca.test.js

var VERSION = '0.6.0'

var util   = require('util')
var stream = require('stream')


var common   = require('../lib/common')
var seneca   = require('..')


var assert  = require('chai').assert
var gex     = require('gex')

var _ = require('underscore')
var parambulator = require('parambulator')

var fixturestdout = new require('fixture-stdout');

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



var testopts = {log:'silent'}



describe('seneca', function(){

  it('version', function(){
    var start = Date.now()
    var si = seneca(testopts)
    assert.equal(si.version,VERSION)
    var end = Date.now()

    // ensure startup time does not degenerate
    assert.ok( end-start < 333 )

    assert.equal( si, si.seneca() )
  })



  it('quick', function(){
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
  })


  
  it('require-use-safetynet', function(){

    var fso = new fixturestdout()
    try {
      fso.capture( function onWrite (string, encoding, fd) {
        return false;
      })
      require('..').use('echo')
      fso.release()
    }
    catch(e){
      fso.release()
      aasert.faiL()
    }

    require('..')(testopts).use('echo')
  })



  it('ready-complex', function(fin){
    var mark = {ec:0}

    timerstub.setTimeout(function(){
      //console.log(mark)

      assert.ok(mark.r0,'r0')
      assert.ok(mark.r1,'r1')
      assert.ok(mark.p1,'p1')
      assert.ok(mark.p2,'p2')
      assert.ok(1===mark.ec,'ec')

      fin()
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


  it('ready-func', function(fin){
    var si = seneca(testopts)

    si.ready(function(){
      //console.log('READY FUNC')
      fin()
    })
  })


  it('ready-event', function(fin){
    var si = seneca(testopts)

    si.on('ready',function(){
      //console.log('READY EVENT')
      fin()
    })
  })


  it('ready-both', function(fin){
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
        fin()
      }
    }
  })


  it('failgen.meta.happy', function() {
    var si = seneca(testopts)

    
    // nothing
    var err = si.fail()
    assert.equal(err.seneca.code,'unknown')
    assert.ok(gex("Seneca/*"+"/*: unknown*").on(err.message))

    // unresolved code gets used as message
    err = si.fail('code1')
    assert.equal(err.seneca.code,'code1')
    assert.ok(gex("Seneca/*"+"/*: code1*").on(err.message))

    // additional values
    err = si.fail('code1',{foo:'a'})
    assert.equal(err.seneca.code,'code1')
    assert.equal(err.seneca.valmap.foo,'a')
    assert.ok(gex("Seneca/*"+"/*: code1*").on(err.message))

    // no code
    err = si.fail({bar:1})
    assert.equal(err.seneca.code,'unknown')
    assert.equal(err.seneca.valmap.bar,1)
    assert.ok(gex("Seneca/*"+"/*: unknown*").on(err.message))

    // additional meta props dragged along
    err = si.fail({code:'code2',bar:2})
    assert.equal(err.seneca.code,'code2')
    assert.equal(err.seneca.valmap.bar,2)
    assert.ok(gex("Seneca/*"+"/*: code2*").on(err.message))

    // Error
    err = si.fail(new Error('eek'))
    assert.equal(err.seneca.code,'unknown')
    assert.ok(gex("Seneca/*"+"/*: eek").on(err.message))

    // Error with unresolved code
    var erg = new Error('erg')
    erg.code = 'code3'
    err = si.fail(erg)
    assert.equal(err.seneca.code,'code3')
    assert.ok(gex("Seneca/*"+"/*: erg").on(err.message))

    // Error with resolved code
    var erg = new Error('test message')
    erg.code = 'test_msg'
    err = si.fail(erg)
    assert.equal(err.seneca.code,'test_msg')
    assert.ok(gex("Seneca/*"+"/*: Test message.").on(err.message))
  })




  it('failgen.cmd', function(fin) {
    var errhandler

    var si = seneca({
      plugins:['echo','error-test'],
      log:{map:[{level:'error+',handler:function(){
        errhandler.apply(null,common.arrayify(arguments))
      }}]}
    })
    var cblog = ''

    // done after initial creation, overrides command line
    si.options({
      log:{map:[{level:'error+',handler:function(){
        errhandler.apply(null,common.arrayify(arguments))
      }}]}
    })

    //console.log(si.options().log)


    si.act({role:'error-test'},function(err){
      assert.isNull(err)
    })


    next_a()


    function next_a() {
      errhandler = function(){
        assert.equal('callback',arguments[6])
        cblog += 'a'

        next_b()
      }
      si.act({role:'error-test'},function(err){
        throw new Error('inside callback')
      })
    }


    function next_b() {
      errhandler = function(err){
        assert.equal('action-execute',arguments[15])
        cblog += 'B'
      }
      si.act({role:'error-test',how:'fail'},function(err){
        assert.equal('error_code1',err.seneca.code)
        cblog += 'b'
        next_c()
      })
    }


    function next_c() {
      errhandler = function(err){
        assert.equal('action-execute',arguments[15])
        cblog += 'C'
      }
      si.act({role:'error-test',how:'errobj'},function(err){
        assert.equal('an Error object',err.message)
        cblog += 'c'
        next_d()
      })
    }


    function next_d() {
      errhandler = function(err){
        assert.equal('a string error',arguments[15])
        cblog += 'D'
      }
      si.act({role:'error-test',how:'str'},function(err){
        assert.equal('a string error',err.code)
        cblog += 'd'
        next_e()
      })
    }


    function next_e() {
      errhandler = function(err){
        assert.equal('unknown',arguments[15])
        cblog += 'E'
      }
      si.act({role:'error-test',how:'obj'},function(err){
        assert.equal('unknown',err.code)
        cblog += 'e'
        next_f()
      })
    }


    function next_f() {
      errhandler = function(err){
        assert.equal('action-error',arguments[15])
        cblog += 'F'
      }
      si.act({role:'error-test',how:'cb-err'},function(err){
        assert.equal('action-error',err.code)
        cblog += 'f'
        next_g()
      })
    }


    function next_g() {
      errhandler = function(err){
        assert.equal('action-error',arguments[15])
        cblog += 'G'
      }
      si.act({role:'error-test',how:'cb-fail'},function(err){
        assert.equal('action-error',err.code)
        assert.equal('cb-fail',err.seneca.code)
        cblog += 'g'
        next_h()
      })
    }


    function next_h() {
      errhandler = function(err){
        assert.equal('unknown',arguments[15])
        cblog += 'H'
      }
      si.act({role:'error-test',how:'cb-obj'},function(err){
        assert.equal('unknown',err.code)
        cblog += 'h'
        next_i()
      })
    }


    function next_i() {
      var count = 0
      errhandler = function(err){
        0===count && assert.equal('action-error',arguments[15]);
        1===count && assert.equal('callback',arguments[6]);
        count++
        cblog += 'I'
        if( 1 < count ) return finish();
      }
      si.act({role:'error-test',how:'cb-cb-err'},function(err){
        assert.equal('action-error',err.code)
        cblog += 'i'
        throw new Error('inside-cb-cb')
      })
    }


    function finish() {
      assert.equal('aBbCcDdEeFfGgHhIiI',cblog)
      fin()
    }
  })


  it('happy-error',function(fin){
    var si = seneca(testopts)
    si.add('happy_error:1',function(args,done){done(new Error('happy-error'))})
    si.act('happy_error:1',function(err){
      assert.isNotNull(err)
      assert.equal('happy-error',err.message)
      fin()
    })
  })

  it('errhandler',function(fin){
    var tmp = {}

    function grab_all(err) {
      tmp.grab = err
      return true
    }

    function pass_on(err) {
      tmp.pass = err
    }

    var si = seneca(testopts)
    si.add('cmd:grab',function(args,done){
      done(this.fail('grab'))
    })
    si.add('cmd:pass',function(args,done){
      done(this.fail('pass'))
    })

    si.options({errhandler:grab_all})

    si.act('cmd:grab',function(err){
      assert.fail()
    })

    setTimeout(function(){
      assert.isNotNull(tmp.grab)

      si.options({errhandler:pass_on})
      
      si.act('cmd:pass',function(err){
        assert.isNotNull(err)
        assert.isNotNull(tmp.pass)
        fin()
      })
      
    },10)

  })


  it('register', function() {
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
  })



  it('action', function() {
    var si = seneca(testopts)

    var a1 = 0

    si.add({op:'foo'},function(args,cb) {
      a1 = args.a1
      cb(null,'+'+a1)
    })

    si.act({op:'foo',a1:100}, function(err,out) {
      assert.isNull(err)
      assert.equal('+100',out)
      assert.equal(100,a1)
      
      si.act({op:'foo',a1:200}, function(err,out) {
        assert.isNull(err)
        assert.equal('+200',out)
        assert.equal(200,a1)
      })
    })

    try {
      si.add({op:'bar'})
    }
    catch(e) {
      assert.ok(e.message.match(/norma:/))
    }

    try {
      si.add('a:1',function(args,done){},123)
    }
    catch(e) {
      assert.ok(e.message.match(/norma:/))
    }


    // log error expected
    si.act({op:'bad',a1:100}, function(err,out) {
      assert.equal(err.seneca.code,'act_not_found')
    })


    si.act({op:'bad',a1:100,default$:"qaz"}, function(err,out) {
      assert.equal(out,'qaz')
    })

    
    // log error expected
    try {
      si.act()
    }
    catch(e) {
      assert.equal(e.seneca.code,'act_not_found')
    }

    // log error expected
    si.act(function(err,out) {
      assert.equal(err.seneca.code,'act_not_found')
    })
  })



  it('action-override', function(fin) {
    var si = seneca(testopts)
    si.options({errhandler:fin})

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

            fin()
          })
        })
      })
    })

  })



  it('prior-nocache', function(fin){
    var si = seneca({log:'silent',errhandler:fin,trace:{act:false}})
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
              fin()
            })

        })
    })
  })


  it('gating', function(fin){
    var si = seneca({log:'silent',errhandler:fin})
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
        fin()
      })
  })


  


  it('act_if', function(fin) {
    var si = seneca(testopts)

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
      if( err ) return fin(err);

      assert.equal(2,out.b)

      si.act_if( false, 'a:2', function(err,out){
        if( err ) return fin(err);
        assert.fail()
      })

      process.nextTick(fin)
    })
  })


  it('plugins', function() {
    var si = seneca({plugins:['echo'],log:'silent'})

    si.act({role:'echo',baz:'bax'},function(err,out){
      assert.isNull(err)
      assert.equal(''+{baz:'bax'},''+out)
    })


    var si = seneca({plugins:['basic'],log:'silent'})

    si.act({role:'util',cmd:'quickcode'},function(err,code){
      assert.isNull(err)
      assert.equal( 8, code.length )
      assert.isNull( /[ABCDEFGHIJKLMNOPQRSTUVWXYZ]/.exec(code) )
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
      assert.isNull(err)

      si.act({role:'mock1',cmd:'foo',foo:1},function(err,out){
        assert.equal('foo:1',out)
      })
    })


    var si = seneca(testopts)
    var mock1a = new Mock1()
    mock1a.name = 'mock1a'
    si.register(mock1a, function(err){
      assert.isNull(err)

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
      assert.isNull(err)

      si.register( new Mock2(), function(err){
        assert.isNull(err)
        
        si.act({role:'mock1',cmd:'foo',foo:2},function(err,out){
          assert.equal('bar:foo:2',out)
        })
      })
    })


    var si = seneca(testopts)
    si.use('echo')
    si.act({role:'echo',cmd:'foo',bar:1},function(err,out){
      assert.equal( JSON.stringify({cmd:'foo',bar:1}), JSON.stringify(out) )
    })
  })



  it('pin', function() {
    var si = seneca(testopts)

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
    assert.equal("[ { p1: 'v1', p2: 'v2a' }, { p1: 'v1', p2: 'v2b' } ]",util.inspect(acts))
  })



  it('compose', function() {
    var si = seneca(testopts)

    si.add({A:1},function(args,cb){
      cb(null,{x:2})
    })
    si.add({B:1},function(args,cb){
      cb(null,{x:args.x+1})
    })
    si.add({C:1},function(args,cb){
      cb(null,{y:args.y+1})
    })

    si.act({A:1},function(e,r){assert.equal(r.x,2)})
    si.act({B:1,x:1},function(e,r){assert.equal(r.x,2)})

    si.compose({D:1},[{A:1},{B:1}])
    si.act({D:1},function(e,r){assert.equal(r.x,3)})

    si.compose({E:1},[{A:1,modify$:function(res){res.y=res.x}},{C:1}])
    si.act({E:1},function(e,r){assert.equal(r.y,3)})


    si.add({F:1},function(args,cb){
      cb(null,{y:args.y+args.z})
    })
    si.compose({G:1},[{A:1,modify$:function(res,args){res.y=res.x,res.z=args.z}},{F:1}])
    si.act({G:1,z:3},function(e,r){assert.equal(r.y,5)})
  })


  it('fire-and-forget', function() {
    var si = seneca(testopts)
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
  })

  it('strargs', function() {
    var si = seneca(testopts)
    si.add({a:1,b:2},function(args,done){done(null,(args.c||-1)+parseInt(args.b)+parseInt(args.a))})
    si.act({a:1,b:2,c:3},function(err,out){ assert.isNull(err); assert.equal(6,out) })

    si.act('a:1,b:2',{c:3},function(err,out){ assert.isNull(err); assert.equal(6,out) })
    si.act('a:1,b:2',function(err,out){ assert.isNull(err); assert.equal(2,out) })

    // strargs win!!
    si.act('a:1,b:2',{a:2},function(err,out){ assert.isNull(err); assert.equal(2,out) })

    try {
      si.add('a:,b:2',function(args,done){done()})
    }
    catch( e ) {
      assert.equal(e.seneca.code,'add_string_pattern_syntax')
    }

    try {
      si.act('a:,b:2',{c:3},function(err,out){assert.fail()})
    }
    catch( e ) {
      assert.equal(e.seneca.code,'add_string_pattern_syntax')
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
  })


  it('moreobjargs', function(fin) {
    seneca({log:'silent',errhandler:fin})

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

      .act('A:1,B:2,C:33',function(err,out){
        assert.equal(33,out.C)
      })

      .act('x:1,y:3,z:6,k:7',function(err,out){
        assert.equal(7,out.k)
      })

      .ready(function(){

        try {
          this.act('A:1,B:true,C:44')
          assert.fail()
        }
        catch(e) {
          assert.equal('act_invalid_args',e.seneca.code)
          fin()
        }
      })
  })


  it('string-add', function() {
    var si = seneca(testopts)
    si.add("i:0,a:1,b:2",function(args,done){done(null,(args.c||-1)+parseInt(args.b)+parseInt(args.a))})
    si.act("i:0,a:1,b:2,c:3",function(err,out){ assert.isNull(err); assert.equal(6,out) })

    si.add("i:1,a:1",{b:2},function(args,done){done(null,(args.c||-1)+parseInt(args.b)+parseInt(args.a))})
    si.act("i:1,a:1,b:2,c:3",function(err,out){ assert.isNull(err); assert.equal(6,out) })

    si.add("i:2,a:1",{b:2,c:{required$:true}},function(args,done){done(null,(args.c||-1)+parseInt(args.b)+parseInt(args.a))})
    si.act("i:2,a:1,b:2,c:3",function(err,out){ assert.isNull(err); assert.equal(6,out) })
  })



  it('fix', function() {
    var si = seneca(testopts)

    function ab(args,done){done(null,{r:''+args.a+(args.b||'-')+(args.c||'-')+args.z})}

    si
      .fix('a:1')
      .add('b:2',ab)
      .add('c:3',ab)
      .act('b:2,z:8',function(err,out){assert.isNull(err);assert.equal('12-8',out.r)})
      .act('c:3,z:9',function(err,out){assert.isNull(err);assert.equal('1-39',out.r)})

    si
      .act('a:1,b:2,z:8',function(err,out){assert.isNull(err);assert.equal('12-8',out.r)})
      .act('a:1,c:3,z:9',function(err,out){assert.isNull(err);assert.equal('1-39',out.r)})
  })  


  it('parambulator', function() {
    var si = seneca(testopts)

    si.add({a:1,b:'q',c:{required$:true,string$:true}},function(args,done){done(null,{})})

    si.act({a:1,b:'q',c:'c'})
    try { si.act({a:1,b:'q',c:1}); assert.fail() } catch(e) {  }
    try { si.act({a:1,b:'q'}); assert.fail() } catch(e) {  }
  })


  it('error-msgs', function() {
    var si = seneca(testopts)
    assert.ok( 
      gex("Seneca/*/*: TESTING: exists: 111, notfound:[notfound?], str=s, obj={a=1}, arr=[1,2], bool=false, null=null, delete=D, undefined=U, void=V, NaN=N")
        .on(si.fail('test_prop',{
          exists:111,
          str:'s',
          obj:{a:1},
          arr:[1,2],
          bool:false,
          null:null,
          delete:'D',
          undefined:'U',
          void:'V',
          NaN:'N',
        }).message))
  })


  it('act-param', function(){
    var si = seneca(testopts)

    si.add({a:1,b:{integer$:true}},function(args,done){
      if( !_.isNumber(args.b) ) return assert.fail();
      done(null,{a:1+args.b})
    })

    si.act({a:1,b:1},function(err,out){
      assert.isNull(err)
      assert.equal(2,out.a)
    })

    try {
      si.act({a:1,b:"b"},function(err,out){
        assert.fail()
      })
    }
    catch(e){
      assert.equal('act_invalid_args',e.seneca.code)
      assert.equal(': Invalid action arguments; The property \'b\', with current value: \'b\', must be a integer (parent: top level).; arguments were: "{a=1,b=b}".',e.message.substring(e.message.indexOf(':')))
    }

    try {
      si.add({a:1,b:{notatypeatallatall$:true}},function(args,done){
        assert.fail()
      })
    }
    catch(e){
      assert.ok(e.message.match(/Parambulator: Unknown rule/))
    }

  })


  it('sub', function(fin){
    var si = seneca(testopts,{errhandler:fin})

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
      if(err) return fin(err);
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
        if(err) return fin(err);

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
          if(err) return fin(err);

          assert.equal(1,out.b)
          assert.equal(3,tmp.a)
          assert.equal(2,tmp.as1)
          assert.equal(1,tmp.as2)

          assert.ok( 0 < tmp.all )

          fin()
        })
      })
    })
  })


  it('act-cache', function(fin){
    var si = seneca(testopts)

    var x = 0

    si.add({a:1},function(args,done){
      x++;this.good({x:x})
    })

    si.act({a:1},function(err,out){ 
      if(err) return fin(err);
      assert.equal(1,out.x) 
    })

    si.act({actid$:'a',a:1},function(err,out){ 
      if(err) return fin(err);

      assert.equal(2,out.x)

      si.act({a:1},function(err,out){ 
        if(err) return fin(err);

        assert.equal(3,out.x)

        si.act({actid$:'a',a:1},function(err,out){ 
          if(err) return fin(err);

          assert.equal(2,out.x) 

          si.act('role:seneca,stats:true',function(err,stats){
            if(err) return fin(err);

            assert.equal( '{ calls: 7, done: 7, fails: 0, cache: 1 }',
                          util.inspect(stats.act))
            fin()
          })
        })
      })
    })
  })


  it('zig', function(fin){
    var si = seneca(testopts)
    si.options({errhandler:fin})

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
          if(e) return fin(e);
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
          if(e) return fin(e);
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
          if(e) return fin(e);
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
          fin(e)
        })
    }

  })


  it('wrap',function(fin){
    var si = seneca(testopts)
    si.options({errhandler:fin})

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
      .start(fin)

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


  it('meta',function(fin){
    var si = seneca(testopts)
    si.options({errhandler:fin})

    var meta = {}

    si.add('a:1',function(args,done){
      //console.log(args)
      meta.a = args.meta$
      done(null,{aa:args.aa})
    })

    si.add('b:2',function(args,done){
      //console.log(args)
      meta.b = args.meta$
      done(null,{bb:args.bb})
    })

    si.start(fin)
      .wait('a:1')
      .wait('b:2')
      .end(function(err){
        if(err) return fin(err);

        assert.equal( 'a:1', meta.a.pattern )
        assert.equal( 'b:2', meta.b.pattern )
        fin()
      })
  })
})

