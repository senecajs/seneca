/* Copyright (c) 2012 Richard Rodger */

var common  = require('../common');

var eyes    = common.eyes;
var util    = common.util;
var assert  = common.assert;
var _       = common._;
var uuid    = common.uuid;


function ConnectPlugin() {
  var self = {}
  self.name = 'connect'

  var si
  var opts

  self.init = function(init_si,init_opts,cb){
    si = init_opts
    opts = init_opts

    cb()
  }

  self.service = function(opts,cb) {
    return function(req,res,next){
      req.seneca = _.extend({},si)
      next()
    }
  }

  return self
}


module.exports = new ConnectPlugin()

