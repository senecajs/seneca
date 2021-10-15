/* Copyright (c) 2019 Richard Rodger and other contributors, MIT License */
'use strict'

var Util = require('util')

var Lolex = require('lolex')

module.exports = {
  clock: function () {
    return Lolex.createClock()
  },
  make_it: function (lab) {
    return function it(name, opts, func) {
      if ('function' === typeof opts) {
        func = opts
        opts = {}
      }

      lab.it(
        name,
        opts,
        'AsyncFunction' === func.constructor.name ? func :
          Util.promisify(function (x, fin) {
            func(fin)
          })
      )
    }
  },
}
