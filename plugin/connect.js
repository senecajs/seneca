/* Copyright (c) 2012-2013 Richard Rodger */


"use strict"


var _ = require('underscore')




module.exports = function(opts,cb){
  var instance = this
  cb(null,{
    service:function(req,res,next){
      // new obj allows for req specific props
      res.seneca = req.seneca = instance.delegate({req$:req,res$:res})
      next()
    }
  })
}

