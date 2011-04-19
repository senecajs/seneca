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

  self.init = function(seneca,cb){

    seneca.add({on:'echo'},function(args,seneca,cb){
      var out = _.extend({},args)
      delete out.on
      delete out.zone
      delete out.parent$
      cb(null,out)
    })

    cb()
  }

}


exports.plugin = function() {
  return new EchoPlugin()
}

