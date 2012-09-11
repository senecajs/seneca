/* Copyright (c) 2010-2012 Richard Rodger */

var common  = require('./common');

var util    = common.util;
var assert  = common.assert;
var _       = common._;
var uuid    = common.uuid;



/* Properties without '$' suffix are persisted
 * id property is special: created if not present when saving
 * func$ functions provide persistence operations
 */
function Entity( $, si ) {
  var self = {}

  var log = si.log


  function entargs( args ) {
    args.on = 'entity'
    args.ent = self
    $.name   && (args.name   = $.name)
    $.base   && (args.base   = $.base)
    $.zone && (args.zone = $.zone)
    return args
  }



  // args: (<zone>,<base>,<name>,<props>)
  // can be partially specified:
  // make$(name)
  // make$(base,name)
  // make$(zone,base,name)
  // make$(zone,base,null)
  // make$(zone,null,null)
  // props can specify zone,base,name, but args override if present
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


    var name   = args.pop() || props.name$
    var base   = args.pop() || props.base$
    var zone   = args.pop() || props.zone$

    var new$ = {}
    new$.name     = name || $.name;
    new$.base     = base || $.base;
    new$.zone     = zone || $.zone;

    var entity = new Entity(new$,si);


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
    si.act( entargs({cmd:'save'}),function(){
      cb.apply(null,arguments)
    })

    return self
  }


  // load one
  self.load$ = function(qin,cb) {
    var qent = self
    var q    = buildquery(qin)
    si.act( entargs({qent:qent,q:q,cmd:'load'}), function(){
      cb.apply(null,arguments)
    })

    return self
  }


  // TODO: need an update$ - does an atomic upsert


  // list zero or more
  self.list$ = function(qin,cb) {
    var qent = self
    var q = buildquery(qin)

    si.act( entargs({qent:qent,q:q,cmd:'list'}),function(){
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

    si.act( entargs({qent:self,q:q,cmd:'remove'}),cb )

    return self
  }
  self.delete$ = self.remove$


  self.fields$ = function() {
    var fields = [];
    for( var p in self) {
      if( self.hasOwnProperty(p) && '$'!=p && 'function'!=typeof(self[p]) && '$'!=p.charAt(p.length-1)) {
        fields.push(p);
      }
    }
    return fields

//    if( cb ) {
//      for( var fI = 0; fI < fields.length; fI++ ) {
//         cb(fields[fI],fI);
//       }
//     }
//     else {
//       return fields;
//     }
  }


  self.close$ = function(cb) {
    log('close')
    si.act( entargs({cmd:'close'}), cb)
  }


  self.canon$ = function(opt) {
    if( opt ) {
      return ( opt.string ? [$.zone,$.base,$.name].join('/')
               : opt.array  ? [$.zone,$.base,$.name]
               : opt.object ? {zone:$.zone,base:$.base,name:$.name}
               : [$.zone,$.base,$.name] )
    }  
    else return [$.zone,$.base,$.name]
  }


  // TODO: remove
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
      data.$ = {zone:$.zone,base:$.base,name:$.name}
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