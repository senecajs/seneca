/* Copyright (c) 2010-2013 Ricebridge */
"use strict";

// FIX: this file is an anti-pattern


// NOTE: make these dependencies lazy?
var assert   = exports.assert  = require('assert')
var eyes     = exports.eyes    = require('eyes')
var util     = exports.util    = require('util')
var events   = exports.events  = require('events')
var buffer   = exports.buffer  = require('buffer')
var net      = exports.net     = require('net')
var url      = exports.url     = require('url')
var repl     = exports.repl    = require('repl')
var path     = exports.path    = require('path')
var fs       = exports.fs      = require('fs')


var _            = exports._            = require('underscore')
var gex          = exports.gex          = require('gex')
var parambulator = exports.parambulator = require('parambulator')
var async        = exports.async        = require('async')

var nid       = exports.nid       = require('nid')
var crypto    = exports.crypto    = require('crypto')
var connect   = exports.connect   = require('connect')
var oauth     = exports.oauth     = require('oauth')
var cookies   = exports.cookies   = require('cookies')
var url       = exports.url       = require('url')
var request   = exports.request   = require('request')
var httpproxy = exports.httpproxy = require('http-proxy')
var optimist  = exports.optimist  = require('optimist')



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




var copydata = exports.copydata = function(obj) {

  // Handle the 3 simple types, and null or undefined
  if (null == obj || "object" != typeof obj) return obj;

  // Handle Date
  if( _.isDate(obj) ) {
    var copy = new Date();
    copy.setTime(obj.getTime());
    return copy;
  }
  
  // Handle Array
  if( _.isArray(obj) ) {
    var copy = [];
    for (var i = 0, len = obj.length; i < len; ++i) {
      copy[i] = copydata(obj[i]);
    }
    return copy;
  }

  // Handle Object
  if( _.isObject(obj) ) {
    var copy = {};
    for (var attr in obj) {
      if (obj.hasOwnProperty(attr)) copy[attr] = copydata(obj[attr]);
    }
    return copy;
  }
  
  throw new Error("Unable to copy obj! Its type isn't supported.");
}



var owndesc = exports.owndesc = function(obj,depth,meta){
  depth = void 0 == depth ? 0 : depth
  if( depth < 0 ) { return ''+obj }

  if( obj ) {
    if( obj.entity$ ) {
      return obj.toString()
    }

    var isarr = _.isArray(obj)
    var sb = [ isarr?'[':'{' ]
    for( var p in obj ) {
      if( obj.hasOwnProperty(p) && (meta || !~p.indexOf('$')) && !_.isFunction(obj[p]) ) {
        
        if( !isarr ) {
          sb.push(p)
          sb.push('=')
        }

        if( _.isObject(obj[p]) ) {
          sb.push(owndesc(obj[p],depth-1))
        }
        else {
          sb.push(obj[p])
        }

        sb.push(',')
      }
    }

    if( 1 < sb.length ) {
      sb.pop()
    }

    sb.push( isarr?']':'}' )
    return sb.join('')
  }
  else {
    return null
  }
}





