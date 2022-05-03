/* Copyright © 2019-2021 Richard Rodger and other contributors, MIT License. */
'use strict'


import type {
  ActDef
} from './types'


import { Meta } from './meta'


import {
  isError,
  build_message,
  inspect,
  noop,
  error,
  deep,
  msgstr,
  make_standard_err_log_entry,
  make_standard_act_log_entry,
} from './common'



// Perform an action. The properties of the first argument are matched against
// known patterns, and the most specific pattern wins.
function act(this: any, ...args: any[]) {
  const instance = this
  const opts = instance.options()
  const spec = build_message(instance, args, 'reply:f?', instance.fixedargs)
  const msg = spec.msg
  const reply = spec.reply

  if (opts.debug.act_caller || opts.test) {
    msg.caller$ =
      '\n    Action call arguments and location: ' +
      (new Error(msgstr(msg, opts.debug.datalen)).stack + '\n')
        .replace(/Error: /, '')
        .replace(/.*\/gate-executor\.js:.*\n/g, '')
        .replace(/.*\/seneca\.js:.*\n/g, '')
        .replace(/.*\/seneca\/lib\/.*\.js:.*\n/g, '')
  }

  intern.do_act(instance, opts, msg, reply)
  return instance
}


// Promisified act.
function post(this: any, ...args: any[]) {
  const seneca = this
  return new Promise((res: any, rej: any) => {
    seneca.act(...args, function(err: Error, out: any) {
      return err ? rej(err) : res(out)
    })
  })
}


function do_act(instance: any, opts: any, origmsg: any, origreply: any) {
  let timedout = false
  const actmsg = intern.make_actmsg(origmsg)
  const meta = new Meta(instance, opts, origmsg, origreply)

  if (meta.gate) {
    instance = instance.delegate()
    instance.private$.ge = instance.private$.ge.gate()
  }

  const actctxt = {
    seneca: instance,
    origmsg: origmsg,
    reply: origreply || noop,
    options: instance.options(),
    callpoint: instance.private$.callpoint(),
  }

  const execspec: any = {}

  execspec.dn = meta.id

  execspec.fn = function act_fn(done: any) {
    try {
      intern.execute_action(
        execspec,
        instance,
        opts,
        actctxt,
        actmsg,
        meta,
        function action_reply(err: any, out: any, reply_meta: any) {
          if (!timedout) {
            intern.handle_reply(
              opts,
              meta,
              actctxt,
              actmsg,
              err,
              out,
              reply_meta
            )
          }
          done()
        }
      )
    } catch (e) {
      const ex = isError(e) ? e : new Error(inspect(e))
      intern.handle_reply(opts, meta, actctxt, actmsg, ex)
      done()
    }
  }

  execspec.ontm = function act_tm(timeout: any, start: any, end: any) {
    timedout = true

    const timeout_err = error('action_timeout', {
      timeout: timeout,
      start: start,
      end: end,
      message: actmsg,
      pattern: execspec.ctxt.pattern,
      legacy_string: '',
    })

    intern.handle_reply(opts, meta, actctxt, actmsg, timeout_err)
  }

  execspec.tm = meta.timeout

  instance.private$.ge.add(execspec)
}


function make_actmsg(origmsg: any) {
  const actmsg = Object.assign({}, origmsg)

  delete actmsg.id$
  delete actmsg.caller$
  delete actmsg.meta$
  delete actmsg.prior$
  delete actmsg.parents$

  return actmsg
}


function handle_reply(
  opts: any,
  meta: any,
  actctxt: any,
  actmsg: any,
  err: any,
  out?: any,
  reply_meta?: any
) {
  meta.end = Date.now()

  const delegate = actctxt.seneca
  const reply = actctxt.reply

  const data = {
    meta: meta,
    msg: actmsg,
    res: err || out,
    reply_meta: reply_meta,
    has_callback: true,
    err: err || null,
    out: out || null,
  }

  actctxt.duration = meta.end - meta.start
  actctxt.actlog = intern.actlog
  actctxt.errlog = intern.errlog
  actctxt.error = error

  meta.error = isError(data.res)

  // A nasty edge case
  if (!meta.error && data.res === data.err) {
    data.err = null
  }

  // Add any additional explain items from responder
  if (
    meta.explain &&
    reply_meta &&
    reply_meta.explain &&
    meta.explain.length < reply_meta.explain.length
  ) {
    for (let i = meta.explain.length; i < reply_meta.explain.length; i++) {
      meta.explain.push(reply_meta.explain[i])
    }
  }

  // intern.process_outward(actctxt, data, delegate)
  intern.process_outward(actctxt, data)

  if (data.has_callback) {
    try {
      if (opts.legacy.meta_arg_remove) {
        // Non-existence != undefined, so must be a separate call.
        reply.call(delegate, data.err, data.res)
      } else {
        reply.call(delegate, data.err, data.res, data.meta)
      }
    } catch (thrown_obj) {
      intern.callback_error(delegate, thrown_obj, actctxt, data)
    }
  }
}


function process_outward(actctxt: any, data: any) {
  const act_instance = actctxt.seneca
  const outwardres = act_instance.order.outward.execSync(actctxt, data)

  if (outwardres.err) {
    throw outwardres.err
  }

  const outward = outwardres.data

  if (null != outward.kind) {
    if ('sub_outward_action_failed' === outward.code) {
      const info = {
        pattern: actctxt.actdef.pattern,
        msg: data.msg,
        ...(outward.info || {}),
      }
      data.err = error(outward.error, outward.code, info)
    }

    // assume error
    else {
      data.err =
        outward.error ||
        error(
          outward.code || 'invalid-process-outward-code',
          outward.info || {}
        )
    }

    data.meta = data.meta || {}
    data.meta.error = true
  }
}


function execute_action(
  execspec: any,
  act_instance: any,
  opts: any,
  actctxt: any,
  msg: any,
  meta: any,
  reply: any
) {
  const private$ = act_instance.private$
  const actdef: ActDef = meta.prior
    ? private$.actdef[meta.prior]
    : act_instance.find(msg)
  const delegate = intern.make_act_delegate(act_instance, opts, meta, actdef)

  actctxt.seneca = delegate
  actctxt.actdef = actdef
  execspec.ctxt.pattern = actdef ? actdef.pattern : null

  // TODO: move to a process_inward function
  const data: any = { meta: meta, msg: msg, reply: reply }

  const inwardres = act_instance.order.inward.execSync(actctxt, data)

  if (inwardres.err) {
    throw inwardres.err
  }

  const inward = inwardres.data

  if (
    intern.handle_inward_break(
      inward,
      act_instance,
      data,
      actdef,
      actctxt.origmsg
    )
  ) {
    return
  }

  if (!actdef.sub) {
    delegate.log.debug(
      intern.actlog(actdef, msg, meta, actctxt.origmsg, {
        kind: 'act',
        case: 'IN',
        did: delegate.did,
      })
    )
  }

  data.id = data.meta.id
  data.result = []
  data.timelimit = Date.now() + data.meta.timeout

  if (opts.history.active) {
    private$.history.add(data)
  }

  if (opts.legacy.meta) {
    data.msg.meta$ = meta
  }

  if (opts.legacy.meta_arg_remove) {
    // Non-existence != undefined, so must be a separate call.
    actdef.func.call(delegate, data.msg, data.reply)
  } else {
    actdef.func.call(delegate, data.msg, data.reply, data.meta)
  }
}


function make_act_delegate(
  instance: any,
  _opts: any,
  meta: any,
  actdef: any
) {
  meta = meta || {}
  actdef = actdef || {}

  const delegate_args = {
    plugin$: {
      full: actdef.plugin_fullname,
      name: actdef.plugin_name,
      tag: actdef.plugin_tag,
    },
  }

  const delegate = instance.delegate(delegate_args)

  const parent_act = instance.private$.act || meta.parent

  delegate.private$.act = {
    parent: parent_act && parent_act.meta,
    meta: meta,
    def: actdef,
  }

  // special overrides
  if (meta.tx) {
    delegate.fixedargs.tx$ = meta.tx
  }

  return delegate
}


function handle_inward_break(
  inward: any,
  act_instance: any,
  data: any,
  actdef: any,
  origmsg: any
) {
  if (!inward) return false

  const msg = data.msg
  const reply = data.reply
  const meta = data.meta

  if ('error' === inward.kind) {
    let err = inward.error

    // DESIGN: new contract - migrate to this for all inward functions
    if ('sub_inward_action_failed' === inward.code) {
      const info = {
        pattern: actdef.pattern,
        msg: data.msg,
        ...(inward.info || {}),
      }
      err = error(err, inward.code, info)
    } else {
      err = err || error(inward.code, inward.info)
    }

    meta.error = true

    if (inward.log && inward.log.level) {
      act_instance.log[inward.log.level](
        intern.errlog(
          err,
          intern.errlog(
            actdef || {},
            meta.prior,
          )
        )
      )
    }

    reply.call(act_instance, err)
    return true
  } else if ('result' === inward.kind) {
    if (inward.log && inward.log.level) {
      act_instance.log[inward.log.level](
        intern.actlog(actdef || {}, msg, meta, origmsg, inward.log.data)
      )
    }

    reply.call(act_instance, null, inward.result)
    return true
  }
}


function callback_error(
  instance: any,
  thrown_obj: any,
  ctxt: any,
  data: any
) {
  const duration = ctxt.duration
  const act_callpoint = ctxt.callpoint
  const actdef = ctxt.actdef || {}
  const origmsg = ctxt.origmsg
  const reply = ctxt.reply

  const meta = data.meta
  const msg = data.msg

  let err = isError(thrown_obj)
    ? thrown_obj
    : new Error(inspect(thrown_obj))

  const opts = instance.options()

  if (!err.seneca) {
    err = error(
      err,
      'act_callback',
      deep({}, err.details, {
        message: err.message,
        pattern: actdef.pattern,
        fn: actdef.func,
        callback: reply,
        instance: instance.toString(),
        callpoint: act_callpoint,
      })
    )
  }

  instance.log.error(
    intern.actlog(actdef, msg, meta, origmsg, {
      // kind is act as this log entry relates to an action
      kind: 'act',
      case: 'ERR',
      info: err.message,
      code: err.code,
      err: err,
      duration: duration,
      did: instance.did,
    })
  )

  instance.emit && instance.emit('act-err', msg, err, data.res)

  if (opts.errhandler) {
    opts.errhandler.call(instance, err, err.meta$)
  }
}


// TODO: write specific test cases for these
const intern = {
  do_act,
  make_actmsg,
  handle_reply,
  process_outward,
  execute_action,
  make_act_delegate,
  handle_inward_break,
  callback_error,
  errlog: make_standard_err_log_entry,
  actlog: make_standard_act_log_entry,
}


const Act = {
  act,
  post,
  intern,
}


export {
  Act
}
