/* Copyright (c) 2013 Richard Rodger */
"use strict";

var spawn = require('child_process').spawn

var seneca_module = require('../..')


var assert = require('chai').assert
var gex    = require('gex')



function check(init,val,lit) {
  var fn = function(options) {
    assert.equal(''+val,''+options.test)
    assert.equal(''+lit,''+options.lit)

    this.add({init:val},function(args,done){
      init.called=true
      done()
    })
    this.add({cmd:'foo'},function(args,done){
      done(null,{foo:options.test+'~'+options.lit})
    })
    return {name:val}
  }
  return {name:val,init:fn}
}

describe('options', function(){

  // options from js object (loaded elsewhere)

  it('object', function(done) {
    var si = seneca_module()

    // insure cmd:init called
    var init = {}

    // global options
    si.use('options',{object:{test:'object'}})

    // dynamically create plugin, no literal options
    si.use( check(init,'object') )

    si.ready(function(err){
      if(err) return done(err);
      assert.ok(init.called)

      // ensure actions can see all options after ready
      si.act('cmd:foo',function(err,out){
        if(err) return done(err);
        assert.equal('object~undefined',out.foo)
        done()
      })
    })
  })

  it('object-lit', function(done) {
    var si = seneca_module()
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
    var si = seneca_module()
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
    var si = seneca_module()
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
    var si = seneca_module()
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
    var si = seneca_module()
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
    var si = seneca_module()
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
    var si = seneca_module()
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


/*
  it('web', function(done) {
    spawn('node',['options.server.js'])
      .on('error',function(){console.log(arguments)})
    setTimeout(function() {

    var si = seneca_module()
    var init = {}
    si.use('options','http://localhost:62626/')
    si.use( check(init,'web') )
    si.ready(function(err){
      if(err) return done(err);
      assert.ok(init.called)

      si.act('cmd:foo',function(err,out){
        if(err) return done(err);
        assert.equal('web~undefined',out.foo)

        var si = seneca_module()
        var init = {}
        si.use('options','http://localhost:62626/')
        si.use( check(init,'web','bar'), {lit:'bar'} )
        si.ready(function(err){
          if(err) return done(err);
          assert.ok(init.called)

          si.act('cmd:foo',function(err,out){
            if(err) return done(err);
            assert.equal('web~bar',out.foo)

            done()
          })
        })
      })
    })
    },500)
  })
 */

})

