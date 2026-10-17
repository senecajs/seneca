/* Copyright (c) 2026 Richard Rodger and other contributors, MIT License */
'use strict'

// Loaded by npm test (--require). Seneca 4 validates with shape, which does
// not accept shapes built with gubu, and the published seneca-entity and
// seneca-mem-store still build their option shapes with gubu. For those two
// plugins only, require('gubu') resolves to ./index.js: shape under gubu's
// export names. Every other package, use-plugin included, keeps its own gubu.
// Remove this file, ./index.js and the --require flag in package.json once
// both plugins depend on shape.

const Module = require('node:module')
const Path = require('node:path')
const { pathToFileURL } = require('node:url')

const SHIM = pathToFileURL(Path.join(__dirname, 'index.js')).href
const PLUGINS = /[\\/]node_modules[\\/](seneca-entity|seneca-mem-store)[\\/]/

Module.registerHooks({
  resolve(specifier, context, nextResolve) {
    if (
      'gubu' === specifier &&
      null != context.parentURL &&
      PLUGINS.test(decodeURIComponent(context.parentURL)) &&
      // Not the copy of Seneca 3 that seneca-entity bundles for itself.
      !/[\\/]node_modules[\\/]seneca[\\/]/.test(decodeURIComponent(context.parentURL))
    ) {
      return { url: SHIM, shortCircuit: true, format: 'commonjs' }
    }
    return nextResolve(specifier, context)
  },
})
