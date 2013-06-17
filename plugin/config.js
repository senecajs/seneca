/* Copyright (c) 2012-2013 Richard Rodger */

"use strict";


var fs      = require('fs')
var util    = require('util')

var _       = require('underscore')



module.exports = function config( opts,cb ) {
  var seneca = this

  var ref = {config:{}}

  if( opts.file ) {

    // TODO: need an async way to this
    // FIX: use init:config

    var text = fs.readFileSync( opts.file )
    ref.config = JSON.parse(text)

  }
  else if( _.isObject(opts.object) ) {
    ref.config = _.extend({},opts.object)
  }
  else {
    try {
      ref.config = seneca.context.module.require('./seneca.config.js')
    }
    catch(e) {
      seneca.log.warn('no config data provided')
    }
  }

  var env = process.env['NODE_ENV']
  if( _.isString(env) ) {
    ref.config = seneca.util.deepextend(ref.config,ref.config[env])
  }

  seneca.log.debug('loaded',util.inspect(ref.config,false,null).replace(/[\r\n]/g,' '))


  seneca.add({role:'config',cmd:'get'},function(args,cb){
    var config = ref.config

    var base = args.base || null
    var root  = base ? (config[base]||{}) : config 
    var val   = args.key ? root[args.key] : root

    val = seneca.util.copydata(val)

    cb(null,val)
  })
  

  cb(null,{
    name:'config'
  })
}
