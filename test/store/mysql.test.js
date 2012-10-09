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
  commontests: common_tests.test(config, [mysql_ext_tests.test])
}
