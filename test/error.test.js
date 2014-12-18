/* Copyright (c) 2014 Richard Rodger, MIT License */
"use strict";


// mocha error.test.js

var util   = require('util')

var seneca   = require('..')
var common   = require('../lib/common')

var assert  = require('chai').assert
var gex     = require('gex')
var _ = require('underscore')


var testopts = {log:'silent'}



describe('seneca', function(){

  // error generators
  // ex:  param, exec, action, callback
  // res: err

  // error receivers
  // caller, callback, errhandler


  it('act_not_found',      act_not_found)

  it('param_caller',      param_caller)

  //it('exec_callback',     exec_callback)
  //it('exec_errhandler',   exec_errhandler)

  //it('action_callback',   action_callback)
  //it('action_errhandler', action_errhandler)

  //it('callback_errhandler', callback_errhandler)


  function act_not_found(fin){
    var errlog

    var si = seneca(testopts)
    si.options({log:{map:[{level:'error+',handler:function(){
      errlog = common.arrayify(arguments)
    }}]}})

    si.act('a:1')
    assert.equal('act_not_found',errlog[9])

    errlog = null

    si.act('a:1,default$:{x:1}',function(err,out){
      assert.ok(null==err)
      assert.ok(null==errlog)
      assert.ok(out.x)
    })


    si.act('a:1',function(err,out){
      assert.ok(null==out)
      assert.equal('act_not_found',err.code)
      assert.equal('act_not_found',errlog[9])

      si.options({debug:{fragile:true}})
      errlog = null

      try {
        si.act('a:1',function(err,out){
          assert.fail()
        })
        assert.fail()
      }
      catch(e) {
        assert.equal('act_not_found',err.code)
        assert.equal('act_not_found',errlog[9])
      }
        
      return fin();
    })
  }


  function param_caller(fin){
    return fin();
  }

})

