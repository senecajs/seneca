/* Copyright (c) 2010-2013 Richard Rodger, MIT License */
"use strict";


var buffer  = require('buffer')

var connect  = require('connect')
var sockjs   = require('sockjs')
var _        = require('underscore')



var seneca  = require('../..')


function sendjson(res,obj) {
  var jsonstr = JSON.stringify(obj)
  res.writeHead(200,{
    'Content-Type': 'application/json',
    'Cache-Control': 'private, max-age=0, no-cache, no-store',
    "Content-Length": buffer.Buffer.byteLength(jsonstr) 
  })
  res.end( jsonstr)
}


module.exports = function admin( si,opts,cb ) {

  var clients = {}
  
  opts.prefix = opts.prefix || '/admin' 
  var m = /^(.*?)\/*$/.exec(opts.prefix)
  if( m ) {
    opts.prefix = m[1]
  }


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
    {
      prefix:opts.prefix+'/socket',
      log:function(severity,line){
        si.log.debug(severity,line)
      }
    }
  )



  var app = connect()
  //app.use(connect.json())
  app.use(si.httprouter(function(app){
    app.get('/conf',function(req,res){
      sendjson(res,{
        prefix: opts.prefix,
        login: req.seneca && req.seneca.login && req.seneca.login.token
      })
    })
  }))
  app.use(connect.static(__dirname+'/web'))

  cb( null, {
    service:function(req,res,next){
      if( 0 == req.url.indexOf(opts.prefix) ) {

        var allow = req.seneca && req.seneca.user && req.seneca.user.admin
        if( !allow ) {
          allow = opts.local && (
            '127.0.0.1' === req.connection.remoteAddress ||
              '::1' === req.connection.remoteAddress
          )
        }

        if( allow ) {
          req.url = req.url.substring(opts.prefix.length)

          if('/'===req.url||''===req.url) {
            res.writeHead(301, {
              'Location': opts.prefix+'/index.html'
            })
            return res.end()
          }
          else {
            return app(req,res)
          }
        }
      }
      next()
    }
  })
}
