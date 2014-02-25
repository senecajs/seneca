/* Copyright (c) 2012-2013 Richard Rodger, BSD License */
/* jshint node:true, asi:true */
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



// TODO: what if an entity object is passed in as a query param? convert to id?

var wrap = {
  list: function( cmdfunc ) {
    var outfunc = function( args, done ) {
      if( _.isString(args.sort) ) {
        var sort = {}
        if( '-' == args.sort[0] ) {
          sort[args.sort.substring(1)] = -1
        }
        else {
          sort[args.sort] = +1
        }
        args.sort = sort
      }
      return cmdfunc.call(this,args,done)
    }

    for( var p in cmdfunc ) {
      outfunc[p] = cmdfunc[p]
    }

    return outfunc
  }
}


exports.cmds = allcmds.slice(0)


/* opts.map = { canon: [cmds] }
 *   canon is in string format zone/base/name, with empty or - indicating undefined
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
    entspecs.push({canon:'-/-/-',cmds:allcmds})
  }
    
  var tagnid = nid({length:opts.taglen||3,alphabet:'ABCDEFGHIJKLMNOPQRSTUVWXYZ'})

  var tag       = tagnid()
  var storedesc = [store.name,tag]

  for( var esI = 0; esI < entspecs.length; esI++ ) {
    var entspec = entspecs[esI]

    storedesc.push(entspec.canon)
    var zone,base,name

    // FIX: should use parsecanon

    var m = /^(\w*|-)\/(\w*|-)\/(\w*|-)$/.exec(entspec.canon)
    if( m ) {
      zone = m[1]
      base = m[2]
      name = m[3]    
    }
    else if( (m = /^(\w*|-)\/(\w*|-)$/.exec(entspec.canon)) ) {
      base = m[1]
      name = m[2]    
    }
    else if( (m = /^(\w*|-)$/.exec(entspec.canon)) ) {
      name = m[2]    
    }

    zone = '-'===zone ? void 0 : zone
    base = '-'===base ? void 0 : base
    name = '-'===name ? void 0 : name


    var entargs = {}
    if( void 0!== name ) entargs.name = name;
    if( void 0!== base ) entargs.base = base;
    if( void 0!== zone ) entargs.zone = zone;
    

    for( var cI = 0; cI < entspec.cmds.length; cI++ ) {
      var cmd = entspec.cmds[cI]
      var args = _.extend({role:'entity',cmd:cmd},entargs)
      var cmdfunc = store[cmd]

      if( wrap[cmd] ) {
        cmdfunc = wrap[cmd](cmdfunc)
      }

      if( cmdfunc ) {
        si.add( args, cmdfunc )
      }
      else {
        return si.fail({code:'seneca/store_cmd_missing',cmd:cmd,store:storedesc},cb)
      }
    }
  }

  // legacy
  if( cb ) {
    cb.call(si,null,tag,storedesc.join('~'))
  }
  else return {
    tag:tag,
    desc:storedesc.join('~')
  }
}
