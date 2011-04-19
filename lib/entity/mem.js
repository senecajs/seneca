/* Copyright (c) 2010-2011 Ricebridge */

var common  = require('../common');

var eyes    = common.eyes;
var util    = common.util;
var assert  = common.assert;
var _       = common._;
var uuid    = common.uuid;


function MemStore() {
  var self = this;
  self.name = 'mem';

  self.entmap = {};

  self.init = function(url,cb) {
    cb( null, new MemStore() );
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

    cb(null,ent);
  }


  self.load = function(qent,q,cb) {
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

exports.store = function(spec) {
  return new MemStore()
}

