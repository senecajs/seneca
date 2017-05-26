/* Copyright (c) 2014-2016 Richard Rodger and other contributors, MIT License */
'use strict'

var Fs = require('fs')
var _ = require('lodash')
var Error = require('eraro')
var Jsonic = require('jsonic')
var Minimist = require('minimist')
var Common = require('./common')

var error = Error({ package: 'seneca', msgmap: ERRMSGMAP() })

module.exports = function(callmodule, defaults, orig_initial) {
  var sourcemap = {
    argv: {},
    env: {},
    default_file: {},
    loaded: {}
  }

  // Must be defined here as prepare depends on it.
  var options = {}

  var basemodule = orig_initial.module || callmodule.parent || callmodule
  options = prepare(basemodule, defaults, orig_initial)

  // Not needed after this point, and screws up debug printing.
  delete options.module

  function prepare(basemodule, defaults, initial) {
    var DEFAULT_OPTIONS_FILE = './seneca.options.js'
    var FATAL_OPTIONS_FILE = './options.seneca.js'

    // Load from custom file, either by providing a string,
    // or having a property 'from' that is a string.
    // The string is interpreted as a file path.

    var from = initial.from
    if (_.isString(initial)) {
      from = initial
      initial = {}
    }

    if (_.isString(from)) {
      sourcemap.loaded = load_options(from)
    }

    var argv = Minimist(process.argv.slice(2))

    if (Fs.existsSync(FATAL_OPTIONS_FILE)) {
      throw error('inverted_file_name', {
        from: FATAL_OPTIONS_FILE,
        module: basemodule
      })
    }

    try {
      sourcemap.default_file = basemodule.require(DEFAULT_OPTIONS_FILE)
    } catch (e) {
      if (e.code !== 'MODULE_NOT_FOUND') {
        var wrappedError = {
          errmsg: e.message,
          from: DEFAULT_OPTIONS_FILE,
          module: basemodule
        }

        throw error(e, 'require_default_options', wrappedError)
      }
    }

    if (process.env.SENECA_OPTIONS) {
      sourcemap.env = Common.deepextend(
        {},
        sourcemap.env,
        Jsonic(process.env.SENECA_OPTIONS)
      )
    }

    if (argv.seneca) {
      if (_.isObject(argv.seneca.options)) {
        sourcemap.argv = argv.seneca.options
      } else if (_.isString(argv.seneca.options)) {
        if (argv.seneca.options === 'print') {
          sourcemap.argv = { debug: { print: { options: true } } }
        } else {
          sourcemap.argv = Jsonic(argv.seneca.options)
        }
      }

      if (_.isString(sourcemap.argv.from)) {
        sourcemap.argv = Common.deepextend(
          load_options(sourcemap.argv.from),
          sourcemap.argv
        )
      }

      boolify(sourcemap.argv)

      if (null != argv.seneca.tag) {
        sourcemap.argv.tag = '' + argv.seneca.tag
      }

      if (argv.seneca.log) {
        sourcemap.argv.log = sourcemap.argv.log || {}
        parse_command_line(argv.seneca.log, sourcemap.argv)
      }
    }

    // This is the list of option sources.
    // The list is in reverse precedence order,
    // i.e. command line arguments (argv) win
    var out = Common.deepextend(
      {},
      defaults,
      sourcemap.default_file,
      options,
      sourcemap.loaded,
      initial,
      sourcemap.env,
      sourcemap.argv
    )

    // Legacy log settings.
    out.log = out.log || out.logger || out.logging || {}

    // boolean corrections
    out.legacy.logging = Common.boolify(out.legacy.logging)

    return out
  }

  function parse_command_line(spec, parsedSpec) {
    var logSpec = _.isArray(spec) ? spec[0] : spec

    if (_.isString(logSpec)) {
      try {
        parsedSpec.log = Jsonic(logSpec)
      } catch (e) {
        parsedSpec.log = {}
      }
      return
    }

    if (_.isObject(logSpec)) {
      parsedSpec.log = {}
      var logType = Object.keys(logSpec.level || logSpec)
      if (logType.length > 0) {
        parsedSpec.log = { level: logType[0] }
      }
    }
  }

  function set_options(input) {
    if (null == input) throw error('no_options')

    // DEPRECATED: Remove when Seneca >= 4.x
    if (_.isString(input)) {
      options = prepare(basemodule, defaults, input)
    } else {
      options = Common.deepextend(options, input)
    }

    return options
  }

  function get_options() {
    return options
  }

  function load_options(from) {
    var out = {}

    if (from.match(/\.json$/i)) {
      // this is deliberate, options are ALWAYS loaded synchronously
      var text = Fs.readFileSync(from).toString()
      out = Jsonic(text)
    } else if (from.match(/\.js$/i)) {
      if (!from.match(/^\//)) {
        from = './' + from
      }

      try {
        out = basemodule.require(from)
      } catch (e) {
        if (e.code !== 'MODULE_NOT_FOUND') {
          throw error(e, 'require_options', { from: from, module: basemodule })
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

function boolify(obj) {
  Object.keys(obj).forEach(function(k) {
    obj[k] = 'true' === obj[k]
      ? true
      : 'false' === obj[k]
          ? false
          : _.isObject(obj[k]) ? boolify(obj[k]) : obj[k]
  })
  return obj
}

function ERRMSGMAP() {
  return {
    inverted_file_name: 'Please use seneca.options.js as the default options ' +
      'file name. The alternate name options.seneca.js is not supported.',

    require_default_options: 'Call to require failed for <%=from%>: <%=errmsg%>.'
  }
}
