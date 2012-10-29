/* Copyright (c) 2010-2012 Richard Rodger */

var common_tests = require('./common.test')
var mysql_ext_tests = require('./mysql.ext.test')
var common   = require('../../lib/common')


var seneca   = require('../../lib/seneca')
var shared   = require('./shared')


var assert  = common.assert
var eyes    = common.eyes
var async   = common.async

//These tests assume a database structure is already created.
/*
  CREATE DATABASE senecatest;
  USE senecatest;
  CREATE ROLE senecatest

  CREATE TABLE foo ( id character varying, p1 character varying, p2 character varying );
  CREATE TABLE moon_bar ( str character varying, id character varying, "int" integer,  bol boolean, wen timestamp with time zone, mark character varying, "dec" real, arr text, obj text );

  GRANT ALL ON foo TO senecatest;
  GRANT ALL ON moon_bar TO senecatest;
*/

var config = 
{ log:'print',
  plugins:[
    { name:'postgres-store', 
      opts:{
        name:'senecatest',
        host:'127.0.0.1',
        port:5432,
        username:'senecatest',
        password:'senecatest',
      } 
    }
  ]
}


var si = seneca(config)


si.__testcount = 0
var testcount = 0

module.exports = {
  basictest: (testcount++, shared.basictest(si)),
  extratest: (testcount++, extratest(si)),
  closetest: shared.closetest(si,testcount)
}



function extratest(si) {
  console.log('EXTRA')
  si.__testcount++
}