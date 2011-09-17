/* Copyright (c) 2011 Ricebridge */

var common  = require('../common');

var eyes    = common.eyes;
var util    = common.util;
var assert  = common.assert;
var _       = common._;
var uuid    = common.uuid;





function VersionedCachePlugin() {
  var self = this;
  self.name = 'vcache';

  self.init = function(seneca,opts,cb){
    var cachetype = opts.type || 'memcache'
    var Cache = require('./vcache/'+cachetype)
    
    var cachestore = new Cache(seneca.$.entity.$.store$,seneca,opts)
    seneca.$.entity.$.store$ = function(){return cachestore}
    cb()
  }
}


exports.plugin = function() {
  return new VersionedCachePlugin()
}

