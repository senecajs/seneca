/* Copyright (c) 2014-2015 Richard Rodger, MIT License */
/* jshint node:true, asi:true, eqnull:true */
"use strict";


var fs = require('fs')


var _      = require('lodash')
var jsonic = require('jsonic')
var error  = require('eraro')({package:'seneca',msgmap:ERRMSGMAP()})


var logging = require('./logging')
var common  = require('./common')



module.exports = function( argv, callmodule, defaults ) {
  var DEFAULT_OPTIONS_FILE = './seneca.options.js'
  var FATAL_OPTIONS_FILE   = './options.seneca.js'

  var first   = true
  var options = {}

  var sourcemap = {
    argv:         {},
    env:          {},
    default_file: {}
  }


  if( fs.existsSync(FATAL_OPTIONS_FILE) ) {
    throw error('inverted_file_name',{from:FATAL_OPTIONS_FILE, module:callmodule})
  }


  try {
    sourcemap.default_file = callmodule.require( DEFAULT_OPTIONS_FILE )
  }
  catch(e) {
    if( 'MODULE_NOT_FOUND' != e.code )
      throw error(
        e,'require_default_options',
        {errmsg:e.message, from:DEFAULT_OPTIONS_FILE, module:callmodule});
  }



  // Runtime options

  if( process.env.SENECA_LOG ) {
    sourcemap.env.log = sourcemap.env.log || {}
    sourcemap.env.log.map = sourcemap.env.log.map || []
    logging.parse_command_line( process.env.SENECA_LOG,
                                sourcemap.env.log,
                                {shortcut:true} )
  }

  if( process.env.SENECA_OPTIONS ) {
    sourcemap.env = common.deepextend({},sourcemap.env,
                                      jsonic(process.env.SENECA_OPTIONS))
  }

  if( argv.seneca ) {
    if( _.isObject(argv.seneca.options) ) {
      sourcemap.argv = argv.seneca.options
    }
    else if( _.isString(argv.seneca.options) ) {
      if( 'print' == argv.seneca.options ) {
        sourcemap.argv = { debug:{print:{options:true}} }
      }
      else {
        sourcemap.argv = jsonic(argv.seneca.options)
      }
    }

    if( _.isString(sourcemap.argv.from) ) {
      sourcemap.argv = common.deepextend( load_options(sourcemap.argv.from),
                                          sourcemap.argv)
    }

    if( null != argv.seneca.tag ) {
      sourcemap.argv.tag = ''+argv.seneca.tag
    }

    if( argv.seneca.log ) {
      sourcemap.argv.log = sourcemap.argv.log || {}
      sourcemap.argv.log.map = sourcemap.argv.log.map || []
      logging.parse_command_line( argv.seneca.log,
                                  sourcemap.argv.log,
                                  {shortcut:true} )
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
    // The list is in reverse precedence order,
    // i.e. command line arguments (argv) win
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

    // after first, seneca.options always overrides
    if( !first ) {
      options = common.deepextend( options, input )
    }


    // Legacy log settings.
    options.log = options.log || options.logger || options.logging || {}


    first = false
    return options
  }


  function get_options() {
    return options
  }



  function load_options( from ) {
    var out = {}

    if( from.match( /\.json$/i ) ) {
      // this is deliberate, options are ALWAYS loaded synchronously
      var text = fs.readFileSync( from ).toString()
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


function ERRMSGMAP() {
  return {
    inverted_file_name: 'Please use seneca.options.js as the default options '+
      'file name. The alternate name options.seneca.js is not supported.',

    require_default_options: 'Call to require failed for <%=from%>: <%=errmsg%>.'
  }
}
