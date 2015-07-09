/* Copyright (c) 2010-2015 Richard Rodger, MIT License */
/* jshint node:true, asi:true, eqnull:true */
"use strict";


var util = require('util')


var _   = require('lodash')
var nid = require('nid')


exports.tagnid = nid({length:3,alphabet:'ABCDEFGHIJKLMNOPQRSTUVWXYZ'})


function arrayify(){ return Array.prototype.slice.call(arguments[0],arguments[1]) }
exports.arrayify = arrayify



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





var die = exports.die = function(msg) {
  console.error(msg)
  process.exit(1)
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


exports.argpattern = function argpattern( args ) {
  args = args || {}
  var sb = []
  _.each( args, function(v,k){
    if( !~k.indexOf('$') ) {
      sb.push(k+':'+v)
    }
  })

  sb.sort()

  return sb.join(',')
}



  // noop for callbacks
exports.nil = function nil(){
  _.each(arguments,function(arg){
    if( _.isFunction(arg) ) {
      return arg()
    }
  })
}



// remove any props containing $
function clean(obj) {
  if( null == obj ) return obj;

  var out = {}
  if( obj ) {
    for( var p in obj ) {
      if( !~p.indexOf('$') ) {
        out[p] = obj[p]
      }
    }
  }
  return out
}
exports.clean = clean



function deepextend() {
  var args = arrayify(arguments)
  args = _.reject( args, function(item) {
    return _.isObject(args) && _.isEmpty(args)
  })
  var out = deepextend_impl.apply( null, args )

  return out
}
exports.deepextend = deepextend


// TODO: can still fail if objects are too deeply complex
// need a finite bound on recursion
function deepextend_impl(tar) {
  /* jshint loopfunc:true */

  tar = _.clone(tar)
  _.each(Array.prototype.slice.call(arguments, 1), function(src) {

    next_prop:
    for (var p in src) {
      var v = src[p]
      if( void 0 !== v ) {

        if( _.isString(v) ||
            _.isNumber(v) ||
            _.isBoolean(v) ||
            _.isDate(v) ||
            _.isFunction(v) ||
            _.isArguments(v) ||
            _.isRegExp(v) ) {
          tar[p] = v
        }

        // this also works for arrays - allows index-specific
        // overrides if object used - see test/common-test.js
        else if( _.isObject(v) ) {

          // don't descend into..

          // entities
          if( v.entity$ ) {
            tar[p] = v
          }

          for( var f in v ) {
            if( _.isFunction(f) ) {
              tar[p] = v
              break next_prop;
            }
          }


          tar[p] = _.isObject( tar[p] ) ? tar[p] : (_.isArray(v) ? [] : {})

          // for array/object mismatch, override completely
          if( (_.isArray(v) && !_.isArray( tar[p] ) ) ||
              (!_.isArray(v) && _.isArray( tar[p] ) ) )
          {
            tar[p] = src[p]
          }

          tar[p] = deepextend_impl( tar[p], src[p] )
        }
        else {
          tar[p] = v
        }
      }
    }
  })

  return tar
}


// loop over a list of items recursively
// list can be an integer - number of times to recurse
exports.recurse = function recurse(list,work,done) {
  /* jshint validthis:true */

  var ctxt = this

  if( _.isNumber(list) ) {
    var size = list
    list = new Array(size)
    for(var i = 0; i < size; i++){
      list[i]=i
    }
  }
  else {
    list = _.clone(list)
  }

  function next(err,out){
    if( err ) return done(err,out);

    var item = list.shift()

    if( void 0 !== item ) {
      work.call(ctxt,item,next)
    }
    else {
      done.call(ctxt,err,out)
    }
  }
  next.call(ctxt)
}


// use args properties as fields
// defaults: map of default values
// args: args object
// fixed: map of fixed values - cannot be overriden
// omits: array of prop names to exclude
// defaults, args, and fixed are deepextended together in that order
exports.argprops = function argprops( defaults, args, fixed, omits){
  omits = _.isArray(omits) ? omits :
    _.isObject(omits) ? _.keys(omits) :
    _.isString(omits) ? omits.split(/\s*,\s*/) :
    ''+omits

  // a little pre omit to avoid entities named in omits
  var usedargs = _.omit( args, omits )

  // don't support $ args
  usedargs = clean(usedargs)

  return _.omit( deepextend( defaults, usedargs, fixed ), omits )
}


exports.print = function print(err,out){
  if(err) throw err;

  console.log(util.inspect(out,{depth:null}))
  for(var i = 2; 2 < arguments.length; i++) {
    console.dir(arguments[i])
  }
}

