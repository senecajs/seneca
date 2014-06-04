/* Copyright (c) 2014 Richard Rodger, MIT License */
/* jshint node:true, asi:true, eqnull:true */
"use strict";


var _     = require('underscore')
var error = require('eraro')({package:'optioner'})


var common = require('./common')


module.exports = function( optimist ) {

  var options = {}

  var sourcemap = {
    argv: {}
  }

  var defaults = {
    timeout:33333,
    status_interval: 60000,
    stats: {
      size:1024,
      duration:60000,
      running:false
    },
    /*
    listen: {
      host: 'localhost',
      port: 10101,
      path: '/act',
      limit: '11mb',
      timeout: '22222'
    },
     */
    debug:{
      allargs:false
    },
    deathdelay:33333,
    test:{
      silent:false,
      stayalive:false
    },
    plugin:{}
  }



  if( optimist.argv.seneca && _.isObject(optimist.argv.seneca.options) ) {
    sourcemap.argv = argv.seneca.options 
  }



  function set_options( input ) {
    options = common.deepextend(
      {},
      defaults,
      input,
      sourcemap.argv
    )

    // Legacy log settings.
    options.log = options.log || options.logger || options.logging || {}

    if( 'print' === options.log ) {
      options.log = {map:[{level:'all',handler:'print'}]}
    }

    return options
  }


  function get_options() {
    return options
  }


  return {
    set: set_options,
    get: get_options,
  }
}


