/* Copyright (c) 2014 Richard Rodger, MIT License */
/* jshint node:true, asi:true, eqnull:true */
"use strict";


var fs = require('fs')


var _      = require('underscore')
var jsonic = require('jsonic')
var error  = require('eraro')({package:'optioner'})


var logging = require('./logging')
var common  = require('./common')



module.exports = function( optimist, callmodule ) {
  var DEFAULT_OPTIONS_FILE = './seneca.options.js'

  var options = {}

  var sourcemap = {
    argv:         {log:{}},
    env:          {log:{}},
    default_file: {}
  }

  var defaults = {
    timeout:33333,
    status_interval: 60000,
    stats: {
      size:1024,
      duration:60000,
      running:false
    },
    debug:{
      allargs:false
    },
    deathdelay:33333,
    test:{
      silent:false,
      stayalive:false
    },
    admin:{
      local:false,
      prefix:'/admin'
    },
    plugin:{}
  }



  try {
    sourcemap.default_file = callmodule.require( DEFAULT_OPTIONS_FILE )
  }
  catch(e) {
    if( 'MODULE_NOT_FOUND' != e.code ) 
      throw error(e,'require_default_options',{from:DEFAULT_OPTIONS_FILE, module:callmodule});
  }



  // Runtime options

  if( process.env.SENECA_LOG ) {
    sourcemap.env.log.map = sourcemap.env.log.map || []
    logging.parse_command_line( process.env.SENECA_LOG, sourcemap.env.log.map )
  }

  if( process.env.SENECA_OPTIONS ) {
    sourcemap.env = common.deepextend({},sourcemap.env,jsonic(process.env.SENECA_OPTIONS))
  }

  if( optimist.argv.seneca ) {
    if( _.isObject(optimist.argv.seneca.options) ) {
      sourcemap.argv = optimist.argv.seneca.options 
    }

    if( optimist.argv.seneca.log ) {
      sourcemap.argv.log.map = sourcemap.argv.log.map || []
      logging.parse_command_line( optimist.argv.seneca.log, sourcemap.argv.log.map )
    }
  }




  function set_options( input ) {
    if( null == input ) throw error('no_options');

    var from = input.from
    if( _.isString( input ) ) {
      from = input
      input = {}
    } 

    var loaded = {}
    if( _.isString( from ) ) {
      loaded = load_options( from )
    }

    // This is the list of option sources.
    // The list is in reverse precedence order, i.e. command line arguments (argv) win
    options = common.deepextend(
      {},
      defaults,
      sourcemap.default_file,
      options,
      loaded,
      input,
      sourcemap.env,
      sourcemap.argv
    )

    // Legacy log settings.
    options.log = options.log || options.logger || options.logging || {}

    if( 'print' === options.log ) {
      options.log = {map:[{level:'all',handler:'print'}]}
    }
    else if( !options.log.map ) {
      options.log.map = [
        {level:'info+',handler:'print'}
      ]
    }

    return options
  }


  function get_options() {
    return options
  }



  function load_options( from ) {
    var out = {}

    if( from.match( /\.json$/i ) ) {
      // this is deliberate, options are ALWAYS loaded synchronously
      var text = fs.readFileSync( from )
      out = jsonic(text)
    }

    else if( from.match( /\.js$/i ) ) {
      if( !from.match(/^\//) ) {
        from = './'+from
      }
      
      try {
        out = callmodule.require( from )
      }
      catch(e) {
        if( 'MODULE_NOT_FOUND' != e.code )
          throw error(e,'require_options',{from:from,module:callmodule});
      }
    }

    return out
  }



  return {
    set: set_options,
    get: get_options,
  }
}


