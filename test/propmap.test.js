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
    assert.equal('PropMap:root:\n',pm+'');
  },

  find: function(assert) {
    var pm = new PropMap();

    pm.root = {root:true,prop:'root',star:{ref:'r2'}}; pm.trace = [];
    assert.equal('r2',pm.find({}));
    assert.equal(' root->null, *, ref:r2',pm.trace.join());

    pm.root = {root:true,prop:'root',star:{prop:'p1',star:{ref:'r3'}}}; pm.trace = [];
    assert.equal('r3',pm.find({}));
    assert.equal(' root->null, *, p1->null, *, ref:r3',pm.trace.join());

    pm.root = {root:true,prop:'root',star:{prop:'p2',subs:{v2:{ref:'r4'}}}}; pm.trace = [];
    assert.equal('r4',pm.find({p2:'v2'}));
    assert.equal(' root->null, *, p2->v2, ref:r4',pm.trace.join());

    pm.root = {root:true,prop:'root',star:{prop:'p2',subs:{v2x:{ref:'r4'}}}}; pm.trace = [];
    assert.equal(null,pm.find({p2:'v2'}));
    assert.equal(' root->null, *, p2->v2',pm.trace.join());

    pm.root = {root:true,prop:'root',star:{prop:'p3',subs:{v2:{ref:'r4'},v3:{ref:'r5'}}}}; pm.trace = [];
    assert.equal('r5',pm.find({p3:'v3'}));
    assert.equal(' root->null, *, p3->v3, ref:r5',pm.trace.join());

    pm.root = {root:true,prop:'root',star:{prop:'p4',subs:{v4:{prop:'p5',subs:{v5:{ref:'r6'}}}}}}; pm.trace = [];
    assert.equal('r6',pm.find({p4:'v4',p5:'v5'}));
    assert.equal(' root->null, *, p4->v4, p5->v5, ref:r6',pm.trace.join());
  },


  toString: function(assert) {
    var pm = new PropMap();

    pm.root = {root:true,prop:'root',star:{ref:'ref1'}}; //sys.puts(pm.toString());
    assert.equal('PropMap:root:\n * -> :\n ref1',pm.toString().replace(/ +/g,' '));

    pm.root = {root:true,prop:'root',star:{prop:'p1',star:{ref:'r3'}}}; //sys.puts(pm.toString());
    assert.equal('PropMap:root:\n * -> p1:\n * -> :\n r3',pm.toString().replace(/ +/g,' '));

    pm.root = {root:true,prop:'root',star:{prop:'p2',subs:{v2:{ref:'r4'}}}}; //sys.puts(pm.toString());
    assert.equal('PropMap:root:\n * -> p2:\n v2 -> :\n r4\n',pm.toString().replace(/ +/g,' '));

    pm.root = {root:true,prop:'root',star:{prop:'p3',subs:{v2:{ref:'r4'},v3:{ref:'r5'}}}}; //sys.puts(pm.toString());
    assert.equal('PropMap:root:\n * -> p3:\n v2 -> :\n r4\n v3 -> :\n r5\n',pm.toString().replace(/ +/g,' '));

    pm.root = {root:true,prop:'root',star:{prop:'p4',subs:{v4:{prop:'p5',subs:{v5:{ref:'r6'}}}}}}; //sys.puts(pm.toString());
    assert.equal('PropMap:root:\n * -> p4:\n v4 -> p5:\n v5 -> :\n r6\n\n',pm.toString().replace(/ +/g,' '));
    
  }

}