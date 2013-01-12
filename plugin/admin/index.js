/* Copyright (c) 2010-2012 Richard Rodger */


var connect  = require('connect')
var sockjs   = require('sockjs')
var _        = require('underscore')



var seneca  = require('../..')


module.exports = function admin( si,opts,cb ) {

  var clients = {}
  
  opts.prefix = opts.prefix || '/admin' 



  function loghandler(client) {
    return function(){
      var msg = JSON.stringify(Array.prototype.slice.call(arguments))
      client.write(msg)
    }
  }


  var socket = sockjs.createServer();
  socket.on('connection', function(client) {
    clients[client.id] = client

    client.on('close', function(){
      delete clients[client.id]
    })

    client.on('data', function(data){
      var msg = JSON.parse(data)
      //console.dir(msg)

      if( msg.hello ) {
        client.token = msg.token
        client.write(JSON.stringify({hello:true}))
      }
      else if(client.token==msg.token) {
        if( msg.oldroute ) {
          si.logroute(msg.oldroute)
        }
        if( msg.newroute ) {
          si.logroute(msg.newroute,loghandler(client))
        }
      }
    })
  })



  socket.installHandlers(
    opts.server, 
    {prefix:opts.prefix+'/socket'}
  )



  var app = connect()
  app.use(connect.json())
  app.use(si.httprouter(function(app){
    app.get('/conf',function(req,res){
      res.send({
        prefix: opts.prefix,
        login: req.seneca && req.seneca.login && req.seneca.login.token
      })
    })
  }))
  app.use(connect.static(__dirname+'/web'))

  cb( null, function(req,res,next){
    if( 0 == req.url.indexOf(opts.prefix) ) {
      if( req.seneca && req.seneca.user && req.seneca.user.admin ) {
        req.url = req.url.substring(opts.prefix.length)
        app(req,res)
        return
      }
    }
    next()
  })

}
