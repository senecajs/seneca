/* Copyright (c) 2010 Ricebridge */

var common  = require('./common');
var E = common.E;

var sys     = common.sys;
var eyes    = common.eyes;
var assert  = common.assert;

var Context = require('./context').Context;

/* Properties without '$' suffix are persisted
 * id property is special: created if not present when saving
 * func$ functions provide persistence operations
 */
function Entity() {
  var self = this;
  self.$ = {context$:Context.system};

  self.make$ = function(props) {
    var entity = new Entity();
    entity.$.store$ = self.$.store$;
    entity.$.base$     = props.base$   || self.$.base$;
    entity.$.name$     = props.name$   || self.$.name$;
    entity.$.tenant$   = props.tenant$ || self.$.tenant$;
    entity.$.context$  = props.context$ || self.$.context$;

    for( var p in props ) {
      if( props.hasOwnProperty(p) && '$'!=p.charAt(0) ) {
        entity[p] = props[p];
      }
    }

    return entity;
  }

  self.save$ = function(cb) {
    self.$.context$.allow({perm:'write',tenant:self.$.tenant$,base:self.$.base$,name:self.$.name$},function(perm){
      if( perm.allow ) {
        self.$.store$.save(self,cb);
      }
      else {
        cb( {code:'perm',perm:perm} );
      }
    });
    return self;
  }

  self.find$ = function(qin,cb) {
    //eyes.inspect(self,'find$');
    // perm check goes here
    var qent = self.$make(qin);
    var q = buildquery(qin);
    self.$.store$.find(qent,q,cb);
    return self;
  }

  self.remove$ = function(qin,cb) {
    // perm check goes here
    var q = buildquery(qin);
    self.$.store$.remove(self,q,cb);
    return self;
  }

  self.fields$ = function(cb) {
    var fields = [];
    for( var p in self) {
      if( self.hasOwnProperty(p) && '$'!=p && 'function'!=typeof(self[p]) && '$'!=p.charAt(p.length-1)) {
        fields.push(p);
      }
    }
    if( cb ) {
      for( var fI = 0; fI < fields.length; fI++ ) {
        cb(fields[fI],fI);
      }
    }
    else {
      return fields;
    }
  }

  self.close$ = function(cb) {
    if( self.$.store$ ) {
      self.$.store$.close(cb);
    }
  }

  self.toString = function() {
    var sb = [self.$.tenant$,'/',self.$.base$,'/',self.$.name$,':{'];
    var hasp = 0;
    var fields = self.fields$();
    fields.sort();
    for( var fI = 0; fI < fields.length; fI++ ) {
      hasp = 1;
      sb.push(fields[fI]);
      sb.push('=');
      sb.push(self[fields[fI]]);
      sb.push(',');
    }
    sb[sb.length-hasp]='}';
    return sb.join('');
  }


  var buildquery = function(qin) {
    var q = {};
    if( 'object' != typeof(qin) ) {
      q.id = qin;
    }
    else {
      for(var qp in qin) {
        q[qp] = qin[qp];
      }
      delete q.$tenant;
      delete q.$base;
      delete q.$name;
    }
    return q;
  }
}

Entity.$ = {
  storemap: {},
};


Entity.register$ = function(entitystore) {
  Entity.$.storemap[entitystore.name] = entitystore;
}

Entity.init$ = function(url,cb) {
  var urlM = /^([^:]+):/.exec(url);
  if( !urlM ) {
    throw "invalid store url: "+url;
  }
  var storename = urlM[1];
  
  var ent = new Entity();
  var store = Entity.$.storemap[storename];

  if( store ) {
    ent.$.store$ = store;
    store.init( url, function(){
      cb(ent);
    });
  }
  else {
    throw "unknown store: "+storename;
  }
}




function MemStore() {
  var self = this;
  self.name = 'mem';

  self.entmap = {};

  self.init = function(url,cb) {
    cb();
  }


  self.save = function(ent,cb) {
    if( !ent.id ) {
      ent.id = (''+Math.random()).substring(2);
    }
    
    var base   = ent.$.base$;
    var name   = ent.$.name$;
    var tenant = ent.$.tenant$;

    self.entmap[base] = self.entmap[base] || {};
    self.entmap[base][name] = self.entmap[base][name] || {};
    self.entmap[base][name][tenant] = self.entmap[base][name][tenant] || {};

    self.entmap[base][name][tenant][ent.id] = ent;
    cb(null,ent);
  }


  self.find = function(qent,q,cb) {
    //eyes.inspect(q,'mem q');
    //eyes.inspect(self.entmap,'mem entmap');
    var base = qent.$.base$;
    var name = qent.$.name$;
    var tenant = qent.$.tenant$;
    var ent = self.entmap[base] ? 
      self.entmap[base][name] ? 
      self.entmap[base][name] ? 
      self.entmap[base][name][tenant] ? 
      self.entmap[base][name][tenant][q.id] : null : null : null : null;
    cb(null,ent);
  }

  
  self.remove = function(qent,q,cb) {
    var base = qent.$.base$;
    var name = qent.$.name$;
    var tenant = qent.$.tenant$;
    if( self.entmap[base] && self.entmap[base][name] && self.entmap[base][name][tenant] && self.entmap[base][name][tenant][q.id] ) {
      delete self.entmap[base][name][tenant][q.id];
    }
    cb(null);
  }
  
}

Entity.register$( new MemStore() );


exports.Entity = Entity;