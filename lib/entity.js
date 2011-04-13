/* Copyright (c) 2010 Ricebridge */

var common  = require('./common');
var E = common.E;

var eyes    = common.eyes;
var util    = common.util;
var assert  = common.assert;
var _       = common._;
var uuid    = common.uuid;

//var Context = require('./context').Context;

/* Properties without '$' suffix are persisted
 * id property is special: created if not present when saving
 * func$ functions provide persistence operations
 */
function Entity() {
  var self = this;
  self.$ = {/*context$:Context.system,*/log$:function(){}};

  var log = null
  self.logger$ = function(l) {
    log = l
    //self.$.log$ = function(){
    //  util.debug(log)
    //  log && log.apply(self,arguments)
    //}
  }


  // args: (<tenant>,<base>,<name>,<props>)
  // props can specify tenant$,base$,name$, but args override if present
  self.make$ = function() {
    var args = [].slice.call(arguments)
    var props = _.clone(args.pop() || {})
    props.name$   = args.pop() || props.name$
    props.base$   = args.pop() || props.base$
    props.tenant$ = args.pop() || props.tenant$

    var entity = new Entity();
    entity.$.store$ = self.$.store$;
    entity.$.name$     = props.name$   || self.$.name$;
    entity.$.base$     = props.base$   || self.$.base$;
    entity.$.tenant$   = props.tenant$ || self.$.tenant$;
    //entity.$.context$  = props.context$ || self.$.context$;
    entity.logger$(log)

    for( var p in props ) {
      if( props.hasOwnProperty(p) && '$'!=p.charAt(p.length-1) && '$'!=p.charAt(0) ) {
        entity[p] = props[p];
      }
    }

    log&&log('make',entity)    
    return entity;
  }


  // save one
  self.save$ = function(cb) {
    //self.$.context$.allow({perm:'write',tenant:self.$.tenant$,base:self.$.base$,name:self.$.name$},function(perm){
      var tag; 
      log && (tag = uuid().substring(0,4)) && log('save','in',tag,self/*,perm*/)    

      //if( perm.allow ) {
        self.$.store$().save(self,function(){
          var err = arguments[0]
          log&&log.apply(self,_.flatten(['save','out',tag,err,Array.prototype.slice.call(arguments,1)]))
          cb & cb.apply(self,arguments)
        })
      //}
      //else {
      //  cb( {err:'perm',perm:perm} );
      //}
    //});
    return self;
  }


  // load one
  self.load$ = function(qin,cb) {
    var tag
    //eyes.inspect(self,'find$');
    // perm check goes here
    var qent = self.make$(qin);
    var q = buildquery(qin);
    log && (tag = uuid().substring(0,4)) && log('load','in',tag,q,qent.canon$().join('/')/*,perm*/)    

    self.$.store$().load(qent,q,function(){
      var err = arguments[0]
      log&&log.apply(self,_.flatten(['load','out',tag,err,Array.prototype.slice.call(arguments,1)]))
      cb & cb.apply(self,arguments)
    });
    return self;
  }

  
  // list zero or more
  self.list$ = function(qin,cb) {
    //eyes.inspect(self,'find$');
    // perm check goes here
    var qent = self.make$(qin);
    var q = buildquery(qin);
    log && (tag = uuid().substring(0,4)) && log('list','in',tag,q,qent.canon$().join('/')/*,perm*/)    

    self.$.store$().list(qent,q,function(){
      var err = arguments[0]
      var list = arguments[1]
      log&&log.apply(self,['list','out',tag,err,list&&list.length])
      cb & cb.apply(self,arguments)
    });
    return self;
  }
  

  // remove one or more
  self.remove$ = function(qin,cb) {
    // perm check goes here
    var q = buildquery(qin);
    log&&log('remove',q,self.canon$().join('/'))    

    self.$.store$().remove(self,q,cb);
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
      log&&log('close')
      self.$.store$().close(cb);
    }
  }


  self.canon$ = function() {
    return [self.$.tenant$,self.$.base$,self.$.name$]
  }


  self.toString = function() {
    var sb = [self.canon$().join('/'),':{'];
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
    }
    return q;
  }
}

Entity.$ = {
  storemap: {},
};


Entity.register$ = function(entitystore) {
  if( 'string' == typeof(entitystore) ) {
    entitystore = require('./entity-'+entitystore+'.js')
  }
  else {
    Entity.$.storemap[entitystore.name] = entitystore;
  }
}


Entity.init$ = function(spec,cb) {
  var conf = 'string' == typeof(spec) ? null : spec

  var storename = null
  if( !conf ) {
    var urlM = /^([^:]+)(:|$)/.exec(spec);
    if( !urlM ) {
      throw "invalid store url: "+spec;
    }
    storename = urlM[1];
  }
  else {
    storename = spec.type
  }

  var ent = new Entity();
  var store = Entity.$.storemap[storename];

  if( store ) {
    ent.$.store$ = function(){ return store };

    // FIX: should a constructor - new instance of the store each time
    store.init( spec, function(err){
      cb && cb(err?err:null,ent);
    });
  }
  else {
    ent = {err:'seneca_unknown_entity',desc:spec}
    cb && cb(out)
  }

  // more useful for mem store
  if( !cb ) {
    return ent
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
      ent.id = uuid()
    }
    
    var base   = ent.$.base$;
    var name   = ent.$.name$;
    var tenant = ent.$.tenant$;

    self.entmap[base] = self.entmap[base] || {};
    self.entmap[base][name] = self.entmap[base][name] || {};
    self.entmap[base][name][tenant] = self.entmap[base][name][tenant] || {};

    self.entmap[base][name][tenant][ent.id] = ent;

    //require('eyes').inspect(ent)
    cb(null,ent);
  }


  self.load = function(qent,q,cb) {
    //eyes.inspect(q,'mem q');
    //eyes.inspect(self.entmap,'mem entmap');
    /*
    var base = qent.$.base$;
    var name = qent.$.name$;
    var tenant = qent.$.tenant$;
    var ent = 
      self.entmap[base] ? 
      self.entmap[base][name] ? 
      self.entmap[base][name][tenant] ? 
      self.entmap[base][name][tenant][q.id] : null : null : null;
    */

    self.list(qent,q,function(err,list){
      cb(err, list[0] || null);
    })
  }


  self.list = function(qent,q,cb) {
    var list = []

    var base = qent.$.base$;
    var name = qent.$.name$;
    var tenant = qent.$.tenant$;
    var entset = 
      self.entmap[base] ? 
      self.entmap[base][name] ? 
      self.entmap[base][name][tenant] :
      null : null ;

    if( null != entset ) {
      _.keys(entset).forEach(function(id){
        var ent = entset[id]
        for(var p in q) {
          if( q[p] != ent[p] ) {
            return
          }
        }
        list.push(ent)
      })
    }

    cb(null,list)
  }
  
  self.remove = function(qent,q,cb) {
    /*
    var base = qent.$.base$;
    var name = qent.$.name$;
    var tenant = qent.$.tenant$;
    if( self.entmap[base] && self.entmap[base][name] && self.entmap[base][name][tenant] && self.entmap[base][name][tenant][q.id] ) {
      delete self.entmap[base][name][tenant][q.id];
    }
    cb(null);
    */

    self.list(qent,q,function(err,list){
      if( err ) {
        cb(err)
      }
      else {
        list.forEach(function(ent){
          delete self.entmap[ent.$.base$][ent.$.name$][ent.$.tenant$][ent.id]
        })
        cb(null,null)
      }
    })

  }


  self.close = function(cb){
    cb && cb()
  }
}

Entity.register$( new MemStore() );


exports.Entity = Entity;