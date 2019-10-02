/* Copyright © 2015-2018 Richard Rodger and other contributors, MIT License. */
'use strict'

// Node API modules
var Util = require('util')

// External modules.
var Minimist = require('minimist')

/** Handle command line specific functionality */
module.exports = function(seneca, process_argv) {
  var argv = Minimist(process_argv.slice(2))

  var cmdspec = argv.seneca
  seneca.root.argv = cmdspec

  if (!argv.seneca) {
    return
  }

  if (cmdspec.print) {
    if (cmdspec.print.options) {
      seneca.options({ debug: { print: { options: true } } })
    }
  }
}

module.exports.print_options = function print_options(instance, options) {
  if (options.debug.print.options) {
    instance.private$.print.log(
      '\nSeneca Options (' + instance.id + '): before plugins\n' + '===\n'
    )
    instance.private$.print.log(Util.inspect(options, { depth: null }))
    instance.private$.print.log('')
  }
}

module.exports.print = function print(err, out) {
  if (err) {
    module.exports.internal_err('ERROR: ' + err.message)
  } else {
    module.exports.internal_log(Util.inspect(out, { depth: null }))
  }
}

module.exports.internal_log = function() {
  // ensure `console.log` does not appear in source code
  var konsole_log = console['log']
  konsole_log.apply(konsole_log, arguments)
}

module.exports.internal_err = function() {
  console.error.apply(console.error, arguments)
}

module.exports.plugin_options = function plugin_options(
  instance,
  fullname,
  plugin_options
) {
  instance.private$.print.log(
    '\nSeneca Options (' + instance.id + '): plugin: ' + fullname + '\n' + '===\n'
  )
  instance.private$.print.log(Util.inspect(plugin_options, { depth: null }))
  instance.private$.print.log('')
}
