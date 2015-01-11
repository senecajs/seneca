/* Copyright (c) 2010-2015 Richard Rodger, MIT License */
"use strict";


var assert = require('assert')

var seneca = require('../..')


var si   = seneca({log:'silent'})

var util = si.pin({role:'util',cmd:'*'})


describe('util', function() {

  it('quickcode', function(fin) {
    si.options({errhandler:fin})
    util.quickcode({},function(err,code){
      assert.ok( null == err)
      assert.equal( 8, code.length )
      assert.ok( null ==  /[ABCDEFGHIJKLMNOPQRSTUVWXYZ]/.exec(code) )
      fin()
    })
  })

  it('generate_id', function(fin) {
    si.options({errhandler:fin})
    util.generate_id({},function(err,code){
      assert.ok( null == err)
      assert.equal( 6, code.length )
      assert.ok( null !=  /^[0-9a-z]{6,6}$/.exec(code) )

      util.generate_id({length:4},function(err,code){
        assert.ok( null == err)
        assert.equal( 4, code.length )
        assert.ok( null !=  /^[0-9a-z]{4,4}$/.exec(code) )
        
        fin()
      })
    })
  })


  it('ensure_entity', function(fin) {
    si.options({errhandler:fin})

    var foo_ent = si.make$('util_foo')
    var fooid = {}, foos = []
    foo_ent.make$({a:1}).save$(function(e,o){
      fooid[1]=o.id; foos.push(o)

      foo_ent.make$({a:2}).save$(function(e,o){
        fooid[2]=o.id; foos.push(o)

        si.add({util:1,cmd:'A'},function(args,done){
          var foo = args.foo
          foo.a = 10 * foo.a
          foo.save$(done)
        })


        si.act({
          role:'util',cmd:'ensure_entity',
          pin:{util:1,cmd:'*'},
          entmap:{ foo:foo_ent }
        }, function(){

          // just use ent if given
          si.act({util:1,cmd:'A',foo:foos[0]},function(e,o){
            //console.log('ent '+o)
            assert.equal(10,o.a)

            // load from id
            si.act({util:1,cmd:'A',foo:fooid[1]},function(e,o){
              //console.log('load '+o)
              assert.equal(100,o.a)

              // initialize from data
              si.act({util:1,cmd:'A',foo:foos[1].data$()},function(e,o){
                //console.log('data '+o)
                assert.equal(20,o.a)

                fin()
              })
            })
          })
        })        
      })      
    })

    

  })

  
  it('note', function(){
    si.act('role:util,note:true,cmd:set,key:foo,value:red', function(e,o){
      assert.ok( null == e)
      assert.equal('red',o)

      si.act('role:util,note:true,cmd:get,key:foo', function(e,o){
        assert.ok( null == e)
        assert.equal('red',o)

        si.act('role:util,note:true,cmd:list,key:foo', function(e,o){
          assert.ok( null == e)
          assert.equal(0,o.length)

          si.act('role:util,note:true,cmd:push,key:foo,value:aaa', function(e,o){
            assert.ok( null == e)
            assert.equal('aaa',o)

            si.act('role:util,note:true,cmd:list,key:foo', function(e,o){
              assert.ok( null == e)
              assert.equal(1,o.length)
              assert.equal('aaa',o[0])

              si.act('role:util,note:true,cmd:push,key:foo,value:bbb', function(e,o){
                assert.ok( null == e)
                assert.equal('bbb',o)

                si.act('role:util,note:true,cmd:list,key:foo', function(e,o){
                  assert.ok( null == e)
                  assert.equal(2,o.length)
                  assert.equal('aaa',o[0])
                  assert.equal('bbb',o[1])

                  si.act('role:util,note:true,cmd:pop,key:foo', function(e,o){
                    assert.ok( null == e)
                    assert.equal('bbb',o)

                    si.act('role:util,note:true,cmd:list,key:foo', function(e,o){
                      assert.ok( null == e)
                      assert.equal(1,o.length)
                      assert.equal('aaa',o[0])

                      si.act('role:util,note:true,cmd:pop,key:foo', function(e,o){
                        assert.ok( null == e)
                        assert.equal('aaa',o)

                        si.act('role:util,note:true,cmd:list,key:foo', function(e,o){
                          assert.ok( null == e)
                          assert.equal(0,o.length)
                        })
                      })
                    })
                  })
                })
              })
            })
          })
        })
      })
    })
  })

})
