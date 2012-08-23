/* Copyright (c) 2010-2012 Richard Rodger */

var common  = require('./common');

var eyes    = common.eyes;
var util    = common.util;
var assert  = common.assert;
var _       = common._;
var uuid    = common.uuid;


/* Properties without '$' suffix are persisted
 * id property is special: created if not present when saving
 * func$ functions provide persistence operations
 */
function Entity( si ) {
  var self = {};

  self.$ = {

    // TODO: can this be private?
    api$: si.api('entity')
  }

  var log = si.log

  // args: (<tenant>,<base>,<name>,<props>)
  // can be partially specified:
  // make$(name)
  // make$(base,name)
  // make$(tenant,base,name)
  // make$(tenant,base,null)
  // make$(tenant,null,null)
  // props can specify tenant$,base$,name$, but args override if present
  self.make$ = function() {
    var args = [].slice.call(arguments)

    var argprops = args[args.length-1]
    var props = {}
    if( argprops && 'object' == typeof(argprops) ) {
      args.pop()
      props = _.clone(argprops)      
    }

    while(args.length < 3 ) {
      args.unshift(null)
    }


    props.name$   = args.pop() || props.name$
    props.base$   = args.pop() || props.base$
    props.tenant$ = args.pop() || props.tenant$

    var entity = new Entity(si);

    entity.$.name$     = props.name$   || self.$.name$;
    entity.$.base$     = props.base$   || self.$.base$;
    entity.$.tenant$   = props.tenant$ || self.$.tenant$;

    for( var p in props ) {
      if( props.hasOwnProperty(p) && '$'!=p.charAt(p.length-1) && '$'!=p.charAt(0) ) {
        entity[p] = props[p];
      }
    }

    log('make',self.canonstr$(),entity)
    return entity;
  }


  // save one
  self.save$ = function(cb) {
    self.$.api$.save({ent:self},function(){
      cb.apply(null,arguments)
    })

    return self
  }


  // load one
  self.load$ = function(qin,cb) {
    var qent = self
    var q    = buildquery(qin)

    self.$.api$.load({qent:qent,q:q},function(){
      cb.apply(null,arguments)
    })

    return self
  }


  // TODO: need an update$ - does an atomic upsert


  // list zero or more
  self.list$ = function(qin,cb) {
    var qent = self
    var q = buildquery(qin)

    self.$.api$.list({qent:qent,q:q},function(){
      var err = arguments[0]
      var list = arguments[1]
      cb.apply(null,arguments)
    })

    return self
  }
  

  // remove one or more
  // TODO: make qin optional, in which case, use id
  self.remove$ = function(qin,cb) {
    var q = buildquery(qin);
    self.$.api$.remove({qent:self,q:q},cb)
    return self
  }
  self.delete$ = self.remove$


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
    if( self.$.api$ ) {
      log&&log('close')
      self.$.api$.close(cb)
    }
  }


  self.canon$ = function() {
    return [self.$.tenant$,self.$.base$,self.$.name$]
  }

  self.canonstr$ = function() {
    return self.canon$().join('/')
  }


  self.data$ = function(data) {
    if( data ) {
      // does not remove fields by design!
      for( var f in data ) {
        if( '$'!=f.charAt(0) && '$'!=f.charAt(f.length-1) ) {
          self[f] = data[f]
        }
      }
    }
    else {
      var data = {}
      var fields = self.fields$()
      for( var fI = 0; fI < fields.length; fI++ ) {
        data[fields[fI]] = self[fields[fI]]
      }
      data.$ = {tenant$:self.$.tenant$,base$:self.$.base$,name$:self.$.name$}
      return data
    }
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
      sb.push(';');
    }
    sb[sb.length-hasp]='}';
    return sb.join('');
  }


  var buildquery = function(qin) {
    var q = {};
    if( null == qin || 'undefined'==typeof(qin) ) {
      q.id = self.id;
    }    
    else if( 'object' != typeof(qin) ) {
      q.id = qin;
    }
    else {
      for(var qp in qin) {
        q[qp] = qin[qp];
      }
    }
    return q;
  }

  return self
}


exports.Entity = Entity;