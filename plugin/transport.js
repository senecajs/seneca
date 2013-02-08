/* Copyright (c) 2010-2013 Richard Rodger */
"use strict";


var url    = require('url')
var buffer = require('buffer')

var _         = require('underscore')
var httpproxy = require('http-proxy')
var request   = require('request')

/** options:
 *    pins: list of cmd patterns to handle
 *    remoteurl: endpoint to send requests to 
 *    localpath: attach to this http url path
 *    prefixes: other http url path prefixes to proxy to remote host:port of rmeoteurl
 */

module.exports = function(seneca,opts,cb){
  var name = 'transport'

  opts = _.extend({
    remoteurl:'http://127.0.0.1:10171/transport',
    localpath:'/transport',
    timeout:9999
  },opts)


  function send( args, cb ) {
    seneca.log.debug(args.tag$,opts.endpoint,args)

    var reqopts = {
      url:opts.remoteurl,
      json:args.args,
      timeout:opts.timeout
    }

    if( args.reqopts ) {
      reqopts = _.extend(reqopts,args.reqopts)
    }

    request.post(reqopts,function(err,response){
      seneca.log.debug(args.tag$,err,response&&response.body)

      if( err ) return cb(err)

      cb(null, response.body)
    })
  }

  seneca.add({role:name,cmd:'send'},send)


  if( opts.pins ) {
    _.each(opts.pins,function(pin){
      seneca.add(pin,function(args,cb){
        seneca.act({role:'transport',cmd:'send',args:args},cb)
      })
    })
  } 


  // proxy http requests you can't handle, but want to answer
  var remoteurl = url.parse(opts.remoteurl)
  var proxy = new httpproxy.HttpProxy({
    target: {
      host: remoteurl.hostname, 
      port: remoteurl.port
    }
  })
  


  function service(req,res,next){
    if( 0 == req.url.indexOf( opts.localpath ) ) {

      var args = _.extend(
        {},
        _.isObject(req.body)?req.body:{},
        _.isObject(req.query)?req.query:{},
        req.params?req.params:{}
      )

      seneca.log.debug(opts.localpath,args)

      seneca.act(args,function(err,result){
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
        seneca.log.debug('proxy',found)
        proxy.proxyRequest(req, res)
      }
      else return next();
    }
  }

  cb(null,{name:name,service:service})
}



