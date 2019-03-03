/* Copyright © 2014-2018 Richard Rodger and other contributors, MIT License. */
'use strict'

var Util = require('util')
var Assert = require('assert')

var _ = require('lodash')

var Common = require('./common')

// Internal implementations.
var intern = {}

module.exports = {
  test$: { intern: intern },
  act_cache: outward_act_cache,
  res_object: outward_res_object,
  act_stats: outward_act_stats,
  make_error: outward_make_error,
  announce: outward_announce,
  trace: outward_trace,
  act_error: outward_act_error,
  res_entity: outward_res_entity,
  msg_meta: outward_msg_meta
}

function outward_make_error(ctxt, data) {
  if (!ctxt.options.legacy.error) {
    if (data.res && !data.meta.error && data.res.meta$ && data.res.meta$.err) {
      var res = new Error(data.res.message)
      for (var p in data.res) {
        res[p] = data.res[p]
      }
      data.res = res
    }
  }
}

// Store result in action cache
// TODO: replace with history
function outward_act_cache(ctxt, data) {
  Assert(ctxt.options)

  var so = ctxt.options
  var res = data.res
  var meta = data.meta

  var actid = meta.id
  var private$ = ctxt.seneca.private$

  if (actid != null && so.history.active) {
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
  var stats = private$.stats.act
  var meta = data.meta

  ++stats.done

  if (meta && null == meta.prior) {
    private$.timestats.point(ctxt.duration, ctxt.actdef.pattern)
  }

  var pattern = ctxt.actdef.pattern

  var actstats = (private$.stats.actmap[pattern] =
    private$.stats.actmap[pattern] || {})

  if (meta.error) {
    ++stats.fails
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

  if (void 0 === data.res) {
    data.res = null
  }

  var not_object =
    res != null &&
    !(
      _.isObject(res) ||
      Array.isArray(res) ||
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
    //data.res = outward.error || error(outward.code, outward.info)
    data.res = ctxt.seneca.private$.error('result_not_objarr', {
      pattern: ctxt.actdef.pattern,
      args: Util.inspect(Common.clean(msg)).replace(/\n/g, ''),
      result: res
    })
    data.meta.error = true
  }
}

function outward_announce(ctxt, data) {
  if (!ctxt.actdef) return

  if (_.isFunction(ctxt.seneca.on_act_out)) {
    ctxt.seneca.on_act_out(ctxt.actdef, data.res, data.meta)
  }

  ctxt.seneca.emit('act-out', data.msg, data.res, data.meta)

  ctxt.seneca.log.debug(
    ctxt.actlog(ctxt.actdef, data.msg, data.meta, ctxt.origmsg, {
      kind: 'act',
      case: 'OUT',
      duration: ctxt.duration,
      result: data.res,
      did: ctxt.seneca.did
    })
  )
}

function outward_trace(ctxt, data) {
  var private$ = ctxt.seneca.private$

  var meta = data.meta
  var reply_meta = data.reply_meta

  if (meta && reply_meta) {
    meta.trace = meta.trace || []
    meta.trace.push({
      desc: Common.make_trace_desc(reply_meta),
      trace: reply_meta.trace || []
    })
  }

  var parent_meta = private$.act && private$.act.parent
  if (parent_meta) {
    parent_meta.trace = parent_meta.trace || []
    parent_meta.trace.push({
      desc: Common.make_trace_desc(meta),
      trace: meta.trace || []
    })
  }
}

function outward_msg_meta(ctxt, data) {
  var meta = data.meta
  var reply_meta = data.reply_meta

  if (meta && reply_meta) {
    meta.custom = _.extend(meta.custom, reply_meta.custom)
  }
}

function outward_act_error(ctxt, data) {
  var delegate = ctxt.seneca
  var actdef = ctxt.actdef
  var meta = data.meta

  if (meta.error) {
    data.error_desc = intern.act_error(delegate, ctxt, data)

    if (meta.fatal) {
      // TODO: this should not happen here inside outward processing
      return delegate.die(data.error_desc.err)
    }

    data.has_callback = data.error_desc.call_cb

    if (delegate && _.isFunction(delegate.on_act_err)) {
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

function outward_res_entity(ctxt, data) {
  var delegate = ctxt.seneca
  if (data.res && data.res.entity$ && delegate.make$) {
    data.res = delegate.make$(data.res)
  }
}

intern.act_error = function(instance, ctxt, data) {
  var duration = ctxt.duration
  var act_callpoint = ctxt.callpoint
  var actdef = ctxt.actdef || {}
  var origmsg = ctxt.origmsg
  var reply = ctxt.reply

  var meta = data.meta
  var msg = data.msg

  var opts = instance.options()

  var call_cb = true

  var err = data.res || data.err

  if (!err.seneca) {
    var details = _.extend({}, err.details, {
      message: err.eraro && err.orig ? err.orig.message : err.message,
      pattern: actdef.pattern,
      fn: actdef.func,
      callback: reply,
      instance: instance.toString(),
      callpoint: act_callpoint
    })

    if (opts.legacy.error) {
      err = ctxt.error(err, 'act_execute', details)
    } else {
      var seneca_err = ctxt.error('act_execute', {
        pattern: actdef.pattern,
        message: err.message,
        callpoint: act_callpoint
      })
      delete seneca_err.stack

      err.meta$ = err.meta$ || meta || {}
      err.meta$.data = instance.util.clean(origmsg)

      if (err.meta$.err) {
        var errmeta = _.clone(meta)
        errmeta.err = seneca_err
        err.meta$.err_trace = err.meta$.err_trace || []
        err.meta$.err_trace.push(errmeta)
      } else {
        err.meta$.err = seneca_err
      }
    }
  } else if (
    err.orig &&
    _.isString(err.orig.code) &&
    err.orig.code.indexOf('perm/') === 0
  ) {
    // Special legacy case for seneca-perm
    err = err.orig
  }

  if (opts.legacy.error) {
    err.details = err.details || {}
    err.details.plugin = err.details.plugin || {}
  }

  var entry = ctxt.actlog(actdef, msg, meta, origmsg, {
    // kind is act as this log entry relates to an action
    kind: 'act',
    case: 'ERR',
    duration: duration
  })
  entry = ctxt.errlog(err, entry)

  instance.log.error(entry)
  instance.emit('act-err', msg, err)

  // when fatal$ is set, prefer to die instead
  if ('function' === typeof opts.errhandler && (!msg || !meta.fatal)) {
    call_cb = !opts.errhandler.call(instance, err, err.meta$ || meta)
  }

  return {
    call_cb: call_cb,
    err: err
  }
}
