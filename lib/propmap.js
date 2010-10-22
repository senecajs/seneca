/* Copyright (c) 2010 Ricebridge */

var common  = require('./common');
var E = common.E;

var sys     = common.sys;
var eyes    = common.eyes;
var assert  = common.assert;

function PropMap() {
  var self = this;


  self.find = function( propset ) {
    if( !propset.$get ) {
      propset.$get = function(prop) {
        var res = propset[prop];
        res = res ? res : null;
        return res;
      }
    }

    return nodefind(self.root,propset);
  }


  var nodefind = function(node,propset) {
    var ref = null;
    if( node.ref ) {
      ref = node.ref;
      self.trace && self.trace.push(' ref:'+ref);
    }
    else {
      var val = propset.$get(node.prop);
      self.trace && node.prop && self.trace.push(' '+node.prop+'->'+val);

      var subnode = val && node.subs && node.subs[val];

      if( subnode ) {
        ref = nodefind(subnode,propset);
      }

      if( !ref && node.star) {
        self.trace && self.trace.push(' *');
        ref = nodefind(node.star,propset);
      }
    }
    return ref;
  }


  self.toString = function() {
    return 'PropMap';
  }
}


exports.PropMap = PropMap;