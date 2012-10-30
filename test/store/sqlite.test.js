/* Copyright (c) 2012 Marius Ursache */

var common_tests = require('./common.test');
//var mysql_ext_tests = require('./mysql.ext.test')
var common   = require('../../lib/common');

var seneca   = require('../../lib/seneca');
var shared   = require('./shared');

var assert  = common.assert;
var eyes    = common.eyes;
var async   = common.async;

//These tests assume a MySQL database/structure is already created.
/*
  $ sqlite3 /tmp/senecatest.db
  sqlite>
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
  sqlite>
  .tables
*/

var config =
{ log:'print',
  plugins:[
    { name:'sqlite-store',
      opts:{
        database:'/tmp/senecatest.db'
      }
    }
  ]
};


var si = seneca(config);
si.__testcount = 0;
var testcount = 0;

module.exports = {
  basictest: (testcount++, shared.basictest(si)),
  extratest: (testcount++, extratest(si)),
  closetest: shared.closetest(si,testcount)
};

function extratest(si) {
  console.log('EXTRA')
  si.__testcount++
}