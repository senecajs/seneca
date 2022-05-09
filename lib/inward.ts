/* Copyright © 2010-2022 Richard Rodger and other contributors, MIT License. */


import Util from 'util'

const Common = require('./common')


const intern: any = {}


function inward_msg_modify(spec: any) {
  const ctx = spec.ctx
  const data = spec.data

  var meta = data.meta

  if (ctx.actdef) {
    var fixed = ctx.actdef.fixed
    var custom = ctx.actdef.custom

    if (fixed) {
      Object.assign(data.msg, fixed)
    }

    if (custom) {
      meta.custom = meta.custom || {}
      Object.assign(meta.custom, custom)
    }
  }
}


function inward_limit_msg(spec: any) {
  const ctx = spec.ctx
  const data = spec.data

  var so = ctx.options
  var meta = data.meta

  if (meta.parents && so.limits.maxparents < meta.parents.length) {
    return {
      op: 'stop',
      out: {
        kind: 'error',
        code: 'maxparents',
        info: {
          maxparents: so.limits.maxparents,
          numparents: meta.parents.length,
          parents: meta.parents.map(
            (p: any) => p[Common.TRACE_PATTERN] + ' ' + p[Common.TRACE_ACTION]
          ),
          args: Util.inspect(Common.clean(data.msg)).replace(/\n/g, ''),
        },
      },
    }
  }
}


function inward_announce(spec: any) {
  const ctx = spec.ctx
  const data = spec.data

  if (!ctx.actdef) return

  // Only intended for use in a per-delegate context.
  if ('function' === typeof ctx.seneca.on_act_in) {
    ctx.seneca.on_act_in(ctx.actdef, data.msg, data.meta)
  }

  ctx.seneca.emit && ctx.seneca.emit('act-in', data.msg, null, data.meta)
}


// TODO: allow if not a top level call - close gracefully
function inward_closed(spec: any) {
  const ctx = spec.ctx
  const data = spec.data

  if (ctx.seneca.flags.closed && !data.meta.closing) {
    return {
      op: 'stop',
      out: {
        kind: 'error',
        code: 'closed',
        info: {
          args: Util.inspect(Common.clean(data.msg)).replace(/\n/g, ''),
        },
      },
    }
  }
}


function inward_act_stats(spec: any) {
  const ctx = spec.ctx

  if (!ctx.actdef) {
    return
  }

  var private$ = ctx.seneca.private$
  ++private$.stats.act.calls

  var pattern = ctx.actdef.pattern

  var actstats = (private$.stats.actmap[pattern] =
    private$.stats.actmap[pattern] || {})

  ++actstats.calls
}

function inward_act_default(spec: any) {
  const ctx = spec.ctx
  const data = spec.data

  var so = ctx.options
  var msg = data.msg
  var meta = data.meta

  // TODO: existence of pattern action needs own indicator flag
  if (!ctx.actdef) {
    var default$ = meta.dflt || (!so.strict.find ? {} : meta.dflt)

    if (
      null != default$ &&
      ('object' === typeof default$ || Array.isArray(default$))
    ) {
      return {
        op: 'stop',
        out: {
          kind: 'result',
          result: default$,
          log: {
            level: 'debug',
            data: {
              kind: 'act',
              case: 'DEFAULT',
            },
          },
        },
      }
    } else if (null != default$) {
      return {
        op: 'stop',
        out: {
          kind: 'error',
          code: 'act_default_bad',
          info: {
            args: Util.inspect(Common.clean(msg)).replace(/\n/g, ''),
            xdefault: Util.inspect(default$),
          },
        },
      }
    }
  }
}

function inward_act_not_found(spec: any) {
  const ctx = spec.ctx
  const data = spec.data

  var so = ctx.options
  var msg = data.msg

  if (!ctx.actdef) {
    return {
      op: 'stop',
      out: {
        kind: 'error',
        code: 'act_not_found',
        info: { args: Util.inspect(Common.clean(msg)).replace(/\n/g, '') },
        log: {
          level: so.trace.unknown ? 'warn' : 'debug',
          data: {
            kind: 'act',
            case: 'UNKNOWN',
          },
        },
      },
    }
  }
}

function inward_validate_msg(spec: any) {
  const ctx = spec.ctx
  const data = spec.data

  var so = ctx.options
  var msg = data.msg

  var err: any = null

  if ('function' === typeof ctx.actdef.validate) {
    // FIX: this is assumed to be synchronous
    // seneca-parambulator and seneca-joi need to be updated
    ctx.actdef.validate(msg, function(verr: any) {
      err = verr
    })
  } else if (ctx.actdef.gubu) {
    // TODO: gubu option to provide Error without throwing
    // TODO: how to expose gubu builders, Required, etc?
    // TODO: use original msg for error
    try {
      data.msg = ctx.actdef.gubu(msg)
    } catch (e) {
      err = e
    }
  }

  if (err) {
    return {
      op: 'stop',
      out: {
        kind: 'error',
        code: so.legacy.error_codes ? 'act_invalid_args' : 'act_invalid_msg',
        info: {
          pattern: ctx.actdef.pattern,
          message: err.message,
          msg: Common.clean(msg),
          error: err,
        },
        log: {
          level: so.trace.invalid ? 'warn' : null,
          data: {
            kind: 'act',
            case: 'INVALID',
          },
        },
      },
    }
  }
}

// Check if actid has already been seen, and if action cache is active,
// then provide cached result, if any. Return true in this case.
function inward_act_cache(spec: any) {
  const ctx = spec.ctx
  const data = spec.data

  var so = ctx.options
  var meta = data.meta

  var actid = meta.id
  var private$ = ctx.seneca.private$

  if (actid != null && so.history.active) {
    var actdetails = private$.history.get(actid)

    if (actdetails) {
      private$.stats.act.cache++

      var latest = actdetails.result[actdetails.result.length - 1] || {}

      var out = {
        op: 'stop',
        out: {
          kind: latest.err ? 'error' : 'result',
          result: latest.res || null,
          error: latest.err || null,
          log: {
            level: 'debug',
            data: {
              kind: 'act',
              case: 'CACHE',
              cachetime: latest.when,
            },
          },
        },
      }

      ctx.cached$ = true

      return out
    }
  }
}

function inward_warnings(spec: any) {
  const ctx = spec.ctx
  const data = spec.data

  var so = ctx.options
  var msg = data.msg

  if (so.debug.deprecation && ctx.actdef.deprecate) {
    ctx.seneca.log.warn({
      kind: 'act',
      case: 'DEPRECATED',
      msg: msg,
      pattern: ctx.actdef.pattern,
      notice: ctx.actdef.deprecate,
      callpoint: ctx.callpoint,
    })
  }
}

function inward_msg_meta(spec: any) {
  const ctx = spec.ctx
  const data = spec.data

  var meta = data.meta

  meta.pattern = ctx.actdef.pattern
  meta.client_pattern = ctx.actdef.client_pattern
  meta.action = ctx.actdef.id
  meta.plugin = Object.assign({}, meta.plugin, ctx.actdef.plugin)
  meta.start = null == meta.start ? ctx.start : meta.start
  meta.parents = meta.parents || []
  meta.trace = meta.trace || []

  var parent = ctx.seneca.private$.act && ctx.seneca.private$.act.parent

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
    ctx.seneca.fixedmeta && ctx.seneca.fixedmeta.custom
  )

  // meta.explain is an array that explanation objects can be appended to.
  // The same array is used through the action call tree, and must be provided by
  // calling code at the top level via the explain$ directive.
  if (data.msg.explain$ && Array.isArray(data.msg.explain$)) {
    meta.explain = data.msg.explain$
  } else if (parent && parent.explain) {
    meta.explain = parent.explain
  }

  if (ctx.seneca.private$.explain) {
    meta.explain = meta.explain || []
    ctx.seneca.private$.explain.push(meta.explain)
  }
}

function inward_prepare_delegate(spec: any) {
  const ctx = spec.ctx
  const data = spec.data

  const meta = data.meta
  const plugin = ctx.seneca.private$.plugins[meta.plugin.fullname]

  if (plugin) {
    ctx.seneca.plugin = plugin
    ctx.seneca.shared = plugin.shared
  }

  ctx.seneca.fixedargs.tx$ = data.meta.tx

  data.reply = data.reply.bind(ctx.seneca)
  data.reply.seneca = ctx.seneca

  const reply = data.reply

  // DEPRECATE
  ctx.seneca.good = function good(out: any) {
    ctx.seneca.log.warn(
      'seneca.good is deprecated and will be removed in 4.0.0'
    )
    reply(null, out)
  }

  // DEPRECATE
  ctx.seneca.bad = function bad(err: any) {
    ctx.seneca.log.warn('seneca.bad is deprecated and will be removed in 4.0.0')
    reply(err)
  }

  ctx.seneca.reply = function reply(err: any, out: any) {
    reply(err, out)
  }

  ctx.seneca.explain = intern.explain.bind(ctx.seneca, meta)
  if (meta.explain) {
    ctx.seneca.explain({ explain$: true, msg$: Common.clean(data.msg) })
  }
}

function inward_sub(spec: any) {
  const ctx = spec.ctx
  const data = spec.data

  var meta = data.meta
  var private$ = ctx.seneca.private$

  // Only entry msg of prior chain is published
  if (meta.prior) {
    return
  }

  var submsg = ctx.seneca.util.clean(data.msg)

  // Find all subscription matches, even partial.
  // Example: a:1,b:2 matches subs for a:1; a:1,b:1; b:1
  var sub_actions_list = private$.subrouter.inward.find(submsg, false, true)

  submsg.in$ = true

  for (var alI = 0; alI < sub_actions_list.length; alI++) {
    var sub_actions = sub_actions_list[alI] // Also an array.

    for (var sI = 0; sI < sub_actions.length; sI++) {
      var sub_action = sub_actions[sI]

      try {
        sub_action.call(ctx.seneca, submsg, null, data.meta)
      } catch (sub_err) {
        // DESIGN: this should be all that is needed.
        return {
          op: 'stop',
          out: {
            kind: 'error',
            code: 'sub_inward_action_failed',
            error: sub_err,
          },
        }
      }
    }
  }
}

intern.explain = function(meta: any, entry: any) {
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
          empty: meta.empty,
        }
      }

      explain.push(
        entry && 'object' === typeof entry ? entry : { content: entry }
      )
    }
  }

  return explain && this.explain
}



let Inward = {
  inward_msg_modify,
  inward_closed,
  inward_act_cache,
  inward_act_default,
  inward_act_not_found,
  inward_validate_msg,
  inward_warnings,
  inward_msg_meta,
  inward_limit_msg,
  inward_act_stats,
  inward_prepare_delegate,
  inward_announce,
  inward_sub,
  intern,
}


export { Inward }
