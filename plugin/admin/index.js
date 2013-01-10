/* Copyright (c) 2010-2012 Richard Rodger */


var connect = require('connect')
var sockjs  = require('sockjs')
var _       = require('underscore')


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

      if( msg.oldroute ) {
        si.logroute(msg.oldroute)
      }
      if( msg.newroute ) {
        si.logroute(msg.newroute,loghandler(client))
      }
    })
  })



  socket.installHandlers(
    opts.server, 
    {prefix:'/admin/socket'}
  )



  var app = connect()
  app.use(connect.static(__dirname+'/web'))

  cb( null, function(req,res,next){
    if( 0 == req.url.indexOf(opts.prefix) ) {
      req.url = req.url.substring(opts.prefix.length)
      app(req,res)
    } else next();
  })
}
