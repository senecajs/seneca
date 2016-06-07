/* Copyright (c) 2010-2016 Richard Rodger and other contributors, MIT License */
'use strict'

var Fs = require('fs')

var _ = require('lodash')
var Eraro = require('eraro')
var Errors = require('./errors')
var Jsonic = require('jsonic')

// Shortcuts
var arrayify = Function.prototype.apply.bind(Array.prototype.slice)

var internals = {
  error: Eraro({
    package: 'seneca',
    msgmap: Errors,
    override: true
  })
}

exports.fail = function make_legacy_fail (so) {
  return function () {
    var args = arrayify(arguments)

    var cb = _.isFunction(arguments[arguments.length - 1])
      ? arguments[arguments.length - 1] : null

    if (cb) {
      args.pop()
    }

    if (_.isObject(args[0])) {
      var code = args[0].code
      if (_.isString(code)) {
        args.unshift(code)
      }
    }

    var err = internals.error.apply(null, args)
    err.callpoint = new Error().stack.match(/^.*\n.*\n\s*(.*)/)[1]
    err.seneca = { code: err.code, valmap: err.details }

    this.log.error(err)
    if (so.errhandler) {
      so.errhandler.call(this, err)
    }

    if (cb) {
      cb.call(this, err)
    }

    return err
  }
}


var handlers = exports.loghandler = {}


var start_time = Date.now()

handlers.pretty = function () {
  var args = arrayify(arguments)
  args[2] = args[2].toUpperCase()

  if (args[0].short$) {
    args[0] = '' + (args[0].getTime() - start_time)
    args[0] = '        '.substring(0, 8 - args[0].length) + args[0]
  }

  var argstrs = []
  args.forEach(function (a) {
    var pstr = (a === null) ? a
        : typeof (a) === 'string' ? a
        : _.isDate(a) ? (a.toISOString())
        : _.isObject(a) ? Jsonic.stringify(a) : a

    argstrs.push(pstr)
  })

  return argstrs
}

handlers.silent = function silent () {
  // does nothing!
}

handlers.print = function print () {
  var arr = handlers.pretty.apply(null, arrayify(arguments))
  console.log([arr.slice(0, 3).join(' ')].concat(arr.slice(3)).join('\t'))
}

handlers.stream = function stream (outstream, opts) {
  opts = opts || {}
  return function () {
    var args = arrayify(arguments)
    outstream.write(opts.format === 'json'
      ? JSON.stringify(args) + '\n'
      : handlers.pretty.apply(null, args).join('\t') + '\n')
  }
}

handlers.emitter = function emitter (outemitter) {
  return function () {
    var args = arrayify(arguments)
    outemitter.emit('log', args)
  }
}

handlers.file = function file (filepath, opts) {
  opts = opts || {}
  var ws = Fs.createWriteStream(filepath, {flags: opts.flags || 'a'})
  return handlers.stream(ws, opts)
}
