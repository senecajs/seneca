/* Copyright (c) 2010-2012 Richard Rodger */

var common   = require('../lib/common');
var seneca   = require('../lib/seneca');

var eyes    = common.eyes
var assert  = common.assert
var gex     = common.gex

var logger = require('./logassert')


module.exports = {


  mem: function() {
    try {
      seneca(
        {plugins:['mem-store']},
        function(err,si){
          assert.isNull(err)

          var entity = si.make('ten','base',null)
          var ent = entity.make$('ent',{p1:'v1'})
          ent.p2 = 100;
          
          ;ent.save$( function(err,ent) {
            assert.isNull(err)
            assert.ok( gex('ten/base/ent:{id=*;p1=v1;p2=100}').on(''+ent), ''+ent )


            ;ent.load$( {id:ent.id}, function(err,entR) {
              assert.isNull(err)
              assert.ok( gex('ten/base/ent:{id=*;p1=v1;p2=100}').on(''+entR) )
              var ent1 = entR


              ent = entity.make$('ent',{p1:'v1'})
              ent.p3 = true
              ;ent.save$( function(err,ent) {
                assert.isNull(err)
                assert.ok( gex('ten/base/ent:{id=*;p1=v1;p3=true}').on(''+ent) )


                ;ent.load$( {id:ent.id}, function(err,entR) {
                  assert.isNull(err)
                  assert.ok( gex('ten/base/ent:{id=*;p1=v1;p3=true}').on(''+entR) )
                  var ent2 = entR


                  ;ent.list$( {p1:'v1'}, function(err,list) {
                    assert.isNull(err)
                    assert.equal(2,list.length)
                    assert.ok( gex('ten/base/ent:{id=*;p1=v1;p2=100}').on(''+list[0]) )
                    assert.ok( gex('ten/base/ent:{id=*;p1=v1;p3=true}').on(''+list[1]) )

                    ;ent.list$( {p2:100}, function(err,list) {
                      assert.isNull(err)
                      assert.equal(1,list.length)
                      assert.ok( gex('ten/base/ent:{id=*;p1=v1;p2=100}').on(''+list[0]) )

                      
                      ;ent.remove$( {p1:'v1',all$:true}, function(err) {
                        assert.isNull(err)

                        ;ent.list$( {p1:'v1'}, function(err,list) {
                          assert.isNull(err)
                          assert.equal(0,list.length)

                          console.log('DONE')

                        }) // list
                      }) //remove

                    }) // list
                  }) // list

                }) // load
              }) // save

            }) // load
          }) // save
        }
      )
    }
    catch(e) {
      eyes.inspect(e)
      throw e
    }
  },


  multi: function() {
    seneca(
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
  },


  noop: function() {
    try {
      seneca(
        {plugins:['noop-store']},
        function(err,si){
          assert.isNull(err)

          var entity = si.make('zone','base','name')
          var ent = entity.make$('ent',{p1:'v1'})
          ent.p2 = 100;
          
          ;ent.save$( function(err,ent) {
            assert.isNull(err)


            ;ent.load$( {id:ent.id}, function(err,entR) {
              assert.isNull(err)

              ent = entity.make$('ent',{p1:'v1'})
              ent.p3 = true

              ;ent.save$( function(err,ent) {
                assert.isNull(err)

                ;ent.load$( {id:ent.id}, function(err,entR) {
                  assert.isNull(err)

                  ;ent.list$( {p1:'v1'}, function(err,list) {
                    assert.isNull(err)

                    ;ent.list$( {p2:100}, function(err,list) {
                      assert.isNull(err)
                      
                      ;ent.remove$( {p1:'v1'}, function(err) {
                        assert.isNull(err)

                        ;ent.list$( {p1:'v1'}, function(err,list) {
                          assert.isNull(err)

                          console.log('DONE')

                        }) // list
                      }) //remove

                    }) // list
                  }) // list

                }) // load
              }) // save

            }) // load
          }) // save
        }
      )
    }
    catch(e) {
      eyes.inspect(e)
      throw e
    }
  },


  
  
}