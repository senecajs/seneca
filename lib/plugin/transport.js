/* Copyright (c) 2010-2012 Richard Rodger */

"use strict";

var common  = require('../common');

var eyes    = common.eyes;
var util    = common.util;
var assert  = common.assert;
var url     = common.url;

var _         = common._;
var httpproxy = common.httpproxy;
var request   = common.request;


function TransportPlugin() {
  var self = {}
  self.name = 'transport'


  var si, opts, proxy


  self.send = function( args, cb ) {

    // make http post to end point
    request.post({url:opts.endpoint,json:args.args},function(err,response){

      // call cb
      cb(null, response.body)
    })
  }



  self.init = function(init_si,init_opts,cb){
    si = init_si

    opts = _.extend({
      endpoint:'http://127.0.0.1:10171/transport'
    },init_opts)


    si.add({role:self.name,cmd:'send'},self.send)

    if( opts.pins ) {
      _.each(opts.pins,function(pin){
        si.add(pin,function(args,cb){
          si.act({role:'transport',cmd:'send',args:args},cb)
        })
      })
    } 

    var endpointurl = url.parse(opts.endpoint)
    proxy = new httpproxy.HttpProxy({
      target: {
        host: endpointurl.hostname, 
        port: endpointurl.port
      }
    })

    cb()
  }



  self.service = function() {
    return function(req,res,next){
      if( 0 == req.url.indexOf('/transport') ) {

        var args = _.extend(
          {},
          _.isObject(req.body)?req.body:{},
          _.isObject(req.query)?req.query:{},
          req.params?req.params:{}
        )

        si.act(args,function(err,result){
          if( err ) {
            res.writeHead(500)
            res.end(err.toString())
          }
          else {
            res.send(result)
          }
        })
      }
      else {
        var found = !!_.filter( opts.prefixes || [], function(prefix){
          return 0 == req.url.indexOf(prefix)
        })[0]

        if( found ) {
          proxy.proxyRequest(req, res)
        }
        else return next();
      }
   }
  }

  return self
}


module.exports = new TransportPlugin()


