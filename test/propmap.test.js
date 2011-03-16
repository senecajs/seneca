/* Copyright (c) 2010-2011 Ricebridge */


var common   = require('common')
var propmap  = require('propmap')

var sys     = common.sys
var eyes    = common.eyes
var assert  = common.assert

var PropMap = propmap.PropMap


module.exports = {
  init: function() {
    var pm = new PropMap();
    assert.equal('PropMap:root:\n',pm+'');
  },

  find: function() {
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


  toString: function() {
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
  },


  add: function() {
    var pm = new PropMap();
    
    pm.add( {p1:'v1'}, 'r1' ); //sys.puts(pm.toString());
    assert.equal('r1',pm.find({p1:'v1'}));
    assert.equal(null,pm.find({p2:'v1'}));
    assert.equal('PropMap:root:\n * -> p1:\n v1 -> :\n r1\n',pm.toString().replace(/ +/g,' '));

    pm.add( {p1:'v1'}, 'r1x' ); //sys.puts(pm.toString());
    assert.equal('r1x',pm.find({p1:'v1'}));
    assert.equal(null,pm.find({p2:'v1'}));
    assert.equal('PropMap:root:\n * -> p1:\n v1 -> :\n r1x\n',pm.toString().replace(/ +/g,' '));

    pm.add( {p1:'v2'}, 'r2' ); //sys.puts(pm.toString());
    assert.equal('r2',pm.find({p1:'v2'}));
    assert.equal(null,pm.find({p2:'v2'}));
    assert.equal('PropMap:root:\n * -> p1:\n v1 -> :\n r1x\n v2 -> :\n r2\n',pm.toString().replace(/ +/g,' '));

    pm.add( {p2:'v3'}, 'r3' ); //sys.puts(pm.toString());
    assert.equal('r3',pm.find({p2:'v3'}));
    assert.equal(null,pm.find({p2:'v2'}));
    assert.equal(null,pm.find({p2:'v1'}));
    assert.equal('PropMap:root:\n * -> p1:\n v1 -> :\n r1x\n v2 -> :\n r2\n * -> p2:\n v3 -> :\n r3\n',pm.toString().replace(/ +/g,' '));

    pm.add( {p1:'v1',p3:'v4'}, 'r4' ); //sys.puts(pm.toString());
    assert.equal('r4',pm.find({p1:'v1',p3:'v4'}));
    assert.equal('r1x',pm.find({p1:'v1',p3:'v5'}));
    assert.equal(null,pm.find({p2:'v1'}));
    assert.equal('PropMap:root:\n * -> p1:\n v1 -> p3:\n v4 -> :\n r4\n * -> :\n r1x\n v2 -> :\n r2\n * -> p2:\n v3 -> :\n r3\n',pm.toString().replace(/ +/g,' '));
    
  }
}