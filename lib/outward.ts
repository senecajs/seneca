/* Copyright © 2014-2022 Richard Rodger and other contributors, MIT License. */
'use strict'

var Util = require('util')

var Common = require('./common')

// Internal implementations.
var intern: any = {}


function outward_make_error(spec: any) {
  const ctx = spec.ctx
  const data = spec.data

  if (!ctx.options.legacy.error) {
    if (data.res && !data.meta.error && data.res.meta$ && data.res.meta$.err) {
      var res: any = new Error(data.res.message)
      for (var p in data.res) {
        res[p] = data.res[p]
      }
      data.res = res
    }
  }
}

// Store result in action cache
// TODO: replace with history
function outward_act_cache(spec: any) {
  const ctx = spec.ctx
  const data = spec.data

  var so = ctx.options
  var res = data.res
  var meta = data.meta

  var actid = meta.id
  var private$ = ctx.seneca.private$

  if (actid != null && so.history.active) {
    var actdetails = private$.history.get(actid)

    if (actdetails) {
      actdetails.result.push({ when: Date.now(), res: res })
    }
  }
}

function outward_act_stats(spec: any) {
  const ctx = spec.ctx
  const data = spec.data

  if (!ctx.actdef || ctx.cached$) {
    return
  }

  var private$ = ctx.seneca.private$
  var stats = private$.stats.act
  var meta = data.meta

  ++stats.done

  // TODO: need to provide guarantees for inputs to avoid superfluous null checks
  if (meta && null == meta.prior) {
    private$.timestats.point(ctx.duration, ctx.actdef.pattern)
  }

  var pattern = ctx.actdef.pattern

  var actstats = (private$.stats.actmap[pattern] =
    private$.stats.actmap[pattern] || {})

  if (meta && meta.error) {
    ++stats.fails
    ++actstats.fails
  } else {
    ++actstats.done
  }
}

function outward_res_object(spec: any) {
  const ctx = spec.ctx
  const data = spec.data

  var so = ctx.options
  var msg = data.msg
  var res = data.res

  if (void 0 === data.res) {
    data.res = null
  }

  var not_object =
    res != null &&
    !(
      (res && 'object' === typeof res) ||
      res instanceof Error ||
      !!res.meta$ ||
      !!res.entity$ ||
      !!res.force$
    )

  // Responding with an Error as data is not allowed.
  // https://github.com/senecajs/seneca/issues/711
  if (data.out instanceof Error) {
    not_object = true
  }

  var not_legacy = !(
    msg.cmd === 'generate_id' ||
    msg.note === true ||
    msg.cmd === 'native' ||
    msg.cmd === 'quickcode'
  )

  if (so.strict.result && not_legacy && not_object) {
    data.res = ctx.seneca.private$.error('result_not_objarr', {
      pattern: ctx.actdef.pattern,
      args: Util.inspect(Common.clean(msg)).replace(/\n/g, ''),
      result: res,
    })
    data.meta.error = true
  }
}

function outward_announce(spec: any) {
  const ctx = spec.ctx
  const data = spec.data

  // if (!ctx.actdef) return

  var meta = data.meta

  if (meta.error) {
    return
  }

  if ('function' === typeof ctx.seneca.on_act_out) {
    ctx.seneca.on_act_out(ctx.actdef, data.res, data.meta)
  }

  ctx.seneca.emit('act-out', data.msg, data.res, data.meta)

  ctx.seneca.log.debug(
    ctx.actlog(ctx.actdef, data.msg, data.meta, ctx.origmsg, {
      kind: 'act',
      case: 'OUT',
      duration: ctx.duration,
      res: data.res,
      did: ctx.seneca.did,
    })
  )
}

function outward_trace(spec: any) {
  const ctx = spec.ctx
  const data = spec.data

  var private$ = ctx.seneca.private$

  var meta = data.meta
  var reply_meta = data.reply_meta

  if (meta && reply_meta) {
    meta.trace = meta.trace || []
    meta.trace.push({
      desc: Common.make_trace_desc(reply_meta),
      trace: reply_meta.trace || [],
    })
  }

  var parent_meta = private$.act && private$.act.parent
  if (parent_meta) {
    parent_meta.trace = parent_meta.trace || []
    parent_meta.trace.push({
      desc: Common.make_trace_desc(meta),
      trace: meta.trace || [],
    })
  }
}

function outward_msg_meta(spec: any) {
  const data = spec.data

  var meta = data.meta
  var reply_meta = data.reply_meta

  if (meta && reply_meta) {
    meta.custom = Object.assign(meta.custom, reply_meta.custom)
  }
}

function outward_act_error(spec: any) {
  const ctx = spec.ctx
  const data = spec.data

  var delegate = ctx.seneca
  var actdef = ctx.actdef
  var meta = data.meta

  if (meta.error) {
    data.error_desc = intern.act_error(delegate, ctx, data)

    if (meta.fatal) {
      // TODO: this should not happen here inside outward processing
      return delegate.die(data.error_desc.err)
    }

    data.has_callback = data.error_desc.call_cb

    if (delegate && 'function' === typeof delegate.on_act_err) {
      // TODO: data.res does not seem right here
      delegate.on_act_err(actdef, data.res, meta)
    }

    data.err = data.error_desc.err
    delete data.err.meta$

    data.res = null

    data.meta = data.error_desc.err.meta$ || data.meta
  } else {
    data.err = null
  }
}

function outward_res_entity(spec: any) {
  const ctx = spec.ctx
  const data = spec.data

  var delegate = ctx.seneca
  if (data.res && data.res.entity$ && delegate.make$) {
    data.res = delegate.make$(data.res)
  }
}

function outward_sub(spec: any) {
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
  var sub_actions_list = private$.subrouter.outward.find(submsg, false, true)

  submsg.out$ = true

  // TODO: document this
  var result = data.res || data.err || null

  for (var alI = 0; alI < sub_actions_list.length; alI++) {
    var sub_actions = sub_actions_list[alI] // Also an array.

    for (var sI = 0; sI < sub_actions.length; sI++) {
      var sub_action = sub_actions[sI]
      try {
        sub_action.call(ctx.seneca, submsg, result, data.meta)
      } catch (sub_err) {
        // DESIGN: this should be all that is needed.
        return {
          op: 'stop',
          out: {
            kind: 'error',
            code: 'sub_outward_action_failed',
            error: sub_err,
          },
        }
      }
    }
  }
}


intern.act_error = function(instance: any, ctx: any, data: any) {
  var duration = ctx.duration
  var act_callpoint = ctx.callpoint
  var actdef = ctx.actdef || {}
  var origmsg = ctx.origmsg
  var reply = ctx.reply

  var meta = data.meta
  var msg = data.msg

  var opts = instance.options()

  var call_cb = true

  var err = data.res || data.err

  if (!err.seneca) {
    var details = Object.assign({}, err.details, {
      message: err.eraro && err.orig ? err.orig.message : err.message,
      pattern: actdef.pattern,
      fn: actdef.func,
      callback: reply,
      instance: instance.toString(),
      callpoint: act_callpoint,
    })

    if (opts.legacy.error) {
      err = ctx.error(err, 'act_execute', details)
    } else {
      var seneca_err = ctx.error('act_execute', {
        pattern: actdef.pattern,
        message: err.message,
        callpoint: act_callpoint,
      })
      delete seneca_err.stack

      err.meta$ = err.meta$ || meta || {}
      err.meta$.data = instance.util.clean(origmsg)

      if (err.meta$.err) {
        var errmeta = Object.assign({}, meta)
        errmeta.err = seneca_err
        err.meta$.err_trace = err.meta$.err_trace || []
        err.meta$.err_trace.push(errmeta)
      } else {
        err.meta$.err = seneca_err
      }
    }
  } else if (
    err.orig &&
    'string' === typeof err.orig.code &&
    err.orig.code.indexOf('perm/') === 0
  ) {
    // Special legacy case for seneca-perm
    err = err.orig
  }

  if (opts.legacy.error) {
    err.details = err.details || {}
    err.details.plugin = err.details.plugin || {}
  }

  var entry = ctx.actlog(actdef, msg, meta, origmsg, {
    // kind is act as this log entry relates to an action
    kind: 'act',
    case: 'ERR',
    duration: duration,
  })
  entry = ctx.errlog(err, entry)

  if (null == err.callpoint) {
    err.callpoint = Common.error.callpoint(err)
  }

  instance.log.error(entry)
  instance.emit('act-err', 'action', msg, meta, err)

  // when fatal$ is set, prefer to die instead
  if ('function' === typeof opts.errhandler && (!msg || !meta.fatal)) {
    call_cb = !opts.errhandler.call(instance, err, err.meta$ || meta)
  }

  return {
    call_cb: call_cb,
    err: err,
  }
}


const Outward = {
  test$: { intern: intern },
  outward_act_cache,
  outward_res_object,
  outward_act_stats,
  outward_make_error,
  outward_announce,
  outward_trace,
  outward_act_error,
  outward_res_entity,
  outward_msg_meta,
  outward_sub,
}


export { Outward }
