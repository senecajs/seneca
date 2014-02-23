/* Copyright (c) 2013 Richard Rodger */
"use strict";


// mocha plugin.test.js

var util   = require('util')

var seneca   = require('..')

var gex     = require('gex')
var assert  = require('chai').assert


describe('plugin', function(){

  it('depends', function(){
    var si = seneca()
    
    si.use( function(opts){
      return {name:'aaa'}
    })

    si.use( function(opts){
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
      assert.equal('seneca/plugin_required',e.seneca.code)
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
      assert.fail()
    }
    catch( e ) {
      assert.equal('seneca/plugin_required',e.seneca.code)
    }

  })

})
