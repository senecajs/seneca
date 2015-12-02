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
