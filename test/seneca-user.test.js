/* Copyright (c) 2010 Ricebridge */

var common   = require('common');
var Entity   = require('entity').Entity;
require('entity-mongo');

var Seneca   = require('seneca').Seneca;
var seneca_user = require('seneca-user');



var E = common.E;

var sys     = common.sys;
var eyes    = common.eyes;


function getseneca(cb) {
  Entity.$init('mongo://localhost/entity_mongo_test',function(entity) {
    var seneca = Seneca.init(entity);
    seneca_user.init(seneca);
    cb(seneca,function(){
      entity.$close();
    });
  });
}

module.exports = {
  signup: function(assert) {
    getseneca(function(seneca,end){
      seneca.act({on:'user',cmd:'signup',tenant:'test',email:'a@b.com'},function(err,signup){
        eyes.inspect(signup,'signup');
        end();
      });
    });
  },

  activate: function(assert) {
    getseneca(function(seneca,end){
      seneca.act({on:'user',cmd:'signup',tenant:'test',email:'a@b.com'},function(err,signup){
        seneca.act({on:'user',cmd:'activate',tenant:'test',signup:signup.token},function(err,user){
          eyes.inspect(user,'user');
          end();
        });
      });
    });
  },
}