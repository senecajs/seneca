/* Copyright (c) 2010-2012 Richard Rodger */

"use strict";

var url     = require('url')
var buffer  = require('buffer')

var _         = require('underscore')
var httpproxy = require('http-proxy')
var request   = require('request')


function TransportPlugin() {
  var self = {}
  self.name = 'transport'


  var si, opts, proxy


  self.send = function( args, cb ) {
    si.log.debug(args.tag$,opts.endpoint,args)

    request.post({url:opts.remoteurl,json:args.args},function(err,response){
      si.log.debug(args.tag$,err,response.body)

      if( err ) return cb(err)

      cb(null, response.body)
    })
  }



  self.init = function(seneca,options,cb){
    si = seneca

    opts = _.extend({
      remoteurl:'http://127.0.0.1:10171/transport',
      localpath:'/transport'
    },options)


    si.add({role:self.name,cmd:'send'},self.send)

    if( opts.pins ) {
      _.each(opts.pins,function(pin){
        si.add(pin,function(args,cb){
          si.act({role:'transport',cmd:'send',args:args},cb)
        })
      })
    } 

    // forward requests you can't handle
    var remoteurl = url.parse(opts.remoteurl)
    proxy = new httpproxy.HttpProxy({
      target: {
        host: remoteurl.hostname, 
        port: remoteurl.port
      }
    })

    cb()
  }



  self.service = function() {
    return function(req,res,next){
      if( 0 == req.url.indexOf( opts.localpath ) ) {

        var args = _.extend(
          {},
          _.isObject(req.body)?req.body:{},
          _.isObject(req.query)?req.query:{},
          req.params?req.params:{}
        )

        si.log.debug(opts.localpath,args)
        si.act(args,function(err,result){
          if( err ) {
            res.writeHead(500)
            res.end(err.toString())
          }
          else {
            if( res.send ) {
              res.send(result)
            }
            else {
              var jsonstr = JSON.stringify(result)
              res.writeHead(200,{
                'Content-Type': 'application/json',
                'Cache-Control': 'private, max-age=0, no-cache, no-store',
                "Content-Length": buffer.Buffer.byteLength(jsonstr) 
              })
              res.end( jsonstr)
            }
          }
        })
      }
      else {
        var found = _.filter( opts.prefixes || [], function(prefix){
          return 0 == req.url.indexOf(prefix)
        })[0]

        if( found ) {
          si.log.debug('proxy',found)
          proxy.proxyRequest(req, res)
        }
        else return next();
      }
   }
  }

  return self
}


module.exports = new TransportPlugin()


