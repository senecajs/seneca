/* Copyright (c) 2010-2013 Richard Rodger, MIT License */
/* jshint node:true, asi:true, eqnull:true */
"use strict";


var _ = require('underscore')


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

/*
_.mixin({
  create:function(o){
    function F() {}
    F.prototype = o;
    return new F();
  }
});
*/


exports.isError = function(obj) {
  return obj ? obj.constructor.prototype.toString() == 'Error' : false;
}



/*
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
*/


var die = exports.die = function(msg) {
  console.error(msg)
  process.eixt(1)
}




var copydata = exports.copydata = function(obj) {
  var copy

  // Handle the 3 simple types, and null or undefined
  if (null == obj || "object" != typeof obj) return obj;

  // Handle Date
  if( _.isDate(obj) ) {
    copy = new Date();
    copy.setTime(obj.getTime());
    return copy;
  }
  
  // Handle Array
  if( _.isArray(obj) ) {
    copy = [];
    for (var i = 0, len = obj.length; i < len; ++i) {
      copy[i] = copydata(obj[i]);
    }
    return copy;
  }

  // Handle Object
  if( _.isObject(obj) ) {
    copy = {};
    for (var attr in obj) {
      if (obj.hasOwnProperty(attr)) copy[attr] = copydata(obj[attr]);
    }
    return copy;
  }
  
  throw new Error("Unable to copy obj! Its type isn't supported.");
}



var owndesc = exports.owndesc = function(obj,depth,meta){
  depth = void 0 == depth ? 3 : depth
  if( depth < 0 ) { return _.isArray(obj) ? '[-]' : _.isObject(obj) ? '{-}' : ''+obj }

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





