/* Copyright (c) 2010-2015 Richard Rodger, MIT License */
'use strict'

var _ = require('lodash')
var Jsonic = require('jsonic')


exports.find = function (args) {
  var seneca = this
  if (_.isString(args)) {
    args = Jsonic(args)
  }

  var actmeta = seneca.private$.actrouter.find(args)

  // if we have no destination, we look for
  // a catch-all pattern and assign this, if
  // it exists.
  if (!actmeta) {
    actmeta = seneca.private$.actrouter.find({})
  }

  return actmeta
}

exports.has = function (args) {
  return !!exports.find.call(this, args)
}


exports.list = function (args) {
  args = _.isString(args) ? Jsonic(args) : args

  var found = this.private$.actrouter.list(args)

  found = _.map(found, function (entry) {
    return entry.match
  })

  return found
}


exports.routes = function () {
  return this.private$.actrouter.toString(function (d) {
    var s = 'F='

    if (d.plugin_fullname) {
      s += d.plugin_fullname + '/'
    }

    s += d.id

    while (d.priormeta) {
      d = d.priormeta
      s += ';'

      if (d.plugin_fullname) {
        s += d.plugin_fullname + '/'
      }

      s += d.id
    }
    return s
  })
}
