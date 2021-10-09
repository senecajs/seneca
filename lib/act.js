/* Copyright © 2019 Richard Rodger and other contributors, MIT License. */
'use strict'

const Util = require('util')

const Common = require('./common')

// Perform an action. The properties of the first argument are matched against
// known patterns, and the most specific one wins.
exports.api_act = function () {
  var argsarr = new Array(arguments.length)
  for (var l = 0; l < argsarr.length; ++l) {
    argsarr[l] = arguments[l]
  }

  var self = this
  var opts = self.options()
  var spec = Common.build_message(self, argsarr, 'reply:f?', self.fixedargs)
  var msg = spec.msg
  var reply = spec.reply

  if (opts.debug.act_caller || opts.test) {
    let msgdesc = Util.inspect(this.util.clean(msg)).replace(/\n/g, '')

    msgdesc =
      msgdesc.substring(0, opts.debug.datalen) +
      (opts.debug.datalen < msgdesc.length ? '...' : '')

    msg.caller$ =
      '\n    Action call arguments and location: ' +
      (new Error(msgdesc).stack + '\n')
        .replace(/Error: /, '')
        .replace(/.*\/gate-executor\.js:.*\n/g, '')
        .replace(/.*\/seneca\.js:.*\n/g, '')
        .replace(/.*\/seneca\/lib\/.*\.js:.*\n/g, '')
  }

  intern.do_act(self, opts, msg, reply)
  return self
}

// TODO: write specific test cases for these
const intern = (module.exports.intern = {
  do_act: function (instance, opts, origmsg, origreply) {
    var timedout = false
    var actmsg = intern.make_actmsg(origmsg)
    var meta = new intern.Meta(instance, opts, origmsg, origreply)

    if (meta.gate) {
      instance = instance.delegate()
      instance.private$.ge = instance.private$.ge.gate()
    }

    var actctxt = {
      seneca: instance,
      origmsg: origmsg,
      reply: origreply || Common.noop,
      options: instance.options(),
      callpoint: instance.private$.callpoint(),
    }

    var execspec = {}

    execspec.dn = meta.id

    execspec.fn = function act_fn(done) {
      try {
        intern.execute_action(
          execspec,
          instance,
          opts,
          actctxt,
          actmsg,
          meta,
          function action_reply(err, out, reply_meta) {
            if (!timedout) {
              intern.handle_reply(meta, actctxt, actmsg, err, out, reply_meta)
            }
            done()
          }
        )
      } catch (e) {
        var ex = Util.isError(e) ? e : new Error(Util.inspect(e))
        intern.handle_reply(meta, actctxt, actmsg, ex)
        done()
      }
    }

    execspec.ontm = function act_tm(timeout, start, end) {
      timedout = true

      var timeout_err = Common.error('action_timeout', {
        timeout: timeout,
        start: start,
        end: end,
        message: actmsg,
        pattern: execspec.ctxt.pattern,
        legacy_string: actctxt.options.legacy.timeout_string
          ? '[TIMEOUT] '
          : '',
      })

      intern.handle_reply(meta, actctxt, actmsg, timeout_err)
    }

    execspec.tm = meta.timeout

    instance.private$.ge.add(execspec)
  },

  make_actmsg: function (origmsg) {
    var actmsg = Object.assign({}, origmsg)

    if (actmsg.id$) {
      delete actmsg.id$
    }

    if (actmsg.caller$) {
      delete actmsg.caller$
    }

    if (actmsg.meta$) {
      delete actmsg.meta$
    }

    if (actmsg.prior$) {
      delete actmsg.prior$
    }

    if (actmsg.parents$) {
      delete actmsg.parents$
    }

    // backwards compatibility for Seneca 3.x transports
    if (origmsg.transport$) {
      actmsg.transport$ = origmsg.transport$
    }

    return actmsg
  },

  Meta: function (instance, opts, origmsg, origreply) {
    var id_tx = intern.resolve_msg_id_tx(instance, origmsg)

    var origmeta = origmsg.meta$

    // Only a limited set of meta properties can be fixed
    var fixedmeta = instance.fixedmeta || {}

    this.start = Date.now()
    this.end = null
    this.pattern = null
    this.action = null

    this.mi = id_tx[0]
    this.tx = id_tx[1]
    this.id = id_tx[0] + '/' + id_tx[1]

    this.instance = instance.id
    this.tag = instance.tag
    this.seneca = instance.version
    this.version = '0.1.0'

    this.gate = !!origmsg.gate$ || fixedmeta.gate
    this.fatal = !!origmsg.fatal$ || fixedmeta.fatal
    this.local = !!origmsg.local$ || fixedmeta.local

    this.closing = !!origmsg.closing$ || (origmeta && origmeta.closing)

    this.timeout = Math.max(
      0,
      'number' === typeof origmsg.timeout$ ? origmsg.timeout$ : opts.timeout
    )

    this.dflt = origmsg.default$ || (origmeta && origmeta.dflt)

    // NOTE: do not create object here if not provided explicitly.
    // The parent custom object will be used when available during inward processing.
    // This preserves object ref of custom object, as it is shared over calls
    this.custom = origmsg.custom$ || (origmeta && origmeta.custom) || null

    this.plugin = origmsg.plugin$
    this.prior = origmsg.prior$
    this.caller = origmsg.caller$
    this.parents = origmsg.parents$

    // Only true for arriving messages. Child messages called from an
    // action triggered by a remote message are not considered remote.
    this.remote = !!origmsg.remote$

    this.sync =
      null != origmsg.sync$
        ? !!origmsg.sync$
        : origmeta && null != origmeta.sync
        ? !!origmeta.sync
        : 'function' === typeof origreply

    this.trace = null
    this.sub = null
    this.data = null
    this.err = null
    this.err_trace = null
    this.error = null
    this.empty = null
  },

  resolve_msg_id_tx: function (act_instance, origmsg) {
    var id_tx = (origmsg.id$ || origmsg.actid$ || act_instance.idgen()).split(
      '/'
    )

    id_tx[1] =
      id_tx[1] ||
      origmsg.tx$ ||
      act_instance.fixedargs.tx$ ||
      act_instance.idgen()

    id_tx[0] = id_tx[0] || act_instance.idgen()

    return id_tx
  },

  handle_reply: function (meta, actctxt, actmsg, err, out, reply_meta) {
    meta.end = Date.now()

    var delegate = actctxt.seneca
    var reply = actctxt.reply

    var data = {
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
    actctxt.error = Common.error

    meta.error = Util.isError(data.res)

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
      for (var i = meta.explain.length; i < reply_meta.explain.length; i++) {
        meta.explain.push(reply_meta.explain[i])
      }
    }

    intern.process_outward(actctxt, data, delegate)

    if (data.has_callback) {
      try {
        reply.call(delegate, data.err, data.res, data.meta)
      } catch (thrown_obj) {
        intern.callback_error(delegate, thrown_obj, actctxt, data)
      }
    }
  },

  errlog: Common.make_standard_err_log_entry,
  actlog: Common.make_standard_act_log_entry,

  process_outward: function (actctxt, data) {
    var outward = actctxt.seneca.private$.outward.process(actctxt, data)

    if (outward) {
      if ('result' === outward.kind) {
        data.res = outward.result
      } else {
        // DESIGN: new contract - migrate to this for all inward functions
        if ('sub_outward_action_failed' === outward.code) {
          var info = {
            pattern: actctxt.actdef.pattern,
            msg: data.msg,
            ...(outward.info || {}),
          }
          data.err = Common.error(outward.error, outward.code, info)
        }

        // assume error
        else {
          data.err =
            outward.error ||
            Common.error(
              outward.code || 'invalid-process-outward-code',
              outward.info || {}
            )
        }

        data.meta = data.meta || {}
        data.meta.error = true
      }
    }
  },

  execute_action: function (
    execspec,
    act_instance,
    opts,
    actctxt,
    msg,
    meta,
    reply
  ) {
    var private$ = act_instance.private$
    var actdef = meta.prior
      ? private$.actdef[meta.prior]
      : act_instance.find(msg)
    var delegate = intern.make_act_delegate(act_instance, opts, meta, actdef)

    actctxt.seneca = delegate
    actctxt.actdef = actdef
    execspec.ctxt.pattern = actdef ? actdef.pattern : null

    // TODO: move to a process_inward function
    var data = { meta: meta, msg: msg, reply: reply }
    var inward = private$.inward.process(actctxt, data)

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

    actdef.func.call(delegate, data.msg, data.reply, data.meta)
  },

  make_act_delegate: function (instance, opts, meta, actdef) {
    meta = meta || {}
    actdef = actdef || {}

    var delegate_args = {
      plugin$: {
        full: actdef.plugin_fullname,
        name: actdef.plugin_name,
        tag: actdef.plugin_tag,
      },
    }

    var delegate = instance.delegate(delegate_args)

    var parent_act = instance.private$.act || meta.parent

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
  },

  handle_inward_break: function (inward, act_instance, data, actdef, origmsg) {
    if (!inward) return false

    var msg = data.msg
    var reply = data.reply
    var meta = data.meta

    if ('error' === inward.kind) {
      var err = inward.error

      // DESIGN: new contract - migrate to this for all inward functions
      if ('sub_inward_action_failed' === inward.code) {
        var info = {
          pattern: actdef.pattern,
          msg: data.msg,
          ...(inward.info || {}),
        }
        err = Common.error(err, inward.code, info)
      } else {
        err = err || Common.error(inward.code, inward.info)
      }

      meta.error = true

      if (inward.log && inward.log.level) {
        act_instance.log[inward.log.level](
          intern.errlog(
            err,
            intern.errlog(
              actdef || {},
              meta.prior,
              msg,
              origmsg,
              inward.log.data
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
  },

  callback_error: function (instance, thrown_obj, ctxt, data) {
    var duration = ctxt.duration
    var act_callpoint = ctxt.callpoint
    var actdef = ctxt.actdef || {}
    var origmsg = ctxt.origmsg
    var reply = ctxt.reply

    var meta = data.meta
    var msg = data.msg

    var err = Util.isError(thrown_obj)
      ? thrown_obj
      : new Error(Util.inspect(thrown_obj))

    var opts = instance.options()

    if (!err.seneca) {
      err = Common.error(
        err,
        'act_callback',
        Common.deep({}, err.details, {
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

    instance.emit('act-err', msg, err, data.res)

    if (opts.errhandler) {
      opts.errhandler.call(instance, err, err.meta$)
    }
  },
})
