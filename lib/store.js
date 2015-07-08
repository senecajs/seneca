/* Copyright (c) 2012-2015 Richard Rodger, MIT License */
/* jshint node:true, asi:true, eqnull:true */
"use strict";


var _   = require('lodash')
var nid = require('nid')


var common = require('./common')


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
 */
exports.init = function(instance,opts,store,cb) {
  /* jshint loopfunc:true */

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

  //var tagnid = nid({length:opts.taglen||3,alphabet:'ABCDEFGHIJKLMNOPQRSTUVWXYZ'})

  // TODO: messy!
  var plugin_tag = instance.fixedargs &&
        instance.fixedargs.plugin$ &&
        instance.fixedargs.plugin$.tag
  var tag = (null == plugin_tag || '-' === plugin_tag) ? common.tagnid() : plugin_tag

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
      name = m[1]
    }

    zone = '-'===zone ? void 0 : zone
    base = '-'===base ? void 0 : base
    name = '-'===name ? void 0 : name


    var entargs = {}
    if( void 0!== name ) entargs.name = name;
    if( void 0!== base ) entargs.base = base;
    if( void 0!== zone ) entargs.zone = zone;


    _.each(entspec.cmds, function(cmd){
      var args = _.extend({role:'entity',cmd:cmd},entargs)
      var cmdfunc = store[cmd]

      if( wrap[cmd] ) {
        cmdfunc = wrap[cmd](cmdfunc)
      }

      if( cmdfunc ) {
        if( 'close' != cmd ) {
          instance.add( args, cmdfunc )
        }
      }
      else return instance.die('store_cmd_missing',{cmd:cmd,store:storedesc});

      if( 'close' == cmd ) {
        instance.add('role:seneca,cmd:close',function( close_args, done ) {
          var closer = this

          if( !store.closed$ ) {
            cmdfunc.call(closer,close_args,function(err){
              if( err ) closer.log.error('close-error',close_args,err);

              store.closed$ = true
              closer.prior(close_args,done)
            })
          }
          else return closer.prior(close_args,done);
        })
      }
    })
  }

  // legacy
  if( cb ) {
    cb.call(instance,null,tag,storedesc.join('~'))
  }
  else return {
    tag:tag,
    desc:storedesc.join('~')
  }
}
