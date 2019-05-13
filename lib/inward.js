/* Copyright © 2010-2019 Richard Rodger and other contributors, MIT License. */
'use strict'

const Util = require('util')

// TODO: remove
const _ = require('lodash')

const Common = require('./common')

const intern = {}

module.exports = {
  msg_modify: inward_msg_modify,
  closed: inward_closed,
  act_cache: inward_act_cache,
  act_default: inward_act_default,
  act_not_found: inward_act_not_found,
  validate_msg: inward_validate_msg,
  warnings: inward_warnings,
  msg_meta: inward_msg_meta,
  limit_msg: inward_limit_msg,
  act_stats: inward_act_stats,
  prepare_delegate: inward_prepare_delegate,
  announce: inward_announce,
  intern: intern
}

function inward_msg_modify(ctxt, data) {
  var meta = data.meta

  if (ctxt.actdef) {
    var fixed = ctxt.actdef.fixed
    var custom = ctxt.actdef.custom

    if (fixed) {
      Object.assign(data.msg, fixed)
    }

    if (custom) {
      meta.custom = meta.custom || {}
      Object.assign(meta.custom, custom)
    }
  }
}

function inward_limit_msg(ctxt, data) {
  var so = ctxt.options
  var meta = data.meta

  if (meta.parents && so.limits.maxparents < meta.parents.length) {
    return {
      kind: 'error',
      code: 'maxparents',
      info: {
        maxparents: so.limits.maxparents,
        numparents: meta.parents.length,
        parents: _.map(
          meta.parents,
          p => p[Common.TRACE_PATTERN] + ' ' + p[Common.TRACE_ACTION]
        ),
        args: Util.inspect(Common.clean(data.msg)).replace(/\n/g, '')
      }
    }
  }
}

function inward_announce(ctxt, data) {
  if (!ctxt.actdef) return

  // Only intended for use in a per-delegate context.
  if (_.isFunction(ctxt.seneca.on_act_in)) {
    ctxt.seneca.on_act_in(ctxt.actdef, data.msg, data.meta)
  }

  ctxt.seneca.emit('act-in', data.msg, null, data.meta)
}

function inward_closed(ctxt, data) {
  if (ctxt.seneca.flags.closed && !data.meta.closing) {
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

  var actstats = (private$.stats.actmap[pattern] =
    private$.stats.actmap[pattern] || {})

  ++actstats.calls
}

function inward_act_default(ctxt, data) {
  var so = ctxt.options
  var msg = data.msg
  var meta = data.meta

  // TODO: existence of pattern action needs own indicator flag
  if (!ctxt.actdef) {
    var default$ = meta.dflt || (!so.strict.find ? {} : meta.dflt)

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
  var meta = data.meta

  var actid = meta.id
  var private$ = ctxt.seneca.private$

  if (actid != null && so.history.active) {
    var actdetails = private$.history.get(actid)

    if (actdetails) {
      private$.stats.act.cache++

      var latest = actdetails.result[actdetails.result.length - 1] || {}

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
  var meta = data.meta

  meta.pattern = ctxt.actdef.pattern
  meta.action = ctxt.actdef.id
  meta.plugin = _.extend(meta.plugin, ctxt.actdef.plugin)
  meta.start = null == meta.start ? ctxt.start : meta.start
  meta.parents = meta.parents || []
  meta.trace = meta.trace || []

  var parent = ctxt.seneca.private$.act && ctxt.seneca.private$.act.parent

  // Use parent custom object if present,
  // otherwise use object provided by caller,
  // otherwise create a new one.
  // This preserves the same custom object ref throughout a call chain.
  var parentcustom = (parent && parent.custom) || meta.custom || {}

  if (parent) {
    meta.parents = meta.parents.concat(parent.parents || [])
    meta.parents.unshift(Common.make_trace_desc(parent))
  }

  meta.custom = Object.assign(
    parentcustom,
    meta.custom,
    ctxt.seneca.fixedmeta && ctxt.seneca.fixedmeta.custom
  )

  // meta.explain is an array that explanation objects can be appended to.
  // The same array is used through the action call tree, and must be provided by
  // calling code at the top level via the explain$ directive.
  if (data.msg.explain$ && Array.isArray(data.msg.explain$)) {
    meta.explain = data.msg.explain$
  } else if (parent && parent.explain) {
    meta.explain = parent.explain
  }

  if (ctxt.seneca.private$.explain) {
    meta.explain = meta.explain || []
    ctxt.seneca.private$.explain.push(meta.explain)
  }
}

function inward_prepare_delegate(ctxt, data) {
  var meta = data.meta

  ctxt.seneca.fixedargs.tx$ = data.meta.tx

  data.reply = data.reply.bind(ctxt.seneca)
  data.reply.seneca = ctxt.seneca

  var reply = data.reply

  // DEPRECATE
  ctxt.seneca.good = function good(out) {
    ctxt.seneca.log.warn(
      'seneca.good is deprecated and will be removed in 4.0.0'
    )
    reply(null, out)
  }

  // DEPRECATE
  ctxt.seneca.bad = function bad(err) {
    ctxt.seneca.log.warn(
      'seneca.bad is deprecated and will be removed in 4.0.0'
    )
    reply(err)
  }

  ctxt.seneca.reply = function reply(err, out) {
    reply(err, out)
  }

  ctxt.seneca.explain = intern.explain.bind(ctxt.seneca, meta)
  if (meta.explain) {
    ctxt.seneca.explain({ explain$: true, msg$: Common.clean(data.msg) })
  }
}

intern.explain = function(meta, entry) {
  var orig_explain = this.explain
  var explain = meta.explain

  if (true === entry || false === entry) {
    return orig_explain.call(this, entry)
  } else if (explain) {
    if (null != entry) {
      if (entry.explain$) {
        entry.explain$ = {
          start: meta.start,
          pattern: meta.pattern,
          action: meta.action,
          id: meta.id,
          instance: meta.instance,
          tag: meta.tag,
          seneca: meta.seneca,
          version: meta.version,
          gate: meta.gate,
          fatal: meta.fatal,
          local: meta.local,
          closing: meta.closing,
          timeout: meta.timeout,
          dflt: meta.dflt,
          custom: meta.custom,
          plugin: meta.plugin,
          prior: meta.prior,
          caller: meta.caller,
          parents: meta.parents,
          remote: meta.remote,
          sync: meta.sync,
          trace: meta.trace,
          sub: meta.sub,
          data: meta.data,
          err: meta.err,
          err_trace: meta.err_trace,
          error: meta.error,
          empty: meta.empty
        }
      }

      explain.push('object' === typeof entry ? entry : { content: entry })
    }
  }

  return explain && this.explain
}
