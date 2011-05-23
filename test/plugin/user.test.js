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


function cberr(win){
  return function(err){
    if(err) {
      assert.fail(err, 'callback error')
    }
    else {
      win.apply(this,Array.prototype.slice.call(arguments,1))
    }
  }
}


module.exports = {
  
  happy: function() {

    ;seneca(function(seneca){
      var userpin = seneca.pin({tenant:'test',on:'user'})

      var userent = seneca.make('test','sys','user')
      userent.load$({nick:'nick1'},cberr(function(user){
        if( user ) {
          user.remove$({nick:'nick1'},cberr(happyseq))
        }
        else {
          happyseq()
        }
      }))


      function happyseq() {

        ;seneca.act({
          tenant:'test',
          on:'user',
          cmd:'register',
          nick:'nick1',
          email:'nick1@example.com',
          password:'testtest',
          active:true
        }, function(err,out){
          assert.isNull(err)
          //console.log(out)
    
    
        ;seneca.act({
          tenant:'test',
          on:'user',
          cmd:'login',
          nick:'nick1',
          password:'testtest'
        }, function(err,out){
          assert.isNull(err)
          //console.log(out)
          assert.ok(out.pass)
      
          var token = out.login.token
      
        ;seneca.act({
          tenant:'test',
          on:'user',
          cmd:'login',
          nick:'nick1',
          password:'testtestX'
        }, function(err,out){
          assert.isNull(err)
          //console.log(out)
          assert.ok(!out.pass)
      
      
      
        ;seneca.act({
          tenant:'test',
          on:'user',
          cmd:'auth',
          token:token,
        }, function(err,out){
          assert.isNull(err)
          //console.log(out)
          assert.ok(out.auth)
      
        ;seneca.act({
          tenant:'test',
          on:'user',
          cmd:'auth',
          token:token+'BAD',
        }, function(err,out){
          assert.isNull(err)
          //console.log(out)
          assert.ok(!out.auth)
      
      
      
        ;seneca.act({
          tenant:'test',
          on:'user',
          cmd:'logout',
          token:token,
        }, function(err,out){
          assert.isNull(err)
          //console.log(out)
          assert.ok(out.logout)
      
        ;seneca.act({
          tenant:'test',
          on:'user',
          cmd:'auth',
          token:token,
        }, function(err,out){
          assert.isNull(err)
          //console.log(out)
          assert.ok(!out.auth)
      
      
        ;userpin.cmd('change_password',{
          nick:'nick1',
          password:'passpass'
        }, cberr(function(out){
          //console.log(out)
          assert.ok(out.ok)
      
        ;seneca.cmd('login',{
          nick:'nick1',
          password:'passpass'
        }, cberr(function(out){
          //console.log(out)
          assert.ok(out.pass)
      
        ;seneca.cmd('login',{
          nick:'nick1',
          password:'testtest'
        }, cberr(function(out){
          //console.log(out)
          assert.ok(!out.pass)
      
  
        })) // login fail
        })) // login ok
        })) // change_password
      
        }) // login fail
        }) // logout
      
        }) // login fail
        }) // auth ok
        
        }) // login fail
        }) // login ok
      
        }) // register

      }
    })

  },

  password: function() {
    ;seneca(function(seneca){
      var userpin = seneca.pin({tenant:'test',on:'user'})
      
    ;userpin.cmd('encrypt_password',{
        password:'passpass'
      }, cberr(function(outpass){
        //console.log(out)
        assert.isNotNull(outpass.salt)
        assert.isNotNull(outpass.pass)

    ;userpin.cmd('verify_password',{
      proposed:'passpass',
      salt:outpass.salt,
      pass:outpass.pass
    }, cberr(function(out){
      //console.log(out)
      assert.ok(out.ok)

    ;userpin.cmd('verify_password',{
      proposed:'failfail',
      salt:outpass.salt,
      pass:outpass.pass
    }, cberr(function(out){
      //console.log(out)
      assert.ok(!out.ok)

        
    })) // verify_password
    })) // verify_password
    })) // encrypt_password

    }) // seneca
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