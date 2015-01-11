/* Copyright (c) 2010-2015 Richard Rodger */
"use strict";


var assert  = require('assert')

var common = require('../lib/common')
var seneca = require('..')

var gex = require('gex')


describe('entity.plugin', function() {

  it('multi', function(fin) {
    var si = seneca(
      {
        plugins:[

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

        ],
        log:'silent',
        errhandler:fin
      })


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
      assert.ok( null == err)
      assert.ok( gex('$-/-/foo:{id=*;a=1}').on(''+foo), ''+foo )

      ;foo.load$( {id:foo.id}, function(err,fooR) {
        assert.ok( null == err)
        assert.ok( gex('$-/-/foo:{id=*;a=1}').on(''+fooR) )


        
        ;bar.save$( function(err,bar) {
          assert.ok( null == err)
          assert.ok( gex('$-/-/bar:{id=*;b=2}').on(''+bar), ''+bar )

          ;bar.load$( {id:bar.id}, function(err,barR) {
            assert.ok( null == err)
            assert.ok( gex('$-/-/bar:{id=*;b=2}').on(''+barR) )



            ;faa.save$( function(err,faa) {
              assert.ok( null == err)
              assert.ok( gex('$-/-/faa:{id=*;c=3}').on(''+faa), ''+faa )

              ;faa.load$( {id:faa.id}, function(err,faaR) {
                assert.ok( null == err)
                assert.ok( gex('$-/-/faa:{id=*;c=3}').on(''+faaR) )


                ;zen.save$( function(err,zen) {
                  assert.ok( null == err)
                  assert.ok( gex('$-/-/zen:{id=*;d=4}').on(''+zen), ''+zen )

                  ;zen.load$( {id:zen.id}, function(err,zenR) {
                    assert.ok( null == err)
                    assert.ok( gex('$-/-/zen:{id=*;d=4}').on(''+zenR) )


                    fin()

                  }) })  }) })  }) })  }) })
  })

})
