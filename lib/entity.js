/* Copyright (c) 2010-2012 Richard Rodger */

var common  = require('./common');

var util    = common.util;
var assert  = common.assert;
var _       = common._;
var uuid    = common.uuid;


var noop = common.noop


/* Properties without '$' suffix are persisted
 * id property is special: created if not present when saving
 * func$ functions provide persistence operations
 */
function Entity( $, si ) {
  var self = {}

  var log = si.log


  function entargs( args ) {
    args.role = 'entity'
    args.ent = self
    $.name && (args.name = $.name)
    $.base && (args.base = $.base)
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
    var seneca_instance = (this && this.seneca) ? this : si
    //console.log('entity.make '+seneca_instance)

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


    var name, base, zone

    if( _.isString(props.entity$) ) {
      var m = /\$?(\w+|-)\/(\w+|-)\/(\w+|-)/.exec(props.entity$)
      if( m ) {
        zone = '-' == m[1] ? void 0 : m[1]
        base = '-' == m[2] ? void 0 : m[2]
        name = '-' == m[3] ? void 0 : m[3]
      }
    }

    name   = args.pop() || props.name$
    base   = args.pop() || props.base$
    zone   = args.pop() || props.zone$

    var new$ = {}
    new$.name     = name || $.name;
    new$.base     = base || $.base;
    new$.zone     = zone || $.zone;


    var entity = new Entity(new$,seneca_instance);


    for( var p in props ) {
      if( props.hasOwnProperty(p) && '$'!=p.charAt(p.length-1) && '$'!=p.charAt(0) ) {
        entity[p] = props[p];
      }
    }

    log('make',entity.canon$({string:true}),entity)
    return entity
  }


  // save one
  self.save$ = function(props,cb) {
    if( _.isFunction(props) ) {
      cb = props
    }
    else if( _.isObject(props) ) {
      self.data$(props)
    }

    si.act( entargs({cmd:'save'}),cb||noop)
    return self
  }


  // provide native database driver
  self.native$ = function(cb) {
    si.act( entargs({cmd:'native'}),cb||noop)
    return self
  }


  // load one
  // TODO: qin can be an entity, in which case, grab the id and reload
  self.load$ = function(qin,cb) {
    var qent = self
    var q = 
      (_.isUndefined(qin) || _.isNull(qin) ) ? {id:self.id} :
      _.isString(qin) ? {id:qin} : qin

    si.act( entargs({qent:qent,q:q,cmd:'load'}),cb||noop )

    return self
  }


  // TODO: need an update$ - does an atomic upsert


  // list zero or more
  self.list$ = function(qin,cb) {
    var qent = self
    var q = qin //buildquery(qin)

    si.act( entargs({qent:qent,q:q,cmd:'list'}),cb||noop )

    return self
  }
  

  // remove one or more
  // TODO: make qin optional, in which case, use id
  self.remove$ = function(qin,cb) {
    var q = 
      (_.isUndefined(qin) || _.isNull(qin) ) ? {id:self.id} :
      _.isString(qin) ? {id:qin} : qin

    si.act( entargs({qent:self,q:q,cmd:'remove'}),cb||noop )

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
  }


  self.close$ = function(cb) {
    log('close')
    si.act( entargs({cmd:'close'}), cb||noop)
  }


  self.canon$ = function(opt) {
    if( opt ) {
      // change type
      $.zone = void 0==opt.zone ? $.zone : opt.zone
      $.base = void 0==opt.base ? $.base : opt.base
      $.name = void 0==opt.name ? $.name : opt.name
    }

    return ( void 0==opt || opt.string || opt.string$ ) ? 
      [ (opt&&opt.string$?'$':'')+
        (void 0==$.zone?'-':$.zone),
        void 0==$.base?'-':$.base,
        void 0==$.name?'-':$.name].join('/')  
    : opt.array  ? [$.zone,$.base,$.name] 
    : opt.array$ ? [$.zone,$.base,$.name]  
    : opt.object ? {zone:$.zone,base:$.base,name:$.name}
    : opt.object$ ? {zone$:$.zone,base$:$.base,name$:$.name}
    : [$.zone,$.base,$.name]
  }


  // data = object, or true|undef = include $, false = exclude $
  self.data$ = function(data) {
    if( _.isObject(data) ) {
      // does not remove fields by design!
      for( var f in data ) {
        if( '$'!=f.charAt(0) && '$'!=f.charAt(f.length-1) ) {
          self[f] = data[f]
        }
      }

      return self
    }
    else {
      var include_$ = _.isUndefined(data) ? true : data
      var data = {}
      var fields = self.fields$()
      for( var fI = 0; fI < fields.length; fI++ ) {
        data[fields[fI]] = self[fields[fI]]
      }

      if( include_$ ) {
        data.$ = {zone:$.zone,base:$.base,name:$.name}
      }
      
      return data
    }
  }


  self.clone$ = function() {
    return self.make$(self.data$())
  }


  self.toString = function() {
    var sb = ['$',self.canon$({string:true}),':{id=',self.id,';']
    var hasp = 0
    var fields = self.fields$()
    fields.sort()
    for( var fI = 0; fI < fields.length; fI++ ) {
      if( 'id' == fields[fI] ) continue;
      hasp = 1
      sb.push(fields[fI])
      sb.push('=')

      var val = self[fields[fI]]
      if( _.isDate(val) ) {
        sb.push( val.toISOString() )
      }
      else if( _.isObject( val ) ) {
        val = util.inspect(val,{depth:3}).replace(/\s+/g,'')
        sb.push( val )
      }
      else sb.push( ''+val );

      sb.push(';')
    }
    sb[sb.length-hasp]='}'

    return sb.join('')
  }


  self.inspect = self.toString


  // use as a quick test to identify Entity objects
  // returns compact string zone/base/name
  self.entity$ = self.canon$()


  return self
}


exports.Entity = Entity;
