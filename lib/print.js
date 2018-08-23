/* Copyright © 2015-2018 Richard Rodger and other contributors, MIT License. */
'use strict'

// Node API modules
var Util = require('util')

// External modules.
var _ = require('lodash')
var Archy = require('archy')
var Minimist = require('minimist')

/** Handle command line specific functionality */
module.exports = function(seneca, process_argv) {
  var argv = Minimist(process_argv.slice(2))

  if (!argv.seneca) {
    return
  }

  var cmdspec = argv.seneca
  if (cmdspec.print) {
    if (cmdspec.print.tree) {
      // Hack! Complex init means non-deterministic or multiple ready calls,
      // so just delay tree print by some number of seconds to capture full tree.
      var delay_seconds = cmdspec.print.tree.all || cmdspec.print.tree
      if (_.isNumber(delay_seconds)) {
        setTimeout(function() {
          module.exports.print_tree(seneca, cmdspec)
        }, 1000 * delay_seconds)
      } else {
        // Print after first ready
        seneca.ready(function() {
          module.exports.print_tree(this, cmdspec)
        })
      }
    }

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

// TODO: remove to a plugin to remove dep on archy
module.exports.print_tree = function print_tree(seneca, cmdspec) {
  var tree = {
    label: 'Seneca action patterns for instance: ' + seneca.id,
    nodes: []
  }

  function insert(nodes, current) {
    if (nodes.length === 0) return

    for (var i = 0; i < current.nodes.length; i++) {
      if (nodes[0] === current.nodes[i].label) {
        return insert(nodes.slice(1), current.nodes[i])
      }
    }

    var nn = { label: nodes[0], nodes: [] }
    current.nodes.push(nn)
    insert(nodes.slice(1), nn)
  }

  _.each(seneca.list(), function(pat) {
    var nodes = []
    var ignore = false
    _.each(pat, function(v, k) {
      if (
        (!cmdspec.print.tree.all &&
          (k === 'role' &&
            (v === 'seneca' ||
              v === 'basic' ||
              v === 'util' ||
              v === 'entity' ||
              v === 'web' ||
              v === 'transport' ||
              v === 'options' ||
              v === 'mem-store' ||
              v === 'seneca'))) ||
        k === 'init'
      ) {
        ignore = true
      } else {
        nodes.push(k + ':' + v)
      }
    })

    if (!ignore) {
      var meta = seneca.find(pat)

      var metadesc = []
      while (meta) {
        metadesc.push(
          '# ' +
            (meta.plugin_fullname || '-') +
            ', ' +
            meta.id +
            ', ' +
            meta.func.name
        )
        meta = meta.priormeta
      }

      nodes.push(metadesc.join('\n'))

      insert(nodes, tree)
    }
  })

  /* eslint no-console: 0 */
  console.log(Archy(tree))
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
