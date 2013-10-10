/* Copyright (c) 2010-2013 Richard Rodger */
"use strict"


var _       = require('underscore')
var uuid    = require('node-uuid')
var fs      = require('fs')



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
      
      if( !_.isFunction(ent.make$) ) {
        ent = entset[id] = qent.make$(ent)
      }

      list.push(ent)
    })
  }

  // sort first
  if( q.sort$ ) {
    for( var sf in q.sort$ ) break;
    var sd = q.sort$[sf] < 0 ? -1 : 1

    list = list.sort(function(a,b){
      return sd * ( a[sf] < b[sf] ? -1 : a[sf] === b[sf] ? 0 : 1 )
    })
  }


  if( q.skip$ ) {
    list = list.slice(q.skip$)
  }

  if( q.limit$ ) {
    list = list.slice(0,q.limit$)
  }

  
  cb.call(si,null,list)
}



module.exports = function(options) {
  var seneca = this

  options = seneca.util.deepextend({
    prefix:'/mem-store',
    web:{dump:false}
  },options)


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
        if( ent.id$ ) {
          var id = ent.id$
          delete ent.id$
          do_save(id)
        }
        else {
          this.act({role:'util', cmd:'generate_id', name:name, base:base, zone:zone }, function(err,id){
            if( err ) return cb(err);
            do_save(id)
          })
        }
      }
      else do_save();

      function do_save(id) {
        var mement = ent.clone$()
        if( id ) {
          mement.id = id
        }

        entmap[base] = entmap[base] || {}
        entmap[base][name] = entmap[base][name] || {}

        entmap[base][name][mement.id] = mement
  
        si.log.debug(function(){return['save/'+(create?'insert':'update'),ent.canon$({string:1}),mement,desc]})
        cb(null,mement)
      }
    },


    load: function(args,cb){
      var qent = args.qent
      var q    = args.q

      list(this,entmap,qent,q,function(err,list){
        var ent = list[0] || null
        this.log.debug(function(){return['load',q,qent.canon$({string:1}),,ent,desc]})
        cb(err, ent ? ent.clone$() : null )
      })
    },


    list: function(args,cb){
      var qent = args.qent
      var q    = args.q

      list(this,entmap,qent,q,function(err,list){
        this.log.debug(function(){return['list',q,qent.canon$({string:1}),,list.length,list[0],desc]})
        list = _.map(list,function(ent){ return ent.clone$() })
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


  var meta = this.store.init(this,options,store)

  desc = meta.desc

  options.idlen = options.idlen || 6

  this.add({role:store.name,cmd:'dump'},function(args,cb){
    cb(null,entmap)
  })

  this.add({role:store.name,cmd:'export'},function(args,done){
    var entjson = JSON.stringify(entmap)
    fs.writeFile(args.file,entjson,function(err){
      done(err,{ok:!!err})
    })
  })


  this.add({role:store.name,cmd:'import'},function(args,done){
    try {
      fs.readFile(args.file,function(err,entjson){
        if( entjson ) {
          try {
            entmap = JSON.parse(entjson)
            done(err,{ok:!!err})
          }
          catch(e){
            done(e)
          }
        }
      })
    }
    catch(e){
      done(e)
    }
  })

  var service = null
  if( options.web.dump ) {
    seneca.act('role:web', {use:{
      prefix:options.prefix,
      pin:{role:'mem-store',cmd:'*'},
      map:{
        dump:true
      }
    }})
/*
    service = seneca.httprouter(function(http){
      http.get(options.prefix+'/dump',function(req,res){
          res.send(entmap)
      })
    })
*/
  }

  
  return {
    name:store.name,
    tag:meta.tag
    //service:service
  }
}



