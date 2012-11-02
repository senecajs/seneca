/* Copyright (c) 2010-2012 Richard Rodger */

var common_tests = require('./common.test')
var mysql_ext_tests = require('./mysql.ext.test')
var common   = require('../../lib/common')


var seneca   = require('../../lib/seneca')
var shared   = require('./shared')


var assert  = common.assert
var eyes    = common.eyes
var async   = common.async
var _       = common._
var gex     = common.gex


//These tests assume a MySQL database/structure is already created.
/*
  CREATE DATABASE 'senecatest';
  USE senecatest;
  GRANT ALL PRIVILEGES ON senecatest.* TO senecatest@localhost;
  FLUSH PRIVILEGES;
  CREATE TABLE foo (id VARCHAR(36), p1 VARCHAR(255), p2 VARCHAR(255));
  CREATE TABLE moon_bar (
    id VARCHAR(36), 
    str VARCHAR(255), 
    `int` INT, 
    bol BOOLEAN, 
    wen TIMESTAMP, 
    mark VARCHAR(255), 
    `dec` REAL, 
    arr TEXT, 
    obj TEXT);
    CREATE TABLE product (id VARCHAR(36), name VARCHAR(255), price INT);
*/

var config = 
{ log:'print',
  plugins:[
    { name:'mysql-store', 
      opts:{
        name:'senecatest',
        host:'127.0.0.1',
        user:'senecatest',
        password:'',
        port:3306
      } 
    }
  ]
}


var si = seneca(config)
si.__testcount = 0
var testcount = 0

module.exports = {
  basictest: (testcount++, shared.basictest(si)),
  sqltest: (testcount++, shared.sqltest(si)),
  extratest: (testcount++, extratest(si)),
  closetest: shared.closetest(si,testcount)
}



function extratest(si) {
  return function() {
    si.ready(function(){
      assert.isNotNull(si)
      
      // driver specific tests

      si.__testcount++
    })
  }
}