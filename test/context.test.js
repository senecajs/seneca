/* Copyright (c) 2010 Ricebridge */

var common   = require('common');

var eyes    = common.eyes;
var assert    = common.assert;

var Context  = require('context').Context;
var PropMap  = require('propmap').PropMap;

module.exports = {
  props: function() {
    var ctxt = new Context({p1:'v1'});
    assert.equal('v1',ctxt.get$('p1'));
    assert.equal(null,ctxt.get$('p2'));
    assert.equal('Context:{"p1":"v1"}',''+ctxt);
  },

  allow: function() {
    var ctxt = new Context({p1:'v1'});
    var pm   = ctxt.propmap(new PropMap());
    pm.add({p1:'v1'},{allow:true,foo:'bar'});
    ctxt.allow({},function(perm) {
      assert.equal(true,perm.allow);
      assert.equal('bar',perm.foo);
    });
  }
}