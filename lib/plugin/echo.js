/* Copyright (c) 2010-2012 Richard Rodger */

var common  = require('../common');

var eyes    = common.eyes;
var util    = common.util;
var assert  = common.assert;
var _       = common._;
var uuid    = common.uuid;


function EchoPlugin() {
  var self = {}
  self.name = 'echo'

  self.init = function(seneca,opts,cb){

    seneca.add({on:'echo'},function(args,cb){
      var out = _.extend({},args)


      // FIX: some not needed now
      delete out.on
      delete out.zone
      delete out.parent$
      delete out.get$
      delete out.tag$

      if( opts.inject ) {
        out = _.extend(out,opts.inject)
      }

      cb(null,out)
    })

    cb()
  }

  self.service = function() {
    return function(req,res,next){
      if( 0 == req.url.indexOf('/echo') ) {
        res.writeHead(200)
        res.end(req.url)
      }
      else next();
   }
  }

  return self
}


module.exports = new EchoPlugin()


