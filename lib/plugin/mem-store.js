/* Copyright (c) 2010-2012 Richard Rodger */

var common  = require('../common');
var store   = require('./store');

var eyes    = common.eyes;
var util    = common.util;
var assert  = common.assert;
var _       = common._;
var uuid    = common.uuid;


function MemStore() {
  var self   = new store.Store()
  var parent = self.parent()

  self.name = 'mem-store'


  var mark = common.idgen(12)


  var seneca
  var entmap = {}

  var list = function(qent,q,cb) {
    var list = []

    var canon = qent.canon$({object:true})
    var base = canon.base;
    var name = canon.name;
    var zone = canon.zone;

    var entset = 
      entmap[base] ? 
      entmap[base][name] ? 
      entmap[base][name][zone] :
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
  

  self.save$ = function(args,cb){
    var ent = args.ent

    if( !ent ) {
      return seneca.fail('ent property missing',cb)
    }

    if( !ent.id ) {
      ent.id = uuid()
    }
    
    var canon = ent.canon$({object:true})
    var base   = canon.base;
    var name   = canon.name;
    var zone = canon.zone;
    
    entmap[base] = entmap[base] || {};
    entmap[base][name] = entmap[base][name] || {};
    entmap[base][name][zone] = entmap[base][name][zone] || {};
    
    entmap[base][name][zone][ent.id] = ent;
    
    seneca.log(args.tag$,'save',ent,mark)
    cb(null,ent);
  }


  self.load$ = function(args,cb){
    var qent = args.qent
    var q    = args.q

    list(qent,q,function(err,list){
      seneca.log(args.tag$,'load',list[0],mark)
      cb(err, list[0] || null);
    })
  }


  self.list$ = function(args,cb){
    var qent = args.qent
    var q    = args.q

    list(qent,q,function(err,list){
      seneca.log(args.tag$,'list',list.length,list[0])
      cb(err, list);
    })
  }


  self.remove$ = function(args,cb){
    var qent = args.qent
    var q    = args.q
  
    list(qent,q,function(err,list){
      if( err ) {
        cb(err)
      }
      else {
        list.forEach(function(ent){
          var canon = qent.canon$({object:true})
          
          delete entmap[canon.base][canon.name][canon.zone][ent.id]
          seneca.log(args.tag$,'remove',ent)
        })
        
        cb(null,list)
      }
    })
  }


  self.close$ = function(args,cb){
    seneca.log(args.tag$,'close')
    cb()
  }



  self.init = function(si,opts,cb) {
    parent.init(si,opts,function(){
      seneca = si
      cb()
    })
  }


  return self
}

exports.plugin = function() {
  return new MemStore()
}

