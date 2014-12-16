/* Copyright (c) 2014 Richard Rodger, MIT License */
"use strict";


// mocha error.test.js

var util   = require('util')

var seneca   = require('..')


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


  it('param_caller',      param_caller)

  //it('exec_callback',     exec_callback)
  //it('exec_errhandler',   exec_errhandler)

  //it('action_callback',   action_callback)
  //it('action_errhandler', action_errhandler)

  //it('callback_errhandler', callback_errhandler)


  function param_caller(fin){
    return fin();
  }

})

