/* Copyright (c) 2012-2013 Richard Rodger */

"use strict";


var fs      = require('fs')

var _       = require('underscore')



module.exports = function config( opts,cb ) {
  var seneca = this

  var ref = {config:{}}

  if( opts.file ) {

    // TODO: need an async way to this

    var text = fs.readFileSync( opts.file )
    ref.config = JSON.parse(text)

    cb()
  }
  else if( _.isObject(opts.object) ) {
    ref.config = _.extend({},opts.object)
    
    cb()
  }
  else seneca.fail(cb,'no-file')


  seneca.add({role:'config',cmd:'get'},function(args,cb){
    var base = args.base || null
    var root  = base ? (ref.config[base]||{}) : ref.config 
    var val   = args.key ? root[args.key] : root

    val = seneca.util.copydata(val)

    cb(null,val)
  })
}
