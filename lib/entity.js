/* Copyright (c) 2010 Ricebridge */

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

    var entity = new Entity();
    entity.$.store$ = self.$.store$;
    entity.$.name$     = props.name$   || self.$.name$;
    entity.$.base$     = props.base$   || self.$.base$;
    entity.$.tenant$   = props.tenant$ || self.$.tenant$;
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
          cb && cb.apply(self,arguments)
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
    // perm check goes here
    var qent = self//self.make$(qin);
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
    var qent = self//self.make$(qin);
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
  // TODO: make qin optional, in which case, use id
  self.remove$ = function(qin,cb) {
    // perm check goes here
    var q = buildquery(qin);
    log&&log('remove',q,self.canon$().join('/'))    

    self.$.store$().remove(self,q,cb);
    return self;
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
    if( self.$.store$ ) {
      log&&log('close')
      self.$.store$().close(cb);
    }
  }


  self.canon$ = function() {
    return [self.$.tenant$,self.$.base$,self.$.name$]
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
}

Entity.$ = {
  storemap: {},
};


Entity.register$ = function(entitystore) {
  Entity.$.storemap[entitystore.name] = entitystore
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


  var refstore = Entity.$.storemap[storename];

  if( !refstore ) {
    try {
      refstore = require('./entity/'+storename+'.js').store(spec)
      Entity.register$(refstore)
    }
    catch( e ) {
      cb(e)
    }
  }

  if( refstore ) {
    refstore.init( spec, function(err,store) {
      var ent = new Entity();
      ent.$.store$ = function(){ return store };
      cb && cb(err?err:null,ent);
    })
  }
  else {
    var err = {err:'unknown_entity',desc:spec}
    cb && cb(err)
  }
}



exports.Entity = Entity;