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
    console.log(
      '\nSeneca Options (' + instance.id + '): before plugins\n' + '===\n'
    )
    console.log(Util.inspect(options, { depth: null }))
    console.log('')
  }
}

module.exports.print = function print(err, out) {
  if (err) {
    console.log('ERROR: ' + err.message)
  } else {
    console.log(Util.inspect(out, { depth: null }))
  }
}

module.exports.log = function log() {
  console.log.apply(console.log, arguments)
}

module.exports.err = function() {
  console.error.apply(console.error, arguments)
}

module.exports.plugin_options = function plugin_options(
  seneca,
  fullname,
  plugin_options
) {
  console.log(
    '\nSeneca Options (' + seneca.id + '): plugin: ' + fullname + '\n' + '===\n'
  )
  console.log(Util.inspect(plugin_options, { depth: null }))
  console.log('')
}
