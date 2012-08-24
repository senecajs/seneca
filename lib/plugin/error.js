/* Copyright (c) 2012 Richard Rodger */

var common  = require('../common');

var _ = common._;



function ErrorPlugin() {
  var self = this;
  self.name = 'error'
  self.role = 'fail'

  self.init = function(seneca,opts,cb){

    seneca.add({on:'error'},function(args,cb){
      seneca.fail('m1',cb)
    })

    cb()
  }

  /*
  self.service = function(opts,cb) {
    return function(req,res,next){
      // TODO: fail in some way
    }
  }
  */
}


exports.plugin = function() {
  return new ErrorPlugin()
}

