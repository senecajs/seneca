/* Copyright (c) 2013-2014 Richard Rodger */
"use strict";

var spawn = require('child_process').spawn

var seneca_module = require('../..')


var assert = require('chai').assert
var gex    = require('gex')



function check(init,name,val,lit) {
  var fn = function(options) {
    //console.log('check',options)

    assert.equal(''+val,''+options.val)
    assert.equal(''+lit,''+options.lit)

    this.add({init:name},function(args,done){
      init.called=true
      done()
    })

    this.add({cmd:'zed'},function(args,done){
      done(null,{res:options.val+'~'+options.lit})
    })

    //console.log('PE')
  }
  return {name:name,init:fn}
}


describe('options', function(){


  it('options-happy', function(){
    var si = seneca_module({a:1, test:{silent:true}})
    assert.equal(1,si.export('options').a)

    si.use('options',{b:2})
    assert.equal(1,si.export('options').a)
    assert.equal(2,si.export('options').b)
  })


  // options from js object (loaded elsewhere)

  it('plugin-options-from-global', function(done) {
    var si = seneca_module({test:{silent:true}})

    // insure cmd:init called
    var init = {}

    // global options
    si.use('options',{foo:{val:'bar'}})
    assert.equal('bar',si.export('options').foo.val)

    //console.log('export',si.export('options'))
    //return done()

    // dynamically create plugin, no literal options
    si.use( check(init,'foo','bar') )


    si.ready(function(err){
      if(err) return done(err);
      //console.log('AAA',init)
      assert.ok(init.called)



      // ensure actions can see all options after ready
      si.act('cmd:zed',function(err,out){
        if(err) return done(err);
        //console.log(err,out)

        assert.equal('bar~undefined',out.res)
        done()
      })
    })
  })

/*
  it('object-lit', function(done) {
    var si = seneca_module(seneca_module({test:{silent:true}}))
    var init = {}
    si.use('options',{object:{test:'object'}})

    // dynamically create plugin, with literal options
    si.use( check(init,'object','bar'), {lit:'bar'} )
    si.ready(function(err){
      if(err) return done(err);
      assert.ok(init.called)

      si.act('cmd:foo',function(err,out){
        if(err) return done(err);
        assert.equal('object~bar',out.foo)
        done()
      })
    })
  })


  // options from file

  it('file', function(done) {
    var si = seneca_module(seneca_module({test:{silent:true}}))
    var init = {}
    si.use('options','options.file.json')
    si.use( check(init,'file') )
    si.ready(function(err){
      if(err) return done(err);
      assert.ok(init.called)

      si.act('cmd:foo',function(err,out){
        if(err) return done(err);
        assert.equal('file~undefined',out.foo)
        done()
      })
    })
  })

  it('file-lit', function(done) {
    var si = seneca_module(seneca_module({test:{silent:true}}))
    var init = {}
    si.use('options','options.file.json')
    si.use( check(init,'file','bar'), {lit:'bar'} )
    si.ready(function(err){
      if(err) return done(err);
      assert.ok(init.called)

      si.act('cmd:foo',function(err,out){
        if(err) return done(err);
        assert.equal('file~bar',out.foo)
        done()
      })
    })
  })


  // options from require

  it('require', function(done) {
    var si = seneca_module(seneca_module({test:{silent:true}}))
    var init = {}
    si.use('options','options.require.js')
    si.use( check(init,'require') )
    si.ready(function(err){
      if(err) return done(err);
      assert.ok(init.called)

      si.act('cmd:foo',function(err,out){
        if(err) return done(err);
        assert.equal('require~undefined',out.foo)
        done()
      })
    })
  })

  it('require-lit', function(done) {
    var si = seneca_module(seneca_module({test:{silent:true}}))
    var init = {}
    si.use('options','options.require.js')
    si.use( check(init,'require','bar'), {lit:'bar'} )
    si.ready(function(err){
      if(err) return done(err);
      assert.ok(init.called)

      si.act('cmd:foo',function(err,out){
        if(err) return done(err);
        assert.equal('require~bar',out.foo)
        done()
      })
    })
  })


  // options from default ./seneca.options.js

  it('default', function(done) {
    var si = seneca_module(seneca_module({test:{silent:true}}))
    var init = {}
    si.use('options')
    si.use( check(init,'default') )
    si.ready(function(err){
      if(err) return done(err);
      assert.ok(init.called)

      si.act('cmd:foo',function(err,out){
        if(err) return done(err);
        assert.equal('default~undefined',out.foo)
        done()
      })
    })
  })

  it('default-lit', function(done) {
    var si = seneca_module(seneca_module({test:{silent:true}}))
    var init = {}
    si.use('options')
    si.use( check(init,'default','bar'), {lit:'bar'} )
    si.ready(function(err){
      if(err) return done(err);
      assert.ok(init.called)

      si.act('cmd:foo',function(err,out){
        if(err) return done(err);
        assert.equal('default~bar',out.foo)
        done()
      })
    })
  })
*/
})

