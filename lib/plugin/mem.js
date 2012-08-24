/* Copyright (c) 2010-2011 Ricebridge */

var common  = require('../common');

var eyes    = common.eyes;
var util    = common.util;
var assert  = common.assert;
var _       = common._;
var uuid    = common.uuid;


function MemStore() {
  var self = {};
  self.name = 'mem'
  self.role = 'entity'


  self.init = function(seneca,opts,cb) {
    var entmap = {};

    var list = function(qent,q,cb) {
      var list = []

      var base = qent.$.base$;
      var name = qent.$.name$;
      var tenant = qent.$.tenant$;
      var entset = 
        entmap[base] ? 
        entmap[base][name] ? 
        entmap[base][name][tenant] :
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


    seneca.add({on:self.name,cmd:'save'},function(args,cb){
      var ent = args.ent

      if( !ent ) {
        return seneca.fail('ent property missing',cb)
      }

      if( !ent.id ) {
        ent.id = uuid()
      }
    
      var base   = ent.$.base$;
      var name   = ent.$.name$;
      var tenant = ent.$.tenant$;

      entmap[base] = entmap[base] || {};
      entmap[base][name] = entmap[base][name] || {};
      entmap[base][name][tenant] = entmap[base][name][tenant] || {};

      entmap[base][name][tenant][ent.id] = ent;

      seneca.log(args.tag$,'save',ent)
      cb(null,ent);
    })


    seneca.add({on:self.name,cmd:'load'},function(args,cb){
      var qent = args.qent
      var q    = args.q

      list(qent,q,function(err,list){

        seneca.log(args.tag$,'load',list[0])
        cb(err, list[0] || null);
      })
    })


    seneca.add({on:self.name,cmd:'list'},function(args,cb){
      var qent = args.qent
      var q    = args.q

      list(qent,q,function(err,list){
        seneca.log(args.tag$,'list',list.length,list[0])
        cb(err, list);
      })
    })


    seneca.add({on:self.name,cmd:'remove'},function(args,cb){
      var qent = args.qent
      var q    = args.q
  
      list(qent,q,function(err,list){
        if( err ) {
          cb(err)
        }
        else {
          list.forEach(function(ent){
            delete entmap[ent.$.base$][ent.$.name$][ent.$.tenant$][ent.id]
            seneca.log(args.tag$,'remove',ent)
          })

          cb(null,list)
        }
      })
    })


    seneca.add({on:self.name,cmd:'close'},function(args,cb){
      seneca.log(args.tag$,'close')
      cb()
    })


    cb()
  }


  self.api = function( seneca ) {
    return {
      name:   self.name,
      save:   function(args,cb){ seneca.act(_.extend(args,{on:self.name,cmd:'save'}), cb) },
      load:   function(args,cb){ seneca.act(_.extend(args,{on:self.name,cmd:'load'}), cb) },
      list:   function(args,cb){ seneca.act(_.extend(args,{on:self.name,cmd:'list'}), cb) },
      remove: function(args,cb){ seneca.act(_.extend(args,{on:self.name,cmd:'remove'}), cb) },
      close:  function(args,cb){ seneca.act(_.extend(args,{on:self.name,cmd:'close'}), cb) },
    }
  }


  return self
}

exports.plugin = function() {
  return new MemStore()
}

