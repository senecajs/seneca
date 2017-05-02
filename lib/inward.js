/* Copyright (c) 2010-2017 Richard Rodger and other contributors, MIT License */
'use strict'


var Util = require('util')
var Assert = require('assert')


var _ = require('lodash')


var Common = require('./common')


module.exports = {
  closed: inward_closed,
  resolve_msg_id: inward_resolve_msg_id,
  act_cache: inward_act_cache,
  act_default: inward_act_default,
  act_not_found: inward_act_not_found,
  validate_msg: inward_validate_msg,
  warnings: inward_warnings,
  msg_meta: inward_msg_meta,
  msg_modify: inward_msg_modify,
  act_stats: inward_act_stats,
  prepare_delegate: inward_prepare_delegate,
  announce: inward_announce
}


function inward_announce (ctxt, data) {
  if (!ctxt.actmeta) return

  if (_.isFunction(ctxt.seneca.on_act_in)) {
    ctxt.seneca.on_act_in(ctxt.actmeta, data.msg)
  }

  ctxt.seneca.emit('act-in', data.msg)
}


function inward_closed (ctxt, data) {
  if (ctxt.seneca.closed && !data.msg.closing$) {
    return {
      kind: 'error',
      code: 'closed',
      info: {
        args: Util.inspect(Common.clean(data.msg)).replace(/\n/g, '')
      }
    }
  }
}


function inward_resolve_msg_id (ctxt, data) {
  var msg = data.msg

  var id_tx = (msg.id$ ||
               msg.actid$ ||
               msg.meta$.id ||
               ctxt.seneca.idgen())
        .split('/')

  var tx =
        id_tx[1] ||
        msg.tx$ ||
        msg.meta$.tx$ ||
        ctxt.seneca.fixedargs.tx$ ||
        ctxt.seneca.idgen()

  var mi = (id_tx[0] || ctxt.seneca.idgen())

  msg.meta$.mi = mi
  msg.meta$.tx = tx
  msg.meta$.id = mi + '/' + tx

  ctxt.seneca.fixedargs.tx$ = tx
}


function inward_act_stats (ctxt) {
  if (!ctxt.actmeta) {
    return
  }

  var private$ = ctxt.seneca.private$
  ++private$.stats.act.calls

  var pattern = ctxt.actmeta.pattern

  var actstats = (private$.stats.actmap[pattern] =
                  private$.stats.actmap[pattern] || {})


  ++actstats.calls
}


function inward_act_default (ctxt, data) {
  var so = ctxt.options
  var msg = data.msg

  // TODO: existence of pattern action needs own indicator flag
  if (!ctxt.actmeta) {
    var default$ = msg.default$ || (!so.strict.find ? {} : msg.default$)

    if (_.isPlainObject(default$) || _.isArray(default$)) {
      return {
        kind: 'result',
        result: default$,
        log: {
          level: 'debug',
          data: {
            kind: 'act',
            case: 'DEFAULT'
          }
        }
      }
    }

    else if (null != default$) {
      return {
        kind: 'error',
        code: 'act_default_bad',
        info: {
          args: Util.inspect(Common.clean(msg)).replace(/\n/g, ''),
          xdefault: Util.inspect(default$)
        }
      }
    }
  }
}


function inward_act_not_found (ctxt, data) {
  var so = ctxt.options
  var msg = data.msg

  if (!ctxt.actmeta) {
    return {
      kind: 'error',
      code: 'act_not_found',
      info: { args: Util.inspect(Common.clean(msg)).replace(/\n/g, '') },
      log: {
        level: so.trace.unknown ? 'warn' : 'debug',
        data: {
          kind: 'act',
          case: 'UNKNOWN'
        }
      }
    }
  }
}


function inward_validate_msg (ctxt, data) {
  var so = ctxt.options
  var msg = data.msg

  Assert(ctxt.actmeta)

  if (!_.isFunction(ctxt.actmeta.validate)) {
    return
  }

  var err = null

  // FIX: this is assumed to be synchronous
  // seneca-parambulator and seneca-joi need to be updated
  ctxt.actmeta.validate(msg, function (verr) {
    err = verr
  })

  if (err) {
    return {
      kind: 'error',
      code: so.legacy.error_codes ? 'act_invalid_args' : 'act_invalid_msg',
      info: {
        pattern: ctxt.actmeta.pattern,
        message: err.message,
        msg: Common.clean(msg),
        error: err
      },
      log: {
        level: so.trace.invalid ? 'warn' : null,
        data: {
          kind: 'act',
          case: 'INVALID'
        }
      }

    }
  }
}


// Check if actid has already been seen, and if action cache is active,
// then provide cached result, if any. Return true in this case.
function inward_act_cache (ctxt, data) {
  var so = ctxt.options
  var msg = data.msg

  var actid = msg.meta$.id
  var private$ = ctxt.seneca.private$

  if (actid != null && so.actcache.active) {
    //var actdetails = private$.actcache.get(actid)
    var actdetails = private$.history.get(actid)

    if (actdetails) {
      private$.stats.act.cache++

      var latest = actdetails.result[actdetails.result.length-1]

      var out = {
        kind: latest.err ? 'error' : 'result',
        result: latest.res || null,
        error: latest.err || null,
        log: {
          level: 'debug',
          data: {
            kind: 'act',
            case: 'CACHE',
            cachetime: latest.when
          }
        }
      }

      ctxt.cached$ = true

      return out
    }
  }
}


function inward_warnings (ctxt, data) {
  var so = ctxt.options
  var msg = data.msg

  Assert(ctxt.actmeta)

  if (so.debug.deprecation && ctxt.actmeta.deprecate) {
    ctxt.seneca.log.warn({
      kind: 'act',
      case: 'DEPRECATED',
      msg: msg,
      pattern: ctxt.actmeta.pattern,
      notice: ctxt.actmeta.deprecate,
      callpoint: ctxt.callpoint
    })
  }
}


function inward_msg_meta (ctxt, data) {
  var msg = data.msg

  Assert(ctxt.actmeta)

  msg.meta$.pattern = ctxt.actmeta.pattern
  msg.meta$.action = ctxt.actmeta.id
  msg.meta$.plugin_name = ctxt.actmeta.plugin_name
  msg.meta$.plugin_tag = ctxt.actmeta.plugin_tag

  msg.meta$.prior = msg.meta$.prior || { chain: [], entry: true, depth: 0 }
  msg.meta$.start = ctxt.start
  msg.meta$.sync = ctxt.sync
}


function inward_msg_modify (ctxt, data) {
  data.msg = _.extend(
    data.msg,
    ctxt.seneca.fixedargs,
    {tx$: data.msg.meta$.tx}
  )

  // remove actid so that user manipulation of msg for subsequent use does
  // not cause inadvertent hit on existing action
  delete data.msg.id$
  delete data.msg.actid$ // legacy alias
}


function inward_prepare_delegate (ctxt, data) {
  Assert(data.reply)

  data.reply = data.reply.bind(ctxt.seneca)
  data.reply.seneca = ctxt.seneca

  var reply = data.reply

  ctxt.seneca.good = function good (out) {
    reply(null, out)
  }

  ctxt.seneca.bad = function bad (err) {
    reply(err)
  }
}
