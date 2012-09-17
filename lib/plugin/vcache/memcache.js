/* Copyright (c) 2011 Ricebridge */

var common  = require('../../common');

var eyes    = common.eyes;
var util    = common.util;
var assert  = common.assert;
var _       = common._;
var uuid    = common.uuid;

var Memcached = require( 'memcached' )
var LRU       = require( 'lru-cache' )


// FIX: factor top level and lru operations out to common vcache code
function Memcache(store,seneca,opts) {
  var self = this

  self.name = 'vcache~'+store().name

  var expires = opts.expires || 3600
  var servers = opts.servers || ["127.0.0.1:11211"]
  var options = _.extend(opts.config||{},{reconnect:2000,timeout:2000,retries:2,retry:2000,remove:false})

  
  var memcached = new Memcached(servers,options)
  var lrucache  = LRU(1111)

  console.dir(servers)
  console.dir(options)


  function ef(cb) {
    return function(win) {
      return function(err,out,v){
        err ? cb(err) : win(out,v)
      }
    }
  }


  function incr(qstr,cb) {
    var er = ef(cb)
    var vkey = "ent~v~"+qstr
    memcached.incr( vkey, 1, er(function(done){
      if( done ) { 
        cb(null,done)
      }
      else {
        // should be add!!
        memcached.set( vkey, 0, expires, er(function(){
          cb(null,0)
        }))
      }
    }))
  }

  function set(ent,qstr,v,cb) {
    var key = "ent~d~"+v+"~"+qstr
    lrucache.set( key, ent )
    memcached.set(key,ent.data$(),expires,cb)
  }

  function get(qstr,cb) {
    var er = ef(cb)
    var vkey = "ent~v~"+qstr
    memcached.get(vkey,er(function(v){
      //console.log('MEMCACHE GET: '+vkey+'='+v)

      if( false === v ) {
        cb(null,null,0)
      }
      else {
        var key = "ent~d~"+v+"~"+qstr

        var out = lrucache.get(key)
        if( out ) {
          //console.log('lru hit: '+key)
          cb(null,out,v)
        }
        else {
          memcached.get(key,er(function(out){
            cb(null,out,v)
          }))
        }
      }
    }))
  }

  function makeqstr(q) {
    if( 'string'==typeof(q) ) {
      return q
    }
    else if( q.id && 1 == _.keys(q).length ) {
      return q.id
    }
    else {
      return JSON.stringify(q)
    }
  }


  self.db = function() {
    return store().db()
  }


  self.save = function(ent,cb) {
    var er = ef(cb)
    store().save(ent,er(function(ent){
      incr(ent.id,er(function(v){
        set(ent,ent.id,v,er(function(){
          cb(null,ent)
        }))
      }))
    }))
  }


  self.load = function(qent,q,cb) {
    var er = ef(cb)
    var qstr = makeqstr(q)
    get(qstr,er(function(out,v){
      if( out ) {
        cb(null,qent.make$(out))
      }
      else {
        store().load(qent,q,er(function(out){
          if( out ) {
            set(out,qstr,v,er(function(){
              cb(null,out)
            }))
          }
          else {
            cb(null,null)
          }
        }))
      }
    }))
  }


  self.list = function(qent,q,cb) {
    store().list(qent,q,cb)
  }


  // FIX: does not work if qstr != id or multiple qstr's used for load$
  self.remove = function(qent,q,cb) {
    var er = ef(cb)
    store().remove(qent,q,er(function(out){
      var qstr = makeqstr(q)
      var vkey = "ent~v~"+qstr
      memcached.set(vkey,-1,expires,er(function(){
        cb(null,out)
      }))
    }))
  }


  self.close = function(cb){
    store().close(function(){
      memcached.end()
      cb && cb()
    })
  }
}


module.exports = Memcache