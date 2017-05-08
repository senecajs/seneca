/* Copyright (c) 2010-2017 Richard Rodger and other contributors, MIT License */
'use strict'

var Util = require('util')
var Assert = require('assert')

var _ = require('lodash')

var Common = require('./common')

module.exports = {
  closed: inward_closed,
  act_cache: inward_act_cache,
  act_default: inward_act_default,
  act_not_found: inward_act_not_found,
  validate_msg: inward_validate_msg,
  warnings: inward_warnings,
  msg_meta: inward_msg_meta,
  limit_msg: inward_limit_msg,
  msg_modify: inward_msg_modify,
  act_stats: inward_act_stats,
  prepare_delegate: inward_prepare_delegate,
  announce: inward_announce
}

function inward_limit_msg(ctxt, data) {
  var so = ctxt.options
  var msg = data.msg

  if (msg.meta$.parents && so.limits.maxparents < msg.meta$.parents.length) {
    return {
      kind: 'error',
      code: 'maxparents',
      info: {
        maxparents: so.limits.maxparents,
        numparents: msg.meta$.parents.length,
        parents: _.map(msg.meta$.parents, p => p[0]),
        args: Util.inspect(Common.clean(data.msg)).replace(/\n/g, '')
      }
    }
  }
}

function inward_announce(ctxt, data) {
  if (!ctxt.actdef) return

  if (_.isFunction(ctxt.seneca.on_act_in)) {
    ctxt.seneca.on_act_in(ctxt.actdef, data.msg)
  }

  ctxt.seneca.emit('act-in', data.msg)
}

function inward_closed(ctxt, data) {
  if (ctxt.seneca.closed && !data.msg.meta$.closing) {
    return {
      kind: 'error',
      code: 'closed',
      info: {
        args: Util.inspect(Common.clean(data.msg)).replace(/\n/g, '')
      }
    }
  }
}

function inward_act_stats(ctxt) {
  if (!ctxt.actdef) {
    return
  }

  var private$ = ctxt.seneca.private$
  ++private$.stats.act.calls

  var pattern = ctxt.actdef.pattern

  var actstats = (private$.stats.actmap[pattern] = private$.stats.actmap[
    pattern
  ] || {})

  ++actstats.calls
}

function inward_act_default(ctxt, data) {
  var so = ctxt.options
  var msg = data.msg

  // TODO: existence of pattern action needs own indicator flag
  if (!ctxt.actdef) {
    var default$ = msg.meta$.dflt || (!so.strict.find ? {} : msg.meta$.dflt)

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
    } else if (null != default$) {
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

function inward_act_not_found(ctxt, data) {
  var so = ctxt.options
  var msg = data.msg

  if (!ctxt.actdef) {
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

function inward_validate_msg(ctxt, data) {
  var so = ctxt.options
  var msg = data.msg

  Assert(ctxt.actdef)

  if (!_.isFunction(ctxt.actdef.validate)) {
    return
  }

  var err = null

  // FIX: this is assumed to be synchronous
  // seneca-parambulator and seneca-joi need to be updated
  ctxt.actdef.validate(msg, function(verr) {
    err = verr
  })

  if (err) {
    return {
      kind: 'error',
      code: so.legacy.error_codes ? 'act_invalid_args' : 'act_invalid_msg',
      info: {
        pattern: ctxt.actdef.pattern,
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
function inward_act_cache(ctxt, data) {
  var so = ctxt.options
  var msg = data.msg

  var actid = msg.meta$.id
  var private$ = ctxt.seneca.private$

  if (actid != null && so.actcache.active) {
    //var actdetails = private$.actcache.get(actid)
    var actdetails = private$.history.get(actid)

    if (actdetails) {
      private$.stats.act.cache++

      var latest = actdetails.result[actdetails.result.length - 1]

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

function inward_warnings(ctxt, data) {
  var so = ctxt.options
  var msg = data.msg

  Assert(ctxt.actdef)

  if (so.debug.deprecation && ctxt.actdef.deprecate) {
    ctxt.seneca.log.warn({
      kind: 'act',
      case: 'DEPRECATED',
      msg: msg,
      pattern: ctxt.actdef.pattern,
      notice: ctxt.actdef.deprecate,
      callpoint: ctxt.callpoint
    })
  }
}

function inward_msg_meta(ctxt, data) {
  var msg = data.msg

  Assert(ctxt.actdef)
  Assert(ctxt.seneca)

  msg.meta$.pattern = ctxt.actdef.pattern
  msg.meta$.action = ctxt.actdef.id
  msg.meta$.plugin = _.extend(msg.meta$.plugin, ctxt.actdef.plugin)

  msg.meta$.start = null == msg.meta$.start ? ctxt.start : msg.meta$.start
  msg.meta$.sync = null == msg.meta$.sync ? ctxt.sync : msg.meta$.sync

  msg.meta$.parents = msg.meta$.parents || []
  msg.meta$.trace = msg.meta$.trace || []

  var parent = ctxt.seneca.private$.act && ctxt.seneca.private$.act.parent

  if (parent) {
    msg.meta$.parents = msg.meta$.parents.concat(parent.parents || [])
    msg.meta$.parents.unshift([
      parent.pattern,
      parent.id,
      parent.instance,
      parent.start,
      parent.end,
      parent.sync,
      parent.instance,
      parent.action
    ])
  }
}

function inward_msg_modify(ctxt, data) {
  data.msg = _.extend(
    data.msg,
    _.omitBy(ctxt.seneca.fixedargs, function(v, p) {
      return '$' == p[p.length - 1]
    })
  )
}

function inward_prepare_delegate(ctxt, data) {
  Assert(data.reply)

  ctxt.seneca.fixedargs.tx$ = data.msg.meta$.tx

  data.reply = data.reply.bind(ctxt.seneca)
  data.reply.seneca = ctxt.seneca

  var reply = data.reply

  // DEPRECATE
  ctxt.seneca.good = function good(out) {
    reply(null, out)
  }

  // DEPRECATE
  ctxt.seneca.bad = function bad(err) {
    reply(err)
  }

  ctxt.seneca.reply = function reply(err, out) {
    reply(err, out)
  }
}
