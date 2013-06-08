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
    
    si.use( function(opts,reg){
      reg(null,{name:'aaa'})
    })

    si.use( function(opts,reg){
      this.depends('bbb',['aaa'])
      reg(null,{name:'bbb'})
    })

    try {
      si.use( function(opts,reg){
        this.depends('ccc',['zzz'])
        reg(null,{name:'ccc'})
      })
      assert.fail()
    }
    catch( e ) {
      assert.equal('seneca/plugin_required',e.seneca.code)
    }
  })

})
