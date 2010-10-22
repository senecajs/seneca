/* Copyright (c) 2010 Ricebridge */

var common   = require('common');
var propmap  = require('propmap');

var E = common.E;

var sys     = common.sys;
var eyes    = common.eyes;

var PropMap = propmap.PropMap;

module.exports = {
  init: function(assert) {
    var pm = new PropMap();
    assert.equal('PropMap',pm+'');
  },

  _find: function(assert) {
    var pm = new PropMap();

    pm.root = {ref:'ref1'}; pm.trace = [];
    assert.equal('ref1',pm.find({}));
    assert.equal(' ref:ref1',pm.trace.join());

    pm.root = {star:{ref:'r2'}}; pm.trace = [];
    assert.equal('r2',pm.find({}));
    assert.equal(' *, ref:r2',pm.trace.join());

    pm.root = {prop:'p1',star:{ref:'r3'}}; pm.trace = [];
    assert.equal('r3',pm.find({}));
    assert.equal(' p1->null, *, ref:r3',pm.trace.join());

    pm.root = {prop:'p2',subs:{v2:{ref:'r4'}}}; pm.trace = [];
    assert.equal('r4',pm.find({p2:'v2'}));
    assert.equal(' p2->v2, ref:r4',pm.trace.join());

    pm.root = {prop:'p2',subs:{v2x:{ref:'r4'}}}; pm.trace = [];
    assert.equal(null,pm.find({p2:'v2'}));
    assert.equal(' p2->v2',pm.trace.join());

    pm.root = {prop:'p3',subs:{v2:{ref:'r4'},v3:{ref:'r5'}}}; pm.trace = [];
    assert.equal('r5',pm.find({p3:'v3'}));
    assert.equal(' p3->v3, ref:r5',pm.trace.join());

    pm.root = {prop:'p4',subs:{v4:{prop:'p5',subs:{v5:{ref:'r6'}}}}}; pm.trace = [];
    assert.equal('r6',pm.find({p4:'v4',p5:'v5'}));
    assert.equal(' p4->v4, p5->v5, ref:r6',pm.trace.join());
  }
}