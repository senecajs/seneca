/* Copyright (c) 2010-2013 Richard Rodger */
"use strict";


// mocha seneca.test.js


var util = require('util')

var common   = require('../lib/common')
var seneca   = require('../lib/seneca')


var assert  = require('chai').assert
var gex     = require('gex')


var testopts = {test:{silent:true}}


describe('seneca', function(){

  it('version', function(){
    var si = seneca(testopts)
    assert.equal(si.version,'0.5.14')
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
    require('..').use('echo')
    require('..')(testopts).use('echo')
  })



  it('ready', function(fin){
    var mark = {ec:0}

    setTimeout(function(){
      assert.ok(mark.r0)
      assert.ok(mark.r1)
      assert.ok(mark.p1)
      assert.ok(mark.p2)
      assert.ok(mark.ec==1)

      fin()
    },666)


    var si = seneca(testopts)
    si.ready(function(err){
      assert.isNull(err)
      mark.r0=true

      si.use(function p1(opts){
        si.add({init:'p1'},function(args,done){setTimeout(function(){mark.p1=true;done()},222)})
      })

      si.ready(function(err){
        assert.isNull(err)
        mark.r1=true

        si.on('ready',function(err){
          assert.isNull(err)
          mark.ec++
        })

        si.use(function p2(opts){
          si.add({init:'p2'},function(args,done){setTimeout(function(){mark.p2=true;done()},222)})
        })
      })
    })
  })


  it('failgen.meta.happy', function() {
    var si = seneca({
      test:{silent:true},
      message:{
        seneca: {
          msg1:'Message one'
        }
      }
    })
    
    // nothing
    var err = si.fail()
    assert.equal(err.seneca.code,'unknown')
    assert.ok(gex("Seneca/*/*: unknown").on(err.message))

    // unresolved code gets used as message
    err = si.fail('code1')
    assert.equal(err.seneca.code,'code1')
    assert.ok(gex("Seneca/*/*: code1").on(err.message))

    // additional values
    err = si.fail('code1',{foo:'a'})
    assert.equal(err.seneca.code,'code1')
    assert.equal(err.seneca.valmap.foo,'a')
    assert.ok(gex("Seneca/*/*: code1").on(err.message))

    // no code
    err = si.fail({bar:1})
    assert.equal(err.seneca.code,'unknown')
    assert.equal(err.seneca.valmap.bar,1)
    assert.ok(gex("Seneca/*/*: unknown").on(err.message))

    // additional meta props dragged along
    err = si.fail({code:'code2',bar:2})
    assert.equal(err.seneca.code,'code2')
    assert.equal(err.seneca.valmap.bar,2)
    assert.ok(gex("Seneca/*/*: code2").on(err.message))

    // Error
    err = si.fail(new Error('eek'))
    assert.equal(err.seneca.code,'unknown')
    assert.ok(gex("Seneca/*/*: eek").on(err.message))

    // Error with unresolved code
    var erg = new Error('erg')
    erg.code = 'code3'
    err = si.fail(erg)
    assert.equal(err.seneca.code,'code3')
    assert.ok(gex("Seneca/*/*: erg").on(err.message))

    // Error with resolved code
    var erg = new Error('erg')
    erg.code = 'msg1'
    err = si.fail(erg)
    assert.equal(err.seneca.code,'msg1')
    assert.ok(gex("Seneca/*/*: Message one").on(err.message))
  })




  it('failgen.cmd', function() {
    var si = seneca({test:{silent:true},plugins:['echo','error-test']})

    si.act({role:'error-test'},function(err){
      assert.isNull(err)
    })

    try {
      si.act({role:'error-test'},function(err){
        throw new Error('inside callback')
      })
      assert.fail()
    }
    catch(e) {
      assert.equal(e.seneca.code,'seneca/act_callback_error')
    }

    var cblog = ''

    si.act({role:'error-test',how:'fail'},function(err){
      assert.equal('error_code1',err.seneca.code)
      cblog += 'a'
    })

    si.act({role:'error-test',how:'msg'},function(err){
      assert.equal('an error message',err.seneca.code)
      assert.ok(gex('Seneca/*/*: an error message').on(err.message))
      cblog += 'b'
    })

    si.act({role:'error-test',how:'errobj'},function(err){
      assert.equal('seneca/act_error',err.seneca.code)
      assert.ok(gex('Seneca/*/*: an Error object').on(err.message))
      cblog += 'c'
    })

    si.act({role:'error-test',how:'str'},function(err){
      assert.equal('seneca/act_error',err.seneca.code)
      assert.ok(gex('Seneca/*/*: a string error').on(err.message))
      cblog += 'd'
    })

    si.act({role:'error-test',how:'obj'},function(err){
      assert.equal('seneca/act_error',err.seneca.code)
      assert.ok(gex('Seneca/*/*: {error=an object}').on(err.message))
      cblog += 'e'
    })

    assert.equal('abcde',cblog)
  })



  it('register', function() {
    var si = seneca(testopts)

    var initfn = function(){}
    var emptycb = function(){}

    try { si.register() } catch( e ) { 
      //console.log(e)
      assert.equal('seneca/register_invalid_plugin',e.seneca.code)
    }


    try { si.register({}) } catch( e ) { 
      //console.log(e)
      assert.equal('seneca/register_invalid_plugin',e.seneca.code)
      //assert.equal("Seneca: register(plugin): The property 'name' is missing and is always required (parent: plugin).",e.message)
    }

    try { si.register({},emptycb) } catch( e ) { 
      //console.log(e)
      assert.equal('seneca/register_invalid_plugin',e.seneca.code)
      //assert.equal("Seneca: register(plugin): The property 'name' is missing and is always required (parent: plugin).",e.message)
    }

    try { si.register({name:1,init:initfn},emptycb) } catch( e ) { 
      assert.equal('seneca/register_invalid_plugin',e.seneca.code)
    }
    
    try { si.register({name:'a',init:'b'},emptycb) } catch( e ) { 
      //console.log(e)
        assert.equal('seneca/register_invalid_plugin',e.seneca.code)
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
      assert.equal(e.seneca.code,'add_action_function_expected')
    }

    try {
      si.add('a:1',function(args,done){},123)
    }
    catch(e) {
      assert.equal(e.seneca.code,'add_action_metadata_not_an_object')
    }

  })



  it('action-override', function() {
    var si = seneca(testopts)

    function foo(args,done) {
      done(null,{a:args.a,s:this.toString()})
    }

    function bar(args,done) {
      this.parent(args,function(e,o){
        o.b=2
        done(e,o)
      })
    }
    

    // NOTE: this test should fail once all actions are made properly async, so leaving it in place to verify this

    si.add({op:'foo'},foo)
    si.act('op:foo,a:1',function(e,o){
      assert.ok(gex('1~Seneca/0.5.*/*').on(''+o.a+'~'+o.s))
    })



    si.add({op:'foo'},bar)
    si.act('op:foo,a:1',function(e,o){
      assert.ok(gex('1~2~Seneca/0.5.*/*').on(''+o.a+'~'+o.b+'~'+o.s))
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
      //console.log('a'+args.p3)
      log.push('a'+args.p3)
      cb(null,{p3:args.p3})
    })

    si.add({p1:'v1',p2:'v2b'},function(args,cb){
      //console.log('b'+args.p3)
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



  it('strargs', function() {
    var si = seneca(testopts)
    si.add({a:1,b:2},function(args,done){done(null,(args.c||-1)+parseInt(args.b)+parseInt(args.a))})
    si.act({a:1,b:2,c:3},function(err,out){ assert.isNull(err); assert.equal(6,out) })

    si.act('a:1,b:2',{c:3},function(err,out){ assert.isNull(err); assert.equal(6,out) })
    si.act('a:1,b:2',function(err,out){ assert.isNull(err); assert.equal(2,out) })


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
      assert.equal(e.seneca.code,'act_string_args_syntax')
    }


    try {
      si.add('a:1,b:2',"bad-arg",function(args,done){done()})
    }
    catch( e ) {
      assert.equal(e.seneca.code,'add_pattern_object_expected_after_string_pattern')
    }

    try {
      si.add(123,function(args,done){done()})
    }
    catch( e ) {
      assert.equal(e.seneca.code,'add_pattern_object_expected')
    }
  })



  it('string-add', function() {
    var si = seneca(testopts)
    si.add("i:0,a:1,b:2",function(args,done){done(null,(args.c||-1)+parseInt(args.b)+parseInt(args.a))})
    si.act("i:0,a:1,b:2,c:3",function(err,out){ assert.isNull(err); assert.equal(6,out) })

    si.add("i:1,a:1",{b:2},function(args,done){done(null,(args.c||-1)+parseInt(args.b)+parseInt(args.a))})
    si.act("i:1,a:1,b:2,c:3",function(err,out){ assert.isNull(err); assert.equal(6,out) })

    si.add("i:2,a:1",{b:2},{a:'required$'},function(args,done){done(null,(args.c||-1)+parseInt(args.b)+parseInt(args.a))})
    si.act("i:2,a:1,b:2,c:3",function(err,out){ assert.isNull(err); assert.equal(6,out) })

    si.add({i:3,a:1,b:2},{a:'required$'},function(args,done){done(null,(args.c||-1)+parseInt(args.b)+parseInt(args.a))})
    si.act("i:3,a:1,b:2,c:3",function(err,out){ assert.isNull(err); assert.equal(6,out) })
  })
})

