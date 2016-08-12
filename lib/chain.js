'use strict'

var Zig = require('zig')
var _ = require('lodash')
var Jsonic = require('jsonic')

var Common = require('./common')

function Chain () {}

Chain.preload = function () {
  this.decorate('start', start)
}

module.exports = Chain

function start (errhandler) {
  var sd = this.delegate()
  var options = sd.options()
  options.zig = options.zig || {}

  function make_fn (self, origargs) {
    var args = Common.parsePattern(self, origargs, 'fn:f?')

    var actargs = _.extend(
      {},
      args.moreobjargs ? args.moreobjargs : {},
      args.objargs ? args.objargs : {},
      args.strargs ? Jsonic(args.strargs) : {}
   )

    var fn
    if (args.fn) {
      fn = function (data, done) {
        return args.fn.call(self, data, done)
      }
    }
    else {
      fn = function (data, done) {
        if (args.strargs) {
          var $ = data // eslint-disable-line
          _.each(actargs, function (v, k) {
            if (_.isString(v) && v.indexOf('$.') === 0) {
              actargs[k] = eval(v) // eslint-disable-line
            }
          })
        }

        self.act(actargs, done)
        return true
      }
      fn.nm = args.strargs
    }

    return fn
  }

  var dzig = Zig({
    timeout: options.zig.timeout || options.timeout,
    trace: options.zig.trace
  })

  dzig.start(function () {
    var self = this
    dzig.end(function () {
      if (errhandler) errhandler.apply(self, arguments)
    })
  })

  sd.end = function (cb) {
    var self = this
    dzig.end(function () {
      if (cb) return cb.apply(self, arguments)
      if (errhandler) return errhandler.apply(self, arguments)
    })
    return self
  }

  sd.wait = function () {
    dzig.wait(make_fn(this, arguments))
    return this
  }

  sd.step = function () {
    dzig.step(make_fn(this, arguments))
    return this
  }

  sd.run = function () {
    dzig.run(make_fn(this, arguments))
    return this
  }

  sd.if = function (cond) {
    dzig.if(cond)
    return this
  }

  sd.endif = function () {
    dzig.endif()
    return this
  }

  sd.fire = function () {
    dzig.step(make_fn(this, arguments))
    return this
  }

  return sd
}
