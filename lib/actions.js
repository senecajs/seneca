/* Copyright (c) 2010-2015 Richard Rodger, MIT License */
'use strict'

var _ = require('lodash')
var Jsonic = require('jsonic')


exports.find = function (inargs, inflags) {
  var seneca = this
  var args = inargs || {}
  var flags = inflags || {}

  if (_.isString(inargs)) {
    args = Jsonic(inargs)
  }

  args = seneca.util.clean(args)

  var actmeta = seneca.private$.actrouter.find(args)

  if (!actmeta && flags.catchall) {
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
