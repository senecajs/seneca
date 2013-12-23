/* Copyright (c) 2013 Richard Rodger */
"use strict";


// mocha plugin.test.js

var util   = require('util')

var seneca   = require('..')

var assert  = require('chai').assert


describe('plugin', function(){

  it('depends', function(){
    var si = seneca({test:{stayalive:function(code,valmap){stayalive(code,valmap)}}})
    
    si.use( function(opts){
      return {name:'aaa'}
    })

    si.use( function(opts){
      this.depends('bbb',['aaa'])
      return {name:'bbb'}
    })


    var stayalive = function(code,valmap) {
      assert.equal('plugin_required',code)
    }

    si.use( function(opts){
      this.depends('ccc',['zzz'])
      return {name:'ccc'}
    })
  })

})
