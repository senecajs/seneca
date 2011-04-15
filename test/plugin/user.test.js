/* Copyright (c) 2010-2011 Ricebridge */

var common   = require('common')
var Seneca   = require('seneca')

var eyes    = common.eyes
var assert  = common.assert
var gex     = common.gex

var logger = require('../logassert')


var test = {}

function seneca(cb) {
  if( test.seneca ) {
    cb(test.seneca)
  }
  else {
    if( test.wait ) {
      setTimeout(function(){
        console.log('TEST WAITED')
        seneca(cb)
      },100)
    }
    else {
      test.wait = true
      var log = logger([])

      Seneca.init(
        {logger:log,
         entity:'mongo://localhost/seneca_test',
         plugins:['user']
        },
        function(err,seneca){
          assert.isNull(err)
          test.seneca = seneca
          cb(seneca)
        }
      )
    }
  }
}


module.exports = {
  
  happy: function() {

    ;seneca(function(seneca){
      seneca.act({
        tenant:'test',
        on:'user',
        cmd:'register',
        nick:'nick1',
        email:'nick1@example.com',
        password:'testtest',
        active:true
      }, function(err,out){
        assert.isNull(err)
        console.log(out)


    ;seneca.act({
      tenant:'test',
      on:'user',
      cmd:'login',
      nick:'nick1',
      password:'testtest'
    }, function(err,out){
      assert.isNull(err)
      console.log(out)
      assert.ok(out.pass)

    ;seneca.act({
      tenant:'test',
      on:'user',
      cmd:'login',
      nick:'nick1',
      password:'testtestX'
    }, function(err,out){
      assert.isNull(err)
      console.log(out)
      assert.ok(!out.pass)

    
    }) // login fail
    }) // login ok
    }) // register

    })

  }
}



/*
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
*/