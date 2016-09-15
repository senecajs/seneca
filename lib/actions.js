/* Copyright (c) 2010-2016 Richard Rodger and other contributors, MIT License */
'use strict'


var Util = require('util')


var _ = require('lodash')
var Jsonic = require('jsonic')


var Common = require('./common')


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

  found = _.map(found, 'match')

  return found
}


exports.inward = {
  act_default: inward_act_default,
  act_not_found: inward_act_not_found
}


function inward_act_default (ctxt, msg) {
  var so = ctxt.options

  // TODO: existence of pattern action needs own indicator flag
  if (!ctxt.actmeta) {
    var default$ = msg.default$ || (!so.strict.find ? {} : msg.default$)

    if (_.isPlainObject(default$) || _.isArray(default$)) {
      ctxt.seneca.log.debug(ctxt.__actlog(
        ctxt.actmeta || {}, ctxt.__prior_ctxt, ctxt.__callargs, ctxt.__origargs,
        {
          kind: 'act',
          case: 'DEFAULT'
        }))

      return {
        kind: 'result',
        result: default$
      }
    }
    else if (null != default$) {
      var errcode = 'act_default_bad'
      var errinfo = { args: Util.inspect(Common.clean(msg)).replace(/\n/g, '') }
      errinfo.xdefault = Util.inspect(default$)
      var err = ctxt.__make_error(errcode, errinfo)

      return {
        kind: 'error',
        error: err
      }
    }
  }
}


function inward_act_not_found (ctxt, msg) {
  var so = ctxt.options

  if (!ctxt.actmeta) {
    var errcode = 'act_not_found'
    var errinfo = { args: Util.inspect(Common.clean(msg)).replace(/\n/g, '') }

    var err = ctxt.__make_error(errcode, errinfo)

    if (so.trace.unknown) {
      ctxt.seneca.log.warn(
        ctxt.__errlog(
          err, ctxt.__errlog(
            ctxt.actmeta || {}, ctxt.__prior_ctxt, ctxt.__callargs, ctxt.__origargs,
            {
              // kind is act as this log entry relates to an action
              kind: 'act',
              case: 'UNKNOWN'
            })))
    }

    return {
      kind: 'error',
      error: err
    }
  }
}
