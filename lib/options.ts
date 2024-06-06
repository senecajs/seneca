/* Copyright © 2014-2022 Richard Rodger and other contributors, MIT License. */


import Fs from 'fs'
import Path from 'path'

const Eraro = require('eraro')
const Jsonic = require('@jsonic/jsonic-next')
const Minimist = require('minimist')
const { Gubu } = require('gubu')


import { deep } from './common'

const error = Eraro({ package: 'seneca', msgmap: ERRMSGMAP() })


function resolve_options(callmodule: any, defaults: any, orig_initial: any) {
  let optionShape = Gubu(defaults)

  const sourcemap: any = {
    argv: {},
    env: {},
    default_file: {},
    loaded: {},
  }

  // Must be defined here as prepare depends on it.
  let options: any = {}

  let basemodule: any

  if (orig_initial.module && orig_initial.module.require) {
    basemodule = orig_initial.module
  } else if (callmodule.parent && callmodule.parent.require) {
    basemodule = callmodule.parent
  } else {
    basemodule = callmodule
  }
  options = prepare(basemodule, optionShape, orig_initial)

  // Not needed after this point, and screws up debug printing.
  delete options.module

  function prepare(basemodule: any, optionShape: any, initial: any) {
    const DEFAULT_OPTIONS_FILE = './seneca.options.js'
    const FATAL_OPTIONS_FILE = './options.seneca.js'

    // Load from custom file, either by providing a string,
    // or having a property 'from' that is a string.
    // The string is interpreted as a file path.

    let from = initial.from
    if ('string' === typeof initial) {
      from = initial
      initial = {}
    }

    if ('string' === typeof from) {
      sourcemap.loaded = load_options(from)
    }

    // Option debug.argv allows for testing.
    // First two elements are stripped!
    const argv = Minimist(
      ((initial && initial.debug && initial.debug.argv) || process.argv).slice(
        2
      )
    )

    // options debug.env allows for testing
    const env = (initial && initial.debug && initial.debug.env) || process.env

    if (Fs.existsSync && Fs.existsSync(FATAL_OPTIONS_FILE)) {
      throw error('inverted_file_name', {
        from: FATAL_OPTIONS_FILE,
        module: basemodule,
      })
    }

    try {
      sourcemap.default_file =
        basemodule.require && basemodule.require(DEFAULT_OPTIONS_FILE)
    } catch (e: any) {
      if (e.code !== 'MODULE_NOT_FOUND') {
        const wrappedError = {
          errmsg: e.message,
          from: DEFAULT_OPTIONS_FILE,
          module: basemodule,
        }

        throw error(e, 'require_default_options', wrappedError)
      }
    }

    if (env.SENECA_OPTIONS) {
      sourcemap.env = deep({}, sourcemap.env, Jsonic(env.SENECA_OPTIONS))
    }

    if (env.SENECA_TEST) {
      sourcemap.env.test = boolify(env.SENECA_TEST)
    }

    if (env.SENECA_QUIET) {
      sourcemap.env.quiet = boolify(env.SENECA_QUIET)
    }

    if (argv.seneca) {
      if (argv.seneca.options && 'object' === typeof argv.seneca.options) {
        sourcemap.argv = argv.seneca.options
      } else if ('string' === typeof argv.seneca.options) {
        if (argv.seneca.options === 'print') {
          sourcemap.argv = { debug: { print: { options: true } } }
        } else {
          sourcemap.argv = Jsonic(argv.seneca.options)
        }
      }

      // --seneca.options.from=<filepath>
      if ('string' === typeof sourcemap.argv.from) {
        sourcemap.argv = deep(
          load_options(sourcemap.argv.from),
          sourcemap.argv
        )
      }

      boolifyDeep(sourcemap.argv)

      if (null != argv.seneca.tag) {
        sourcemap.argv.tag = '' + argv.seneca.tag
      }

      if (argv.seneca.log) {
        sourcemap.argv.log = sourcemap.argv.log || {}
        parse_command_line_log(argv.seneca.log, sourcemap.argv)
      }

      if (argv.seneca.test) {
        sourcemap.argv.test = argv.seneca.test
      }

      if (argv.seneca.quiet) {
        sourcemap.argv.quiet = argv.seneca.quiet
      }
    }

    // Internal adjustments to options
    const adjusted: any = {}

    // Legacy global off
    // TODO: this does not work if legacy:false used outside initial
    // e.g. in seneca.options.js
    if (false === initial.legacy) {
      adjusted.legacy = {
        // actdef: false,
        // action_signature: false,
        error: false,
        // error_codes: false,
        // fail: false,
        // logging: false,
        meta: false,
        // transport: false,
        // timeout_string: false,
        // rules: false,
        // options: false,

        builtin_actions: false,
      }
    }
    else if (true === initial.legacy) {
      adjusted.legacy = {}
    }

    const validate =
      false !== initial.valid?.active &&
      false !== initial.valid?.option

    // This is the list of option sources.
    // The list is in reverse precedence order,
    // i.e. command line arguments (argv) win
    let out = deep(
      validate ? {} : optionShape(),
      // defaults,
      sourcemap.default_file,
      options,
      sourcemap.loaded,
      initial,
      adjusted,
      sourcemap.env,
      sourcemap.argv
    )

    if (validate) {
      out = optionShape(out)
    }

    // Legacy log settings.
    out.log = out.log || out.logger || out.logging || {}

    // boolean corrections
    // out.legacy.logging = boolify(out.legacy.logging)

    return out
  }

  // TODO: restyle and make functional
  // --seneca.log=LOGSPEC where LOGSPEC can be:
  //   * log level (or abbrev)
  //   * options.log as jsonic
  //   * logger name (flat, json)
  function parse_command_line_log(spec: any, parsedSpec: any) {
    const logSpec = Array.isArray(spec) ? spec[0] : spec

    if ('string' === typeof logSpec) {
      try {
        parsedSpec.log = Jsonic(logSpec)
      } catch (e) {
        parsedSpec.log = logSpec
      }
    } else if (logSpec && 'object' === typeof logSpec) {
      parsedSpec.log = {}
      const logType = Object.keys(logSpec.level || logSpec)
      if (logType.length > 0) {
        parsedSpec.log = { level: logType[0] }
      }
    }
  }

  function set_options(input: any) {
    if (null == input) throw error('no_options')

    // DEPRECATED: Remove when Seneca >= 4.x
    if ('string' === typeof input) {
      options = prepare(basemodule, optionShape, input)
    } else if (input.reload$) {
      options = prepare(basemodule, optionShape, input)
    } else {
      options = deep(options, input)
      // TODO: use optionShape here to confirm options still valid
    }

    return options
  }

  function get_options() {
    return options
  }

  function load_options(origfrom: any) {
    let out = {}

    //const from = origfrom.match(/^\//) ? origfrom : process.cwd() + '/' + origfrom
    const from =
      Path.basename(origfrom) !== origfrom
        ? origfrom
        : Path.join(process.cwd(), origfrom)

    if (from.match(/\.json$/i)) {
      // this is deliberate, options are ALWAYS loaded synchronously
      const text = (Fs.readFileSync && Fs.readFileSync(from).toString()) || ''
      out = Jsonic(text)
    } else if (from.match(/\.js$/i)) {
      //if (!from.match(/^\//)) {
      //  from = './' + from
      //}

      try {
        out = basemodule.require(from)
      } catch (e: any) {
        // TODO this is getting lost
        if (e.code !== 'MODULE_NOT_FOUND') {
          throw error(e, 'require_options', { from: from, module: basemodule })
        }
      }
    }

    return out
  }

  return {
    set: set_options,
    get: get_options,
  }
}


function boolify(v: any) {
  try {
    return !!JSON.parse(v)
  } catch (e) {
    return false
  }
}

function boolifyDeep(obj: any) {
  Object.keys(obj).forEach(function(k) {
    obj[k] =
      'true' === obj[k]
        ? true
        : 'false' === obj[k]
          ? false
          : obj[k] && 'object' === typeof obj[k]
            ? boolifyDeep(obj[k])
            : obj[k]
  })
  return obj
}

function ERRMSGMAP() {
  return {
    inverted_file_name:
      'Please use seneca.options.js as the default options ' +
      'file name. The alternate name options.seneca.js is not supported.',

    require_default_options:
      'Call to require failed for <%=from%>: <%=errmsg%>.',
  }
}



export {
  resolve_options
}
