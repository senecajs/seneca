/* Copyright (c) 2019 Richard Rodger and other contributors, MIT License */
'use strict'

var Util = require('util')

module.exports = {
  make_it: function(lab) {
    return function it(name, opts, func) {
      if ('function' === typeof opts) {
        func = opts
        opts = {}
      }

      lab.it(
        name,
        opts,
        Util.promisify(function(x, fin) {
          func(fin)
        })
      )
    }
  }
}
