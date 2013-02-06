/* Copyright (c) 2012-2013 Richard Rodger */

"use strict";


var fs      = require('fs')

var _       = require('underscore')



module.exports = function config( si,opts,cb ) {

  var config = {}

  if( opts.file ) {
    fs.readFile( opts.file, function(err,text){
      if( err ) return cb(err);

      config = JSON.parse(text)
      cb()
    }) 
  }
  else if( _.isObject(opts.object) ) {
    config = _.extend({},opts.object)
    
    cb()
  }
  else si.fail(cb,'no-file')

  si.add({role:'config',cmd:'get'},function(args,cb){
    var base = args.base || null
    var root  = base ? (config[base]||{}) : config 
    var val   = args.key ? root[args.key] : root

    val = common.copydata(val)

    cb(null,val)
  })
}
