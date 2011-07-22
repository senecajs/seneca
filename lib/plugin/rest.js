/* Copyright (c) 2011 Ricebridge */

var common  = require('../common');

var eyes    = common.eyes
var util    = common.util
var assert  = common.assert
var _       = common._
var uuid    = common.uuid
var connect = common.connect






function RestPlugin() {
  var self = this;
  self.name = 'rest';


  self.init = function(seneca,cb){

    self.seneca = seneca

    self.options = (seneca.options.plugin && seneca.options.plugin[self.name]) || {
      
    }

    seneca.add({on:self.name,cmd:'quickcode'},function(args,seneca,cb){
      
    })

    cb()
  }


  function RE(res,win) {
    return function(err,data) {
      if( err ) return self.seneca.log('plugin','rest','error',err);
      win(data)
    }
  }

  function notfound(res) {
    res.writeHead(404)
    res.end()
  }

  function bad(res) {
    res.writeHead(400)
    res.end()
  }

  function makeent(req) {
    var ent = self.seneca.make(self.tenant,req.params.base,req.params.name)
    //console.log(ent)
    return ent
  }

  var rest = {
    get: function(req,res) {
      var ent = makeent(req)
      if( req.params.id ) {
        ent.load$({id:req.params.id},RE(res,function(ent){
          if( ent ) {
            console.log(''+ent)
            common.sendjson(res,ent.data$())
          }
          else {
            notfound(res)
          }
        }))
      }

      else {
        ent.list$({},RE(res,function(list){
          common.sendjson(res,{list:list})
        }))
      }
    },

    put: function(req,res) {
      var ent = makeent(req)

      console.dir(req.json$)

      // FIX: how to set json$?
      ent.data$( req.json$ )

      ent.save$(RE(res,function(ent){
        common.sendjson(res,{ok:true,id:ent.id})
      }))
    },

    // TODO: really need that udapte$ method here...
    post: function(req,res) {
      console.dir(req.params)
      console.dir(req.json$)

      if( req.params.id ) {
        var ent = makeent(req)
        ent.load$(req.params.id,RE(res,function(ent){
          if( !ent ) return notfound(res);

          // FIX: how to set json$?
          ent.data$( req.json$ )
          console.log(''+ent)
        
          ent.save$(RE(res,function(ent){
            console.log('out '+ent)
            common.sendjson(res,{ok:true})
          }))
        }))
      }
      else {
        bad(res)
      }
    },

    del: function(req,res) {
      var ent = makeent(req)
      ent.remove$({id:req.params.id},RE(res,function(){
        common.sendjson(res,{ok:true})
      }))
    },
  }



  // can create more than one service for different tenants
  self.service = function(opts,cb) {
    if( !cb ) {
      throw new Error('callback missing (must be last argument)')
    }

    console.dir(opts)

    var prefix  = opts.prefix || '/rest'
    self.tenant  = opts.tenant
    var ents    = opts.ents || []

    if( !self.tenant ) {
      return cb('plugin_rest_notenant')
    }


    var router = connect.router(function(app){

      app.get(prefix+'/:base/:name/:id?', rest.get)
      app.post(prefix+'/:base/:name/:id', rest.post)
      app.put(prefix+'/:base/:name',      rest.put)
      app.del(prefix+'/:base/:name/:id',  rest.del)

    })

    return function(req,res,next) {
      console.log('REST: '+req.method+' '+req.url)
      router(req,res,next)
    }

  }

}


exports.plugin = function() {
  return new RestPlugin()
}

