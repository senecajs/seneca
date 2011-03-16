/* Copyright (c) 2010 Ricebridge */

var common  = require('./common');
var E = common.E;
var _  = common._;

var propmap = require('./propmap');
var PropMap = propmap.PropMap;


function Context(props) {
  var self = this;

  props = props || {};

  var propmap = new PropMap();
  

  self.propmap = function( pm ) {
    return propmap = pm || propmap;
  }

  self.allow = function(propset,cb) {
    var ps = _.extend(propset,props);
    var perm = propmap.find( ps ) || {allow:false};
    cb(perm);
  }

  self.get$ = function(name) {
    return props[name];
  }
  
  self.toString = function() {
    return 'Context:'+JSON.stringify(props);
  }
}

var syspm = new PropMap();
syspm.add({perm:'read'},{allow:true,origin:'system'});
syspm.add({perm:'write'},{allow:true,origin:'system'});

Context.system = new Context();
Context.system.propmap(syspm);

exports.Context = Context;

