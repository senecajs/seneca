/* Copyright © 2015-2021 Richard Rodger and other contributors, MIT License. */
'use strict'

// Node API modules
import Util from 'util'

// Untyped modules.
const Minimist: (args: string[], opts?: Record<string, any>) => Record<string, any> =
  require('minimist')

// Printed options are redacted like log entries.
import { redact_with } from './redact'


/** Handle command line specific functionality */
function Print(seneca: any, process_argv: any) {
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

function print_options(instance: any, options: any) {
  if (options.debug.print.options) {
    instance.private$.print.log(
      '\nSeneca Options (' + instance.id + '): before plugins\n' + '===\n'
    )
    instance.private$.print.log(
      Util.inspect(redact_with(instance, options), {
        depth: options.debug.print.depth,
      })
    )
    instance.private$.print.log('')
  }
}

function print_reply(this: any, err: any, out: any) {
  if (err) {
    internal_err('ERROR: ' + err.message)
  } else {
    internal_log(
      Util.inspect(out, {
        depth: this && this.options ? this.options().debug.print.depth : null,
      })
    )
  }
}

function internal_log(...args: any) {
  // ensure `console.log` does not appear in source code
  var konsole_log = console['log']
  konsole_log.apply(konsole_log, args)
}


function internal_err(...args: any) {
  console.error.apply(console.error, args)
}


function plugin_options(
  instance: any,
  fullname: any,
  plugin_options: any
) {
  instance.private$.print.log(
    '\nSeneca Options (' +
    instance.id +
    '): plugin: ' +
    fullname +
    '\n' +
    '===\n'
  )
  instance.private$.print.log(
    Util.inspect(redact_with(instance, plugin_options), {
      depth: instance.options().debug.print.depth,
    })
  )
  instance.private$.print.log('')
}


Print.print_options = print_options
Print.internal_log = internal_log
Print.internal_err = internal_err
Print.plugin_options = plugin_options
Print.print = print_reply


export { Print }
