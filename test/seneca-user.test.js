/* Copyright (c) 2010 Ricebridge */

var common   = require('common');
var Entity   = require('entity').Entity;
require('entity-mongo');

var seneca   = require('seneca');



var E = common.E;

var assert  = common.assert;
var eyes    = common.eyes;


var bexit
var senI = 0
var sen


function getsen(cb) {
  senI++
  if( sen ) {
    cb(sen)
  }
  else {
    Entity.init$('mongo://localhost/entity_mongo_test',function(err,entity) {
      assert.isNull(err)
      sen = new seneca.Seneca({entity:entity})
      new seneca.User(sen)

      bexit = function(){
        senI--
        if( 0 == senI ) {
          entity.close$();
        }
      }

      cb(sen);
    })
  }
}


module.exports = {

  happy: function() {
    getsen(function(sen){
      sen.act({on:'user',cmd:'signup',tenant:'test',email:'a@b.com'},function(err,signup){
        E(err); eyes.inspect(signup,'signup');

      ;sen.act({on:'user',cmd:'activate',tenant:'test',signup:signup.token},function(err,user){
        E(err); eyes.inspect(user,'user');
        bexit();

      }) })
    })
  }
}