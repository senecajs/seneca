/* Copyright (c) 2012-2013 Richard Rodger */


"use strict"


var _ = require('underscore')


function ConnectPlugin() {
  var self = {}
  self.name = 'connect'

  var si

  self.init = function(seneca,opts,cb){
    si = seneca

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

