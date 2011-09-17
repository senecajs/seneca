/* Copyright (c) 2011 Ricebridge */

var common  = require('../common');

var eyes    = common.eyes;
var util    = common.util;
var assert  = common.assert;
var _       = common._;
var uuid    = common.uuid;


function EchoPlugin() {
  var self = this;
  self.name = 'echo';

  self.init = function(seneca,opts,cb){

    seneca.add({on:'echo'},function(args,seneca,cb){
      var out = _.extend({},args)
      delete out.on
      delete out.zone
      delete out.parent$
      delete out.get$

      if( opts.inject ) {
        out = _.extend(out,opts.inject)
      }

      cb(null,out)
    })

    cb()
  }

  self.service = function(opts,cb) {
    return function(req,res,next){
      res.writeHead(200)
      res.end(req.url+(opts.mark?' ECHO':''))
      cb && cb(null,{req:req,res:res,next:next,mark:opts.mark})
    }
  }
}


exports.plugin = function() {
  return new EchoPlugin()
}

