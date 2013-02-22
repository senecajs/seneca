/* Copyright (c) 2010-2013 Richard Rodger */
"use strict"


var _       = require('underscore')
var uuid    = require('node-uuid')




function list(si,entmap,qent,q,cb) {
  var list = []

  var canon = qent.canon$({object:true})
  var base = canon.base
  var name = canon.name

  var entset = entmap[base] ? entmap[base][name] : null ;
    
  if( entset ) {
    _.keys(entset).forEach(function(id){
      var ent = entset[id]
      
      for(var p in q) {
        if( !~p.indexOf('$') && q[p] != ent[p] ) {
          return
        }
      }
      
      list.push(ent)
    })
  }
  
  cb.call(si,null,list)
}



module.exports = function(opts,cb) {
  var desc

  var entmap = {}

  var store = {

    name: 'mem-store',


    save: function(args,cb){
      var si = this
      var ent = args.ent

      var create = !ent.id

      var canon = ent.canon$({object:true})
      var zone   = canon.zone
      var base   = canon.base
      var name   = canon.name

  
      if( create ) {
        this.act({role:'util', cmd:'generate_id', name:name, base:base, zone:zone }, function(err,id){
          if( err ) return cb(err);
          do_save(id)
        })
      }
      else do_save();

      function do_save(id) {
        if( id ) {
          ent.id = id
        }

        entmap[base] = entmap[base] || {}
        entmap[base][name] = entmap[base][name] || {}

        entmap[base][name][ent.id] = ent
  
        si.log.debug(function(){return['save/'+(create?'insert':'update'),ent.canon$({string:1}),ent,desc]})
        cb(null,ent)
      }
    },


    load: function(args,cb){
      var qent = args.qent
      var q    = args.q

      list(this,entmap,qent,q,function(err,list){
        var ent = list[0] || null
        this.log.debug(function(){return['load',q,qent.canon$({string:1}),,ent,desc]})
        cb(err, ent)
      })
    },


    list: function(args,cb){
      var qent = args.qent
      var q    = args.q

      list(this,entmap,qent,q,function(err,list){
        this.log.debug(function(){return['list',q,qent.canon$({string:1}),,list.length,list[0],desc]})
        cb(err, list)
      })
    },


    remove: function(args,cb){
      var seneca = this

      var qent = args.qent
      var q    = args.q

      var all  = q.all$ // default false
      var load  = _.isUndefined(q.load$) ? true : q.load$ // default true 
  
      list(seneca,entmap,qent,q,function(err,list){
        if( err ) return cb(err);

        list = all ? list : 0<list.length ? list.slice(0,1) : []

        list.forEach(function(ent){
          var canon = qent.canon$({object:true})
          
          delete entmap[canon.base][canon.name][ent.id]
          seneca.log.debug(function(){return['remove/'+(all?'all':'one'),q,qent.canon$({string:1}),,ent,desc]})
        })

        var ent = all ? null : load ? list[0] || null : null

        cb(null,ent)
      })
    },


    close: function(args,cb){
      this.log.debug('close',desc)
      cb()
    },


    native: function(args,cb){
      cb(null,entmap)
    }
  }


  this.store.init(this,opts,store,function(err,tag,description){
    if( err ) return cb(err);

    desc = description

    opts.idlen = opts.idlen || 6

    this.add({role:store.name,cmd:'dump'},function(args,cb){
      cb(null,entmap)
    })

    cb(null,{name:store.name,tag:tag})
  })

}



