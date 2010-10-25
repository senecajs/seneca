/* Copyright (c) 2010 Ricebridge */

var common  = require('./common');
var E = common.E;

var sys     = common.sys;
var eyes    = common.eyes;
var assert  = common.assert;

/* Properties without '$' prefix are persisted
 * id property is special: created if not present when saving
 * $func functions provide persistence operations
 */
function Entity() {
  var self = this;
  self.$ = function() {};

  self.$make = function(props) {
    var entity = new Entity();
    entity.$.$store = self.$.$store;
    entity.$.$base  = props.$base || self.$.$base;
    entity.$.$name  = props.$name || self.$.$name;

    for( var p in props ) {
      if( props.hasOwnProperty(p) && '$'!=p.charAt(0) ) {
        entity[p] = props[p];
      }
    }

    return entity;
  }

  self.$save = function(cb) {
    // perm check goes here
    self.$.$store.save(self,cb);
    return self;
  }

  self.$find = function(qin,cb) {
    // perm check goes here
    var q = buildquery(qin);
    self.$.$store.find(q,cb);
    return self;
  }

  self.$remove = function(qin,cb) {
    // perm check goes here
    var q = buildquery(qin);
    self.$.$store.remove(q,cb);
    return self;
  }

  self.toString = function() {
    var sb = [self.$.$base,'/',self.$.$name,':{'];
    var hasp = 0;
    for( var p in self ) {
      if( self.hasOwnProperty(p) && 'function'!=typeof(self[p]) ) {
        hasp = 1;
        sb.push(p);
        sb.push('=');
        sb.push(self[p]);
        sb.push(',');
      }
    }
    sb[sb.length-hasp]='}';
    return sb.join('');
  }


  var buildquery = function(qin) {
    var q = {};
    if( 'object' != typeof(qin) ) {
      q.id = qin;
    }

    q.$base = qin.$base || self.$.$base; 
    q.$name = qin.$name || self.$.$name; 
    return q;
  }
}

Entity.$ = {};
Entity.$.$storemap = {};

Entity.$register = function(entitystore) {
  Entity.$.$storemap[entitystore.name] = entitystore;
}

Entity.$init = function(url) {
  var urlM = /^([^:]+):/.exec(url);
  if( !urlM ) {
    throw "invalid store url: "+url;
  }
  var storename = urlM[1];
  
  var ent = new Entity();
  var store = Entity.$.$storemap[storename];

  if( store ) {
    ent.$.$store = store.init( url );
  }
  else {
    throw "unknown store: "+storename;
  }

  return ent;
}


function MemStore() {
  var self = this;
  self.name = 'mem';

  self.entmap = {};

  self.init = function() {
    return self;
  }


  self.save = function(ent,cb) {
    if( !ent.id ) {
      ent.id = Math.random();
    }
    
    self.entmap[ent.$.$base] = self.entmap[ent.$.$base] || {};
    self.entmap[ent.$.$base][ent.$.$name] = self.entmap[ent.$.$base][ent.$.$name] || {};

    self.entmap[ent.$.$base][ent.$.$name][ent.id] = ent;
    cb(null,ent);
  }


  self.find = function(q,cb) {
    var ent = self.entmap[q.$base] ? self.entmap[q.$base][q.$name] ? self.entmap[q.$base][q.$name][q.id] ? self.entmap[q.$base][q.$name][q.id] : null : null : null;
    cb(null,ent);
  }

  
  self.remove = function(q,cb) {
    var ent = self.entmap[q.$base] ? self.entmap[q.$base][q.$name] ? self.entmap[q.$base][q.$name][q.id] : null : null;
    if( ent ) {
      delete self.entmap[q.$base][q.$name][q.id];
    }
    cb(null,ent);
  }
  
}

Entity.$register( new MemStore() );

exports.Entity = Entity;