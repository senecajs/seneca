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
  if (_.isString(args[2])) {
    args[2] = args[2].toUpperCase()
  }

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


function parse_command_line (spec, logspec, flags) {
  flags = flags || {}

  var logmaps = logspec.map

  if (flags.shortcut) {
    if (spec === 'short' || spec.short === true) {
      logspec.short = true
      if (!logmaps.length) {
        logmaps.push({ level: 'info+', handler: 'print' })
      }
    }

    var shortentries = logging_shortcut(spec)

    if (shortentries.length) {
      shortentries.forEach(function (shortentry) {
        logmaps.push(shortentry)
      })
      return
    }
  }

  if (_.isArray(spec)) {
    spec.forEach(function (specentry) {
      parse_command_line(specentry, logspec)
    })
    return
  }

  // parse: level=,type=,plugin=,tag=,case=,handler=
  // handler can be print,file:path

  var keys = { level: 1, type: 1, plugin: 1, tag: 1, 'case': 1,
    handler: 1, regex: 1, pin: 1, act: 1 }
  var entry = {}
  var parts = ('' + spec).split(',')
  _.each(parts, function (part) {
    var kvm = part.match(/^(.*?):(.*)$/)
    var kv = kvm ? [kvm[1], kvm[2]] : ['']

    if (kv[0].length) {
      var key = kv[0]
      if (key === 'handler') {
        var handler = kv.slice(1).join(':')
        var m
        if (handler === 'print') {
          entry[key] = handlers.print
        }
        else if ((m = /^file:(\/\/)?(.*)$/.exec(handler))) {
          entry[key] = handlers.file(m[2])
        }
      }
      else if (keys[key]) {
        if (entry[key]) {
          entry[key] += ',' + kv[1]
        }
        else {
          entry[key] = kv[1]
        }
      }
    }
  })

  if (_.keys(entry).length) {
    // print by default
    if (entry && !entry.handler) {
      entry.handler = handlers.print
    }

    logmaps.push(entry)
  }
}

exports.parse_command_line = parse_command_line


function logging_shortcut (spec) {
  if (spec && (spec.print === true ||
    spec.all === true ||
    spec === 'print' ||
    spec === 'all')) {
    return [{ level: 'all', handler: handlers.print }]
  }
  else if (spec &&
    (spec.quiet ||
    spec === 'quiet' ||
    spec.silent ||
    spec === 'silent')) {
    return []
  }
  else if (spec === 'test') {
    return [{ level: 'error+', handler: handlers.print }]
  }
  else if (spec === 'standard') {
    return [{ level: 'info+', handler: handlers.print }]
  }
  else if (_.isString(spec)) {
    var logspec = {map: []}
    parse_command_line(spec, logspec, {shortcut: false})
    return logspec.map
  }
  else return []
}

exports.logging_shortcut = logging_shortcut
