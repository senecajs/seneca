/* Copyright (c) 2010-2011 Ricebridge */


// NOTE: make these dependencies lazy?
var assert   = exports.assert  = require('assert')
var eyes     = exports.eyes    = require('eyes')
var util     = exports.util    = require('util')
var events   = exports.events  = require('events')
var buffer   = exports.buffer  = require('buffer')
var net      = exports.net     = require('net')
var url      = exports.url     = require('url')
var repl     = exports.repl    = require('repl')


var _            = exports._            = require('underscore')
var gex          = exports.gex          = require('gex')
var idgen        = exports.idgen        = require('idgen')
var parambulator = exports.parambulator = require('parambulator')
var async        = exports.async        = require('async')

var uuid      = exports.uuid      = require('node-uuid')
var crypto    = exports.crypto    = require('crypto')
var connect   = exports.connect   = require('connect')
var oauth     = exports.oauth     = require('oauth')
var cookies   = exports.cookies   = require('cookies')
var url       = exports.url       = require('url')
var request   = exports.request   = require('request')
var httpproxy = exports.httpproxy = require('http-proxy')


exports.arrayify = function(){ return Array.prototype.slice.call(arguments[0],arguments[1]) }



exports.delegate = function( scope, func ) {
  var args = Array.prototype.slice.call(arguments,2)
  return function() {
    return func.apply(scope,args.concat(Array.prototype.slice.call(arguments)))
  }
}


exports.noop = function noop() {
  // does nothing
}




// TODO: are any of the below used?



var conf = exports.conf = {}


_.mixin({
  create:function(o){
    function F() {}
    F.prototype = o;
    return new F();
  }
});



  _.isError = function(obj) {
    return toString.call(obj) == '[object Error]';
  };




var log = exports.log = function() {
  var sb = []
  for( var i = 0; i < arguments.length; i++ ) {
    try {
      var val = arguments[i]
      sb.push( 'string'==typeof(val) ? val : 'number'==typeof(val) ? val : JSON.stringify(val) )
    }
    catch( e ) {
      util.log(e)
      util.log(arguments[i])
    }
  }
  util.log(sb.join(' '))
}


var die = exports.die = function(msg) {
  util.error(msg)
  process.eixt(1)
}



// JSON

var readjson = exports.readjson = function(req,res,cb) {
  var MAX = conf.maxjsonlen || (100*65535)

  var size = 0;
  var bodyarr = []

  req.on('data',function(chunk){
    size += chunk.length
    if( MAX < size ) {
      res.writeHead(400,'data too long')
      res.end()
    }
    else {
      bodyarr.push(chunk)
    }
  })

  req.on('end',function(){
    if( size < MAX ) {
      var bodystr = bodyarr.join('')
      conf.debug && util.debug('READJSON:'+req.url+':'+bodystr)

      try {
        var obj = JSON.parse(bodystr)
        req.json$ = obj
        cb && cb(null,obj)
      }
      catch(ex) {
        cb && cb(ex,null)
      }
    }
  })
}

var sendjson = exports.sendjson = function(res,obj){
  var objstr = JSON.stringify(obj)
  conf.debug && util.debug('SENDJSON:'+objstr);

  res.writeHead(200,{
    'Content-Type': 'application/json',
    'Cache-Control': 'private, max-age=0, no-cache, no-store',
    //'Content-Length': ''+objstr.length
  })
  res.end( objstr )
}



var resware_funcs = {
  send: function(code,why) {
    try {
      this.writeHead(code,why)
      this.end()
    }
    catch( ex ) {
      log('res','send',code,why,e)
    }
  },
  make: function(res,what,code) {
    res[what+'$'] = function(why,whence) {
      res.send$(code,why)
      log('res',what,why,whence)
    }
  } 

}

var handleware = exports.handleware = function(refs) {
  
  return function(req,res,next) {

    for( var ref in refs ) {
      req[ref+'$'] = refs[ref]
    }

    res.send$ = resware_funcs.send
    res.sendjson$ = function(obj) {
      sendjson(res,obj)
    }

    resware_funcs.make(res,'bad',400)
    resware_funcs.make(res,'denied',401)
    resware_funcs.make(res,'lost',404)
    resware_funcs.make(res,'fail',500)

    res.err$ = function(win) {
      return function(err){
      if( err ) {
        res.fail$(err)
      }
      else {
        try {
          win && win.apply( this, Array.prototype.slice.call(arguments,1) )
        }
        catch( ex ) {
          res.fail$(ex)
        }
      }
    }
  }

    next()
  }
}


var jsonware = exports.jsonware = function(req,res,next) {
  var ct = req.headers['content-type'] || ''
  if( -1 != ct.toLowerCase().indexOf('json') ) {
    readjson(req,res,function(err,json){
      if(err) {
        log('json',err)
        res.writeHead(400,'bad json')
        res.end()
      }
      else {
        req.json$ = json
        log('json',JSON.stringify(req.json$))
        next()
      }
    })
  }
  else {
    next()
  }
}
