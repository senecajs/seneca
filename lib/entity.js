/* Copyright (c) 2010-2012 Richard Rodger */

var common  = require('./common');

var util    = common.util;
var assert  = common.assert;
var _       = common._;
var uuid    = common.uuid;


var noop = common.noop


function parsecanon(str) {
  var out = {}
  
  if( !_.isString(str) ) return out;

  var m = /\$?((\w+|-)\/)?((\w+|-)\/)?(\w+|-)/.exec(str)
  if( m ) {
    var zi = void 0==m[4]?4:2, bi = void 0==m[4]?2:4
    
    out.zone = '-' == m[zi] ? void 0 : m[zi]
    out.base = '-' == m[bi] ? void 0 : m[bi]
    out.name = '-' == m[5] ? void 0 : m[5]
  }
  else throw new Error('invalid entity canon: "'+str+'"');

  return out
}




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
  // props can specify zone$,base$,name$, but args override if present
  // escaped names: foo_$ is converted to foo
  self.make$ = function() {
    //console.log('-------------make$')
    //console.dir($)
    //console.log(arguments)

    var seneca_instance = (this && this.seneca) ? this : si

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
      var canon = parsecanon(props.entity$)
      zone = canon.zone
      base = canon.base
      name = canon.name
    }
    else if( _.isObject(props.entity$ ) ) {
      zone = props.entity$.zone
      base = props.entity$.base
      name = props.entity$.name
    }


    // FIX: these shortcuts fail on '0'

    name   = args.pop() || props.name$ || name
    //console.dir(name)

    var canon = parsecanon(name)
    //console.dir(canon)

    name   = canon.name
    base   = args.pop() || canon.base || props.base$ || base
    zone   = args.pop() || canon.zone || props.zone$ || zone

    var new$ = {}
    new$.name     = name || $.name;
    new$.base     = base || $.base;
    new$.zone     = zone || $.zone;

    if( 'undefined' === new$.name || 'undefined' === new$.base || 'undefined' === new$.zone ) {
      console.log('BAD CANON')
      console.dir(new$)
      process.exit()
    }

    var entity = new Entity(new$,seneca_instance);

    for( var p in props ) {
      if( props.hasOwnProperty(p) ) {
        if( !~p.indexOf('$') ) {
          entity[p] = props[p];
        }
        else if( 2 < p.length && '_' == p[p.length-2] && '$' == p[p.length-1] ) {
          entity[p.substring(0,p.length-2)] = props[p];
        }
      }
    }

    if( props.hasOwnProperty('id$') ) {
      entity.id$ = props.id$
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
  // qin omitted => reload self
  self.load$ = function(qin,cb) {
    var qent = self

    var q = 
      (_.isUndefined(qin) || _.isNull(qin) || _.isFunction(qin)) ? {id:self.id} :
      _.isString(qin) ? {id:qin} : qin

    cb = _.isFunction(qin) ? qin : cb

    si.act( entargs({ qent:qent, q:q, cmd:'load' }), cb||noop )

    return self
  }


  // TODO: need an update$ - does an atomic upsert


  // list zero or more
  // qin is optional, if omitted, list all
  self.list$ = function(qin,cb) {
    var qent = self
    var q = qin
    if( _.isFunction(qin) ) {
      q = {}
      cb = qin
    }

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
        data.entity$ = {zone:$.zone,base:$.base,name:$.name}
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


Entity.parsecanon = parsecanon

exports.Entity = Entity


