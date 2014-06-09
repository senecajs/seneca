/* Copyright (c) 2010-2014 Richard Rodger, MIT License */
"use strict";


// mocha seneca.test.js

var VERSION = '0.5.17'

var util   = require('util')
var stream = require('stream')


var common   = require('../lib/common')
var seneca   = require('../lib/seneca')


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
    var si = seneca(testopts)
    assert.equal(si.version,VERSION)
  })



  it('quick', function(){
    var si = seneca(testopts)
    si.use(function quickplugin(si,opts,cb){
      si.add({a:1},function(args,cb){cb(null,{b:2})})
      cb()
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



  it('ready', function(fin){
    var mark = {ec:0}

    timerstub.setTimeout(function(){
      //console.log(mark)

      assert.ok(mark.r0)
      assert.ok(mark.r1)
      assert.ok(mark.p1)
      assert.ok(mark.p2)
      assert.ok(1===mark.ec)

      fin()
    },60)


    var si = seneca(testopts)
    si.ready(function(){
      mark.r0=true

      si.use(function p1(opts){
        si.add({init:'p1'},function(args,done){timerstub.setTimeout(function(){mark.p1=true;done()},20)})
      })

      si.on('ready',function(){
        mark.ec++
      })

      si.ready(function(){
        mark.r1=true


        si.use(function p2(opts){
          si.add({init:'p2'},function(args,done){timerstub.setTimeout(function(){mark.p2=true;done()},20)})
        })
      })
    })

    timerstub.wait(80)
  })


  it('failgen.meta.happy', function() {
    var si = seneca({
      test:{silent:true}
    })
    
    // nothing
    var err = si.fail()
    assert.equal(err.seneca.code,'unknown')
    assert.ok(gex("Seneca/*"+"/*: unknown").on(err.message))

    // unresolved code gets used as message
    err = si.fail('code1')
    assert.equal(err.seneca.code,'code1')
    assert.ok(gex("Seneca/*"+"/*: code1").on(err.message))

    // additional values
    err = si.fail('code1',{foo:'a'})
    assert.equal(err.seneca.code,'code1')
    assert.equal(err.seneca.valmap.foo,'a')
    assert.ok(gex("Seneca/*"+"/*: code1").on(err.message))

    // no code
    err = si.fail({bar:1})
    assert.equal(err.seneca.code,'unknown')
    assert.equal(err.seneca.valmap.bar,1)
    assert.ok(gex("Seneca/*"+"/*: unknown").on(err.message))

    // additional meta props dragged along
    err = si.fail({code:'code2',bar:2})
    assert.equal(err.seneca.code,'code2')
    assert.equal(err.seneca.valmap.bar,2)
    assert.ok(gex("Seneca/*"+"/*: code2").on(err.message))

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
        assert.equal('callback',arguments[5])
        cblog += 'a'

        next_b()
      }
      si.act({role:'error-test'},function(err){
        throw new Error('inside callback')
      })
    }


    function next_b() {
      errhandler = function(err){
        assert.equal('task-execute',arguments[7])
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
        assert.equal('task-execute',arguments[7])
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
        assert.equal('a string error',arguments[7])
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
        assert.equal('unknown',arguments[7])
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
        assert.equal('task-error',arguments[7])
        cblog += 'F'
      }
      si.act({role:'error-test',how:'cb-err'},function(err){
        assert.equal('task-error',err.code)
        cblog += 'f'
        next_g()
      })
    }


    function next_g() {
      errhandler = function(err){
        assert.equal('task-error',arguments[7])
        cblog += 'G'
      }
      si.act({role:'error-test',how:'cb-fail'},function(err){
        assert.equal('task-error',err.code)
        assert.equal('cb-fail',err.seneca.code)
        cblog += 'g'
        next_h()
      })
    }


    function next_h() {
      errhandler = function(err){
        assert.equal('unknown',arguments[7])
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
        0===count && assert.equal('task-error',arguments[7]);
        1===count && assert.equal('callback',arguments[5]);
        count++
        cblog += 'I'
        if( 1 < count ) return finish();
      }
      si.act({role:'error-test',how:'cb-cb-err'},function(err){
        assert.equal('task-error',err.code)
        cblog += 'i'
        throw new Error('inside-cb-cb')
      })
    }


    function finish() {
      assert.equal('aBbCcDdEeFfGgHhIiI',cblog)
      fin()
    }
  })



  it('register', function() {
    var si = seneca(testopts)

    var initfn = function(){}
    var emptycb = function(){}

    try { si.register() } catch( e ) { 
      assert.equal('register_invalid_plugin',e.seneca.code)
    }


    try { si.register({}) } catch( e ) { 
      assert.equal('register_invalid_plugin',e.seneca.code)
      //assert.equal("Seneca: register(plugin): The property 'name' is missing and is always required (parent: plugin).",e.message)
    }

    try { si.register({},emptycb) } catch( e ) { 
      assert.equal('register_invalid_plugin',e.seneca.code)
      //assert.equal("Seneca: register(plugin): The property 'name' is missing and is always required (parent: plugin).",e.message)
    }

    try { si.register({name:1,init:initfn},emptycb) } catch( e ) { 
      assert.equal('register_invalid_plugin',e.seneca.code)
    }
    
    try { si.register({name:'a',init:'b'},emptycb) } catch( e ) { 
      assert.equal('register_invalid_plugin',e.seneca.code)
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


    si.act({op:'bad',a1:100}, function(err,out) {
      assert.equal(err.seneca.code,'act_not_found')
    })


    si.act({op:'bad',a1:100,default$:"qaz"}, function(err,out) {
      assert.equal(out,'qaz')
    })

    
    try {
      si.act()
    }
    catch(e) {
      assert.equal(e.seneca.code,'act_not_found')
    }

    si.act(function(err,out) {
      assert.equal(err.seneca.code,'act_not_found')
    })
  })



  it('action-override', function() {
    var si = seneca(testopts)

    function foo(args,done) {
      done(null,{a:args.a,s:this.toString()})
    }

    function bar(args,done) {
      this.prior(args,function(e,o){
        o.b=2
        done(e,o)
      })
    }
    

    si.add({op:'foo'},foo)
    si.act('op:foo,a:1',function(e,o){
      assert.ok(gex('1~Seneca/0.5.*'+'/*').on(''+o.a+'~'+o.s))
    })

    si.add({op:'foo'},bar)
    si.act('op:foo,a:1',function(e,o){
      assert.ok(gex('1~2~Seneca/0.5.*'+'/*').on(''+o.a+'~'+o.b+'~'+o.s))
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
    var si = seneca({plugins:['echo'],test:{silent:true}})

    si.act({role:'echo',baz:'bax'},function(err,out){
      assert.isNull(err)
      assert.equal(''+{baz:'bax'},''+out)
    })


    var si = seneca({plugins:['util'],test:{silent:true}})

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


  it('declare', function(){
    var si = seneca(testopts)

    var init = false

    var foo = function(){
      this.add({a:1},function(args,done){done.good({b:args.b})})
      this.add({init:'foo'},function(args,done){init=true;this.good()})
      return 'foo'
    }

    si.use(foo)
    si.ready(function(){
      assert.ok(init)

      si.hasact({a:1})

      si = seneca(testopts)
      init = false

      si.declare(foo)
      si.ready(function(){
        assert.ok(!init)

        si.hasact({a:1})
      })
    })
  })



  it('sub', function(fin){
    var si = seneca(testopts)

    var tmp = {a:0,as1:0,as2:0}

    si.add({a:1},function(args,done){
      tmp.a = tmp.a+1
      done(null,{b:1})
    })

    si.act({a:1},function(err,out) {
      if(err) return fin(err);
      assert.equal(1,out.b)
      assert.equal(1,tmp.a)
      assert.equal(0,tmp.as1)
      assert.equal(0,tmp.as2)

      si.sub({a:1},function(args){
        tmp.as1 = tmp.as1+1
      })

      si.act({a:1},function(err,out) {
        if(err) return fin(err);

        assert.equal(1,out.b)
        assert.equal(2,tmp.a)
        assert.equal(1,tmp.as1)
        assert.equal(0,tmp.as2)

        si.sub({a:1},function(args){
          tmp.as2 = tmp.as2+1
        })

        si.act({a:1},function(err,out) {
          if(err) return fin(err);

          assert.equal(1,out.b)
          assert.equal(3,tmp.a)
          assert.equal(2,tmp.as1)
          assert.equal(1,tmp.as2)

          fin()
        })
      })
    })
  })

})

