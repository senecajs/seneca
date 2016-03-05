/* Copyright (c) 2014-2015 Richard Rodger, MIT License */
'use strict'

var Fs = require('fs')
var _ = require('lodash')
var Error = require('eraro')
var Jsonic = require('jsonic')
var Minimist = require('minimist')
var Logging = require('./logging')
var Common = require('./common')

var error = Error({ package: 'seneca', msgmap: ERRMSGMAP() })

module.exports = function (callmodule, defaults) {
  var DEFAULT_OPTIONS_FILE = './seneca.options.js'
  var FATAL_OPTIONS_FILE = './options.seneca.js'

  var first = true
  var options = {}
  var argv = Minimist(process.argv.slice(2))

  var sourcemap = {
    argv: {},
    env: {},
    default_file: {}
  }

  if (Fs.existsSync(FATAL_OPTIONS_FILE)) {
    throw error('inverted_file_name', {
      from: FATAL_OPTIONS_FILE, module: callmodule
    })
  }

  try {
    sourcemap.default_file = callmodule.require(DEFAULT_OPTIONS_FILE)
  }
  catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') {
      var wrappedError = {
        errmsg: e.message,
        from: DEFAULT_OPTIONS_FILE,
        module: callmodule
      }

      throw error(e, 'require_default_options', wrappedError)
    }
  }

  // Runtime options

  if (process.env.SENECA_LOG) {
    sourcemap.env.log = sourcemap.env.log || {}
    sourcemap.env.log.map = sourcemap.env.log.map || []
    Logging.parse_command_line(process.env.SENECA_LOG,
      sourcemap.env.log,
      {shortcut: true})
  }

  if (process.env.SENECA_OPTIONS) {
    sourcemap.env = Common.deepextend({}, sourcemap.env,
      Jsonic(process.env.SENECA_OPTIONS))
  }

  if (argv.seneca) {
    if (_.isObject(argv.seneca.options)) {
      sourcemap.argv = argv.seneca.options
    }
    else if (_.isString(argv.seneca.options)) {
      if (argv.seneca.options === 'print') {
        sourcemap.argv = { debug: {print: {options: true}} }
      }
      else {
        sourcemap.argv = Jsonic(argv.seneca.options)
      }
    }

    if (_.isString(sourcemap.argv.from)) {
      sourcemap.argv = Common.deepextend(load_options(sourcemap.argv.from),
        sourcemap.argv)
    }

    if (null != argv.seneca.tag) {
      sourcemap.argv.tag = '' + argv.seneca.tag
    }

    if (argv.seneca.log) {
      sourcemap.argv.log = sourcemap.argv.log || {}
      sourcemap.argv.log.map = sourcemap.argv.log.map || []
      Logging.parse_command_line(argv.seneca.log,
        sourcemap.argv.log,
        { shortcut: true })
    }
  }

  function set_options (input) {
    if (input == null) throw error('no_options')

    var from = input.from
    if (_.isString(input)) {
      from = input
      input = {}
    }

    var loaded = {}
    if (_.isString(from)) {
      loaded = load_options(from)
    }

    // This is the list of option sources.
    // The list is in reverse precedence order,
    // i.e. command line arguments (argv) win
    options = Common.deepextend(
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
    if (!first) {
      options = Common.deepextend(options, input)
    }

    // Legacy log settings.
    options.log = options.log || options.logger || options.logging || {}

    first = false

    return options
  }

  function get_options () {
    return options
  }

  function load_options (from) {
    var out = {}

    if (from.match(/\.json$/i)) {
      // this is deliberate, options are ALWAYS loaded synchronously
      var text = Fs.readFileSync(from).toString()
      out = Jsonic(text)
    }
    else if (from.match(/\.js$/i)) {
      if (!from.match(/^\//)) {
        from = './' + from
      }

      try {
        out = callmodule.require(from)
      }
      catch (e) {
        if (e.code !== 'MODULE_NOT_FOUND') {
          throw error(e, 'require_options', { from: from, module: callmodule })
        }
      }
    }

    return out
  }

  return {
    set: set_options,
    get: get_options
  }
}

function ERRMSGMAP () {
  return {
    inverted_file_name: 'Please use seneca.options.js as the default options ' +
      'file name. The alternate name options.seneca.js is not supported.',

    require_default_options: 'Call to require failed for <%=from%>: <%=errmsg%>.'
  }
}
