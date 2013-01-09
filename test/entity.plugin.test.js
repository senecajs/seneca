/* Copyright (c) 2010-2013 Richard Rodger */

"use strict";

var common   = require('../lib/common')
var seneca   = require('..')

var assert  = require('chai').assert
var gex     = common.gex


describe('entity.plugin', function() {

  it('multi', function() {
    var si = seneca(
      {plugins:[

        {name:'mem-store',opts:{
          tag:'foo',
          map:{
            '//foo':'*'
          }
        }},

        {name:'mem-store',opts:{
          tag:'bar',
          map:{
            '//bar':'*'
          }
        }},

        {name:'mem-store',opts:{
          tag:'foo',
          map:{
            '//faa':'*'
          }
        }},

      ]},
      function(err,si){
        assert.isNull(err)


        // mem/foo
        var foo = si.make('foo')
        foo.a = 1

        // mem/bar
        var bar = si.make('bar')
        bar.b = 2

        // also mem/foo instance
        var faa = si.make('faa')
        faa.c = 3

        // handled by default mem instance
        var zen = si.make('zen')
        zen.d = 4
    

        ;foo.save$( function(err,foo) {
          assert.isNull(err)
          assert.ok( gex('//foo:{a=1;id=*}').on(''+foo), ''+foo )

        ;foo.load$( {id:foo.id}, function(err,fooR) {
          assert.isNull(err)
          assert.ok( gex('//foo:{a=1;id=*}').on(''+fooR) )


    
        ;bar.save$( function(err,bar) {
          assert.isNull(err)
          assert.ok( gex('//bar:{b=2;id=*}').on(''+bar), ''+bar )

        ;bar.load$( {id:bar.id}, function(err,barR) {
          assert.isNull(err)
          assert.ok( gex('//bar:{b=2;id=*}').on(''+barR) )



        ;faa.save$( function(err,faa) {
          assert.isNull(err)
          assert.ok( gex('//faa:{c=3;id=*}').on(''+faa), ''+faa )

        ;faa.load$( {id:faa.id}, function(err,faaR) {
          assert.isNull(err)
          assert.ok( gex('//faa:{c=3;id=*}').on(''+faaR) )


        ;zen.save$( function(err,zen) {
          assert.isNull(err)
          assert.ok( gex('//zen:{d=4;id=*}').on(''+zen), ''+zen )

        ;zen.load$( {id:zen.id}, function(err,zenR) {
          assert.isNull(err)
          assert.ok( gex('//zen:{d=4;id=*}').on(''+zenR) )


        }) })  }) })  }) })  }) })
      }
    )

  })

})