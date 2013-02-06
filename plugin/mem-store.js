/* Copyright (c) 2010-2013 Richard Rodger */

"use strict"


var _       = require('underscore')
var idgen   = require('idgen')
var uuid    = require('node-uuid')




function list(entmap,qent,q,cb) {
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
  
  cb(null,list)
}



module.exports = function(seneca,opts,cb) {
  var desc

  var entmap = {}

  var store = {

    name: 'mem-store',


    save: function(args,cb){
      var ent = args.ent

      var create = !ent.id
      ent.id = create ? idgen(opts.idlen) : ent.id
    
      var canon = ent.canon$({object:true})
      var base   = canon.base
      var name   = canon.name
    
      entmap[base] = entmap[base] || {}
      entmap[base][name] = entmap[base][name] || {}

      entmap[base][name][ent.id] = ent
  
      seneca.log.debug(args.tag$,'save/'+(create?'insert':'update'),ent,desc)
      cb(null,ent)
    },


    load: function(args,cb){
      var qent = args.qent
      var q    = args.q

      list(entmap,qent,q,function(err,list){
        var ent = list[0] || null
        seneca.log.debug(args.tag$,'load',q,ent,desc)
        cb(err, ent)
      })
    },


    list: function(args,cb){
      var qent = args.qent
      var q    = args.q

      list(entmap,qent,q,function(err,list){
        seneca.log.debug(args.tag$,'list',q,list.length,list[0],desc)
        cb(err, list)
      })
    },


    remove: function(args,cb){
      var qent = args.qent
      var q    = args.q

      var all  = q.all$ // default false
      var load  = _.isUndefined(q.load$) ? true : q.load$ // default true 
  
      list(entmap,qent,q,function(err,list){
        if( err ) return cb(err);

        list = all ? list : 0<list.length ? list.slice(0,1) : []

        list.forEach(function(ent){
          var canon = qent.canon$({object:true})
          
          delete entmap[canon.base][canon.name][ent.id]
          seneca.log.debug(args.tag$,'remove/'+(all?'all':'one'),q,ent,desc)
        })

        var ent = all ? null : load ? list[0] || null : null

        cb(null,ent)
      })
    },


    close: function(args,cb){
      seneca.log.debug(args.tag$,'close',desc)
      cb()
    }
  }


  seneca.util.initstore(seneca,opts,store,function(err,tag,description){
    if( err ) return cb(err);

    desc = description

    opts.idlen = opts.idlen || 6

    seneca.add({role:store.name,cmd:'dump'},function(args,cb){
      cb(null,entmap)
    })

    cb(null,{name:store.name,tag:tag})
  })

}



