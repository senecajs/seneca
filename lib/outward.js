/* Copyright (c) 2010-2017 Richard Rodger and other contributors, MIT License */
'use strict'

var Util = require('util')
var Assert = require('assert')

var _ = require('lodash')

var Common = require('./common')

module.exports = {
  act_cache: outward_act_cache,
  res_object: outward_res_object,
  act_stats: outward_act_stats,
  make_error: outward_make_error
}

function outward_make_error(ctxt, data) {
  if (!ctxt.options.legacy.error) {
    if (
      data.res &&
      !_.isError(data.res) &&
      data.res.meta$ &&
      data.res.meta$.err
    ) {
      var res = new Error(data.res.message)
      for (var p in data.res) {
        res[p] = data.res[p]
      }
      data.res = res
    }
  }
}

// Store result in action cache
function outward_act_cache(ctxt, data) {
  Assert(ctxt.options)

  var so = ctxt.options
  var msg = data.msg
  var res = data.res

  var actid = msg.meta$.id
  var private$ = ctxt.seneca.private$

  if (actid != null && so.actcache.active) {
    var actdetails = private$.history.get(actid)

    if (actdetails) {
      actdetails.result.push({ when: Date.now(), res: res })
    }
  }
}

function outward_act_stats(ctxt, data) {
  if (!ctxt.actdef || ctxt.cached$) {
    return
  }

  var private$ = ctxt.seneca.private$
  ++private$.stats.act.done

  var msg = data.msg

  if (msg && msg.meta$ && msg.meta$.prior && msg.meta$.prior.entry) {
    private$.timestats.point(ctxt.duration, ctxt.actdef.pattern)
  }

  var pattern = ctxt.actdef.pattern

  var actstats = (private$.stats.actmap[pattern] = private$.stats.actmap[
    pattern
  ] || {})

  if (_.isError(data.res)) {
    private$.stats.act.fails++
    ++actstats.fails
  } else {
    ++actstats.done
  }
}

function outward_res_object(ctxt, data) {
  Assert(ctxt.options)

  var so = ctxt.options
  var msg = data.msg
  var res = data.res

  var not_object =
    res != null &&
    !(_.isObject(res) ||
      _.isArray(res) ||
      _.isError(res) ||
      !!res.meta$ ||
      !!res.entity$ ||
      !!res.force$)

  var not_legacy = !(msg.cmd === 'generate_id' ||
    msg.note === true ||
    msg.cmd === 'native' ||
    msg.cmd === 'quickcode')

  if (so.strict.result && not_legacy && not_object) {
    return {
      kind: 'error',
      code: 'result_not_objarr',
      info: {
        pattern: ctxt.actdef.pattern,
        args: Util.inspect(Common.clean(msg)).replace(/\n/g, ''),
        result: res
      }
    }
  }
}
