/* Copyright (c) 2010-2012 Richard Rodger */

var common_tests = require('./common.test')
var mysql_ext_tests = require('./mysql.ext.test')
var common   = require('../../lib/common')


var assert  = common.assert
var eyes    = common.eyes
var async   = common.async

//These tests assumes a MySQL database/structure is already created.
/*
  CREATE DATABASE 'seneca_test';
  USE seneca_test;
  CREATE TABLE foo (id VARCHAR(255), p1 VARCHAR(255), p2 VARCHAR(255));
  CREATE TABLE moon_bar (
    id VARCHAR(255), 
    str VARCHAR(255), 
    `int` INT, 
    bol BOOLEAN, 
    wen TIMESTAMP, 
    mark VARCHAR(255), 
    `dec` REAL, 
    arr TEXT, 
    obj TEXT);
*/

var config = 
{ plugins:[
  { name:'mysql-store', 
    opts:{name:'seneca_test',
    host:'127.0.0.1',
    user:'root',
    password:'secret',
    port:3306} }
  ]
}

module.exports = {
<<<<<<< HEAD

  happy: function() {
    var si

    try {
      si = seneca(
        { log:'print',
          plugins:[
          { name:'mysql-store', 
            opts:{
              name:'seneca_test',
              host:'127.0.0.1',
              user:'root',
              password:'',
              port:3306
            } }
        ] },

        function(err,si) {
          assert.isNull(err)

          async.series({
            insert1: function(cb) {
              var foo = si.make({name$:'foo'})
              foo.p1 = 'v1'
              
              foo.save$(verify(cb, function(foo){
                assert.isNotNull(foo.id)
                assert.equal('v1',foo.p1)
              }))
            },

            // test remove$ with all$ - we have at least 2 rows in db
            removeAll: function(cb) {
              var foo = si.make({name$:'foo'})
        
              foo.remove$( {all$:true}, verify(cb, function(res){
                assert.isNull(err)
              }))
            },

            listEmpty: function(cb) {
              var foo = si.make('foo')
              foo.list$({}, verify(cb, function(res){
                assert.equal( 0, res.length)
              }))
            },

            insert2: function(cb) {
              var foo = si.make({name$:'foo'})
              foo.p1 = 'v1'
              
              foo.save$( verify(cb, function(foo){
                assert.isNotNull(foo.id)
                assert.equal('v1',foo.p1)
                scratch.foo1 = foo
              }))
            },

            list1: function(cb) {
              scratch.foo1.list$({}, verify(cb, function(res){
                assert.equal( 1, res.length)
              }))
            },

            list2: function(cb) {
              scratch.foo1.list$({id:scratch.foo1.id}, verify(cb, function(res){
                assert.equal( 1, res.length)
              }))
            },

            load1: function(cb) {
              scratch.foo1.load$({id:scratch.foo1.id}, verify(cb, function(res){
                assert.isNotNull(res.id)
              }))
            },

            update: function(cb) {
              scratch.foo1.p1 = 'v2'

              scratch.foo1.save$(verify(cb, function(foo){
                assert.isNotNull(foo.id)
                assert.equal('v2',foo.p1)
              }))
            },

            load2: function(cb) {
              scratch.foo1.load$({id:scratch.foo1.id}, verify(cb, function(res){
                assert.equal('v2',res.p1)
              }))
            },

            insertwithsafe: function(cb) {
              var foo = si.make({name$:'foo'})
              foo.p1 = 'v3'
              
              foo.save$(verify(cb, function(foo){
                assert.isNotNull(foo.id)
                assert.equal('v3',foo.p1)
                scratch.foo2 = foo
              }))
            },

            list3: function(cb) {
              scratch.foo2.list$({id:scratch.foo2.id}, verify(cb, function(res){
                assert.equal( 1, res.length)
              }))
            },

            list4: function(cb) {
              scratch.foo2.list$({id:scratch.foo2.id, limit$:1}, verify(cb, function(res){
                assert.equal( 1, res.length)
              }))
            },
            
            // test limit$
            listwithlimit: function(cb) {
              scratch.foo2.list$({limit$:1}, verify(cb, function(res){
                assert.equal( 1, res.length)
              }))
            },
            
            // test sort$
            listwithsort1: function(cb) {
              scratch.foo2.list$({sort$:{'p1':-1}}, verify(cb, function(res){
                assert.equal( 2, res.length)
                assert.equal('v2',res[0].p1)
              }))
            },

            listwithsort2: function(cb) {
              scratch.foo2.list$({sort$:{'p1':1}}, verify(cb, function(res){
                assert.equal( 2, res.length)
                assert.equal('v3',res[0].p1)
              }))
            },
            
            remove1: function(cb) {
              scratch.foo2.remove$( {id:scratch.foo2.id}, verify(cb, function(res){
                assert.isNull(err)
              }))
            },

            list5: function(cb) {
              var foo = si.make('foo')
              foo.list$({}, verify(cb, function(res){
                assert.equal( 1, res.length)
              }))
            },
          }, function(err,out) {
            if( err ) {
              eyes.inspect(err)
            }
            assert.isNull(err)
            si.close()
          })
        })
    }
    catch( e ) {
      //eyes.inspect(e)
      si && si.close()
      throw e
    }
  }
=======
  commontests: common_tests.test(config, [mysql_ext_tests.test])
>>>>>>> 87b9fe4ac12a569038bdf56174186ee8a1307e83
}
