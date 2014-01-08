/* Copyright (c) 2013 Richard Rodger */
"use strict";


// mocha plugin.test.js

var util   = require('util')

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
      si.use( function(){
        this.depends('ccc',['zzz'])
        return {name:'ccc'}
      })
    }
    catch(e) {
      assert.equal('plugin_required',e.seneca.code)
    }
  })

})
