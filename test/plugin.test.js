/* Copyright (c) 2013-2015 Richard Rodger, MIT License */
"use strict";


// mocha plugin.test.js

var util   = require('util')
var assert = require('assert')

var _   = require('lodash')

var seneca = require('..')


describe('plugin', function(){

  it('bad', function() {
    var si = seneca({
      // this lets you change undead per test
      debug:{
        undead:true
      },
      log:'silent'
    })
    
    try { si.use( {foo:1} ) } catch( e ) {
      assert.ok(e.seneca)
      assert.equal('plugin_no_name',e.code)
    }

    try { si.use( 'not-a-plugin-at-all-at-all' ) } catch( e ) {
      assert.ok(e.seneca)
      assert.equal('plugin_not_found',e.code)
    }
  })


  it('depends', function() {
    var si = seneca({
      // this lets you change undead per test
      debug:{
        undead: true
      },
      log:'silent'
    })
    
    si.use( function(){
      return {name:'aaa'}
    })

    si.use( function(){
      this.depends('bbb',['aaa'])
      return {name:'bbb'}
    })


    si.options({errhandler:function(err){
      assert.equal('plugin_required',err.code)
    }})

    si.use( function(opts){
      this.depends('ccc',['zzz'])
      return {name:'ccc'}
    })


    si.use( function(opts){
      return {name:'ddd'}
    })

    si.use( function(opts){
      this.depends('eee','aaa')
      return {name:'eee'}
    })

    si.use( function(opts){
      this.depends('fff',['aaa','ddd'])
      return {name:'fff'}
    })

    si.use( function(opts){
      this.depends('ggg','aaa','ddd')
      return {name:'ggg'}
    })


    si.use( function(opts){
      this.depends('hhh','aaa','zzz')
      return {name:'hhh'}
    })
  })


  it('fix', function(fin){
    var si = seneca({log:'silent',errhandler:fin})

    function echo(args,done){done(null,_.extend({t:Date.now()},args))}
    
    var plugin_aaa = function(opts){
      this.add({a:1},function(args,done){
        this.act('z:1',function(err,out){
          done(null,_.extend({a:1},out))
        })
      })
      return 'aaa'
    }

    si.add({z:1},echo)
    si.use(plugin_aaa)

    assert.ok(si.hasact({z:1}))

    si.act({a:1},function(err,out){
      assert.ok( null == err )
      assert.equal(1,out.a)
      assert.equal(1,out.z)
      assert.ok(out.t)
      assert.ok(si.hasact({a:1}))


      si
        .fix({q:1})
        .use(function(opts){
          this.add({a:1},function(args,done){
            this.act('z:1',function(err,out){
              done(null,_.extend({a:1,w:1},out))
            })
          })
          return 'bbb'
        })

      assert.ok(si.hasact({a:1}))
      assert.ok(si.hasact({a:1,q:1}))

      si.act({a:1},function(err,out){
        assert.ok( null == err )
        assert.equal(1,out.a)
        assert.equal(1,out.z)
        assert.ok(out.t)

        si.act({a:1,q:1},function(err,out){
          assert.ok( null == err )
          assert.equal(1,out.a)
          assert.equal(1,out.z)
          assert.equal(1,out.w)
          assert.ok(out.t)

          fin()
        })
      })
    })


  })


  it('export',function(){
    var si = seneca({
      // this lets you change undead per test
      debug:{
        undead: true
      },
      log:'silent'
    })

    si.use(function badexport(){})

    si.options({errhandler:function(err){
      assert.equal('export_not_found',err.code)
    }})

    si.export('not-an-export')
  })


  it('hasplugin',function(){
    var si = seneca({log:'silent'})

    si.use(function foo(){})
    si.use({init:function(){},name:'bar',tag:'aaa'})
    
    assert.ok( si.hasplugin('foo') )
    assert.ok( si.hasplugin('foo','') )
    assert.ok( si.hasplugin('foo','-') )

    assert.ok( !si.hasplugin('bar') )
    assert.ok( !si.hasplugin('bar','') )
    assert.ok( !si.hasplugin('bar','-') )
    assert.ok( !si.hasplugin('bar','bbb') )
    assert.ok( si.hasplugin('bar','aaa') )

  })

})
