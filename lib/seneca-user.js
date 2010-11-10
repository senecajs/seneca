/* Copyright (c) 2010 Ricebridge */

var common  = require('./common');
var E = common.E;

var sys     = common.sys;
var eyes    = common.eyes;
var assert  = common.assert;

var Seneca = require('./seneca').Seneca;

exports.init = function(seneca) {

  seneca.add({on:'user',cmd:'signup'},function(args,cb){
    var signup = args.entity$.make$({tenant$:args.tenant,base$:'sys',name$:'signup'});
    signup.email = args.email;
    signup.token = (''+Math.random()).substring(2);
    signup.save$(function(err,signup){
      cb(err,signup);
    });
  });
}