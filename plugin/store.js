/* Copyright (c) 2012-2013 Richard Rodger, BSD License */

"use strict";

var _     = require('underscore')
var idgen = require('idgen')


function Store() {
  var self = {}

  var allcmds = ['save','load','list','remove','close']

  var si

  /* opts.map = { canon: [cmds] }
   * opts.idlen = length of instance id, default 6
   */
  self.init = function(seneca,opts,cb) {
    // TODO: parambulator validation

    si = seneca
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
    
    var canondesc = [idgen(opts.idlen||6)]

    for( var esI = 0; esI < entspecs.length; esI++ ) {
      var entspec = entspecs[esI]

      canondesc.push(entspec.canon)
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
        var cmdfunc = self[cmd+'$']
        if( cmdfunc ) {
          si.add( args, cmdfunc )
        }
        else {
          return si.fail({code:'seneca/store_cmd_missing',cmd:cmd,store:self.name},cb)
        }
      }
    }

    cb(null,canondesc.join('~'))
  }


  self.error = function(code,args,err,cb) {
    if( err ) {
      si.log.debug(args.tag$,'error',err,args)
      si.fail({code:code||'entity/error',store:self.name,error:err,args:args},cb)
      return true
    }
    else return false;
  }


  self.parent = function() {
    return {
      init:self.init
    }
  }

  return self
}


exports.Store = Store

