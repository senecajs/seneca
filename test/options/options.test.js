/* Copyright (c) 2013-2014 Richard Rodger */
"use strict";

var seneca = require('../..')


var assert = require('chai').assert
var gex    = require('gex')



describe('options', function(){


  it('options-happy', function(){
    // loads ./seneca.options.js as well
    var si = seneca({d:4, foo:{dd:4}, test:{silent:true}})

    var opts = si.options()
    //console.dir(si.options())
    assert.equal(1,opts.a)
    assert.equal(4,opts.d)
    assert.equal(1,opts.foo.aa)
    assert.equal(4,opts.foo.dd)

    var opts = si.export('options')
    assert.equal(1,opts.a)
    assert.equal(4,opts.d)
    assert.equal(1,opts.foo.aa)
    assert.equal(4,opts.foo.dd)
  })


  it('options-getset', function(){
    var si = seneca({d:4, foo:{dd:4}, test:{silent:true}})

    si.options({e:5,foo:{ee:5}})

    var opts = si.options()
    assert.equal(1,opts.a)
    assert.equal(4,opts.d)
    assert.equal(5,opts.e)
    assert.equal(1,opts.foo.aa)
    assert.equal(4,opts.foo.dd)
    assert.equal(5,opts.foo.ee)

    var opts = si.export('options')
    assert.equal(1,opts.a)
    assert.equal(4,opts.d)
    assert.equal(5,opts.e)
    assert.equal(1,opts.foo.aa)
    assert.equal(4,opts.foo.dd)
    assert.equal(5,opts.foo.ee)
  })


  it('options-legacy', function(){
    var si = seneca({d:4, foo:{dd:4}, test:{silent:true}})

    si.use('options',{e:5,foo:{ee:5}})

    var opts = si.options()
    assert.equal(1,opts.a)
    assert.equal(4,opts.d)
    assert.equal(5,opts.e)
    assert.equal(1,opts.foo.aa)
    assert.equal(4,opts.foo.dd)
    assert.equal(5,opts.foo.ee)

    var opts = si.export('options')
    assert.equal(1,opts.a)
    assert.equal(4,opts.d)
    assert.equal(5,opts.e)
    assert.equal(1,opts.foo.aa)
    assert.equal(4,opts.foo.dd)
    assert.equal(5,opts.foo.ee)
  })


  it('options-file-js', function(){
    var si0 = seneca({d:4, foo:{dd:4}, test:{silent:true}})

    si0.options('./options.require.js')

    var opts = si0.options()
    //console.dir(opts)
    assert.equal(1,opts.a)
    assert.equal(4,opts.d)
    assert.equal(2,opts.b)
    assert.equal(1,opts.foo.aa)
    assert.equal(4,opts.foo.dd)
    assert.equal(2,opts.foo.bb)

    var opts = si0.export('options')
    assert.equal(1,opts.a)
    assert.equal(4,opts.d)
    assert.equal(2,opts.b)
    assert.equal(1,opts.foo.aa)
    assert.equal(4,opts.foo.dd)
    assert.equal(2,opts.foo.bb)
  })


  it('options-file-json', function(){
    var si0 = seneca({d:4, foo:{dd:4}, test:{silent:true}})

    si0.options(__dirname+'/options.file.json')

    var opts = si0.options()
    //console.dir(opts)
    assert.equal(1,opts.a)
    assert.equal(4,opts.d)
    assert.equal(3,opts.c)
    assert.equal(1,opts.foo.aa)
    assert.equal(4,opts.foo.dd)
    assert.equal(3,opts.foo.cc)

    var opts = si0.export('options')
    assert.equal(1,opts.a)
    assert.equal(4,opts.d)
    assert.equal(3,opts.c)
    assert.equal(1,opts.foo.aa)
    assert.equal(4,opts.foo.dd)
    assert.equal(3,opts.foo.cc)
  })


  // TODO: failure modes

/*
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

