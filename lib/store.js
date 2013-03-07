/* Copyright (c) 2012-2013 Richard Rodger, BSD License */
"use strict";


var _   = require('underscore')
var nid = require('nid')


var allcmds = ['save','load','list','remove','close','native']

/*

Standard meta-query parameters:
sort$: {fieldname: +/-1}; sort by single fieldname, -1 => descending, +1 => ascending
limit$: size (integer); number of results to return
skip$: size (integer); number of results to skip over
fields$: array of field names to include

these can all be used together

native$: anything; pass value to database connection as store specific query
everything else is ignored
each store needs to document this value format

*/



/* opts.map = { canon: [cmds] }
 * opts.taglen = length of instance tag, default 3
 */
exports.init = function(si,opts,store,cb) {
  // TODO: parambulator validation

  var entspecs = []

  if( opts.map ) {
    for( var canon in opts.map ) {
      var cmds = opts.map[canon]
      if( '*' == cmds ) {
        cmds = allcmds
      }
        entspecs.push({canon:canon,cmds:cmds})
    }
  }
  else {
    entspecs.push({canon:'//',cmds:allcmds})
  }
    
  var tagnid = nid({length:opts.taglen||3,alphabet:'ABCDEFGHIJKLMNOPQRSTUVWXYZ'})

  var tag       = tagnid()
  var storedesc = [store.name,tag]

  for( var esI = 0; esI < entspecs.length; esI++ ) {
    var entspec = entspecs[esI]

    storedesc.push(entspec.canon)
    var m = /^(\w*)\/(\w*)\/(\w*)$/.exec(entspec.canon)
    var name = m[3], base = m[2], tenant = m[1]
    
    // TODO: support base/name and name, error handling
    
      var entargs = {}
    name   && (entargs.name   = name)
    base   && (entargs.base   = base)
    tenant && (entargs.tenant = tenant)
    
    for( var cI = 0; cI < entspec.cmds.length; cI++ ) {
      var cmd = entspec.cmds[cI]
      var args = _.extend({role:'entity',cmd:cmd},entargs)
      var cmdfunc = store[cmd]
      if( cmdfunc ) {
        si.add( args, cmdfunc )
      }
      else {
        return si.fail({code:'seneca/store_cmd_missing',cmd:cmd,store:storedesc},cb)
      }
    }
  }

  cb.call(si,null,tag,storedesc.join('~'))
}
