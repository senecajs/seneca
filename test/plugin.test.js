/* Copyright (c) 2013-2014 Richard Rodger */
"use strict";


// mocha plugin.test.js

var util   = require('util')

var _   = require('underscore')

var seneca   = require('..')

var assert  = require('chai').assert


describe('plugin', function(){

  it('bad', function() {
    var si = seneca({
      // this lets you change stayalive per test
      test:{
        silent:    true,
        stayalive: true
      }
    })
    
    try { si.use( {foo:1} ) } catch( e ) {
      assert.equal('plugin_no_name',e.seneca.code)
    }

    /* TODO: may not be needed
    try { si.use( {name:'foo',init:1} ) } catch( e ) {
      assert.equal('plugin_bad_init',e.seneca.code)
    }
     */

    try { si.use( 'not-a-plugin-at-all-at-all' ) } catch( e ) {
      assert.equal('plugin_not_found',e.seneca.code)
    }
  })


  it('depends', function() {
    var si = seneca({
      // this lets you change stayalive per test
      test:{
        silent:    true,
        stayalive: true
      }
    })
    
    si.use( function(){
      return {name:'aaa'}
    })

    si.use( function(){
      this.depends('bbb',['aaa'])
      return {name:'bbb'}
    })


    try {
      si.use( function(opts){
        this.depends('ccc',['zzz'])
        return {name:'ccc'}
      })
      assert.fail()
    }
    catch( e ) {
      assert.equal('plugin_required',e.seneca.code)
    }

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

    try {
      si.use( function(opts){
        this.depends('hhh','aaa','zzz')
        return {name:'hhh'}
      })
    }
    catch(e) {
      assert.equal('plugin_required',e.seneca.code)
    }

  })


  it('fix', function(fin){
    var si = seneca()

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
      //console.log({a:1},out)
      assert.isNull(err)
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

      //console.log(si.actroutes())

      si.act({a:1},function(err,out){
        //console.log({a:1},out)
        assert.isNull(err)
        assert.equal(1,out.a)
        assert.equal(1,out.z)
        assert.ok(out.t)

        si.act({a:1,q:1},function(err,out){
          //console.log({a:1,q:1},out)
          assert.isNull(err)
          assert.equal(1,out.a)
          assert.equal(1,out.z)
          assert.equal(1,out.w)
          assert.ok(out.t)

          fin()
        })
      })
    })


  })

})
