/* Copyright © 2019-2021 Richard Rodger and other contributors, MIT License. */
'use strict'

const Util = require('util')

const { Ordu } = require('ordu')

const Common = require('./common')
const Inward = require('./inward')
const Act = require('./act')
const { Meta } = require('./meta')

const prior_inward = new Ordu({
  name: 'prior_inward',
})
  .add(Inward.msg_modify)
  // .add(Inward.closed)
  // .add(Inward.act_cache)
  .add(Inward.act_default)
  // .add(Inward.act_not_found)
  // .add(Inward.act_stats)
  // .add(Inward.validate_msg)
  // .add(Inward.warnings)
  .add(Inward.msg_meta)
  // .add(Inward.limit_msg)
  .add(Inward.prepare_delegate)
// .add(Inward.sub)
// .add(Inward.announce)

exports.api_prior = function () {
  const opts = this.options()
  if (null == this.private$.act) {
    // TODO: should be a top level api method: seneca.fail
    throw this.util.error('no_prior_action', { args: arguments })
  }

  // Get definition of prior action
  var priordef = this.private$.act.def.priordef

  var spec = Common.build_message(this, arguments, 'reply:f?', this.fixedargs)

  // TODO: clean sufficiently so that seneca.util.clean not needed
  var msg = spec.msg
  var reply = spec.reply

  if (priordef) {
    if (opts.prior.direct) {
      // console.log('PRIOR DIRECT', msg, reply, priordef)

      let prior_reply = function (err, out, meta) {
        // First arg may be out, not err.
        let prior_err = Util.isError(err) ? err : null
        let prior_out = null == out ? (prior_err ? null : err) : out
        let prior_reply_args = [prior_err, prior_out]

        if (!opts.legacy.meta_arg_remove) {
          prior_reply_args.push(meta)
        }

        return reply.apply(prior_instance, prior_reply_args)
      }

      // const prior_meta = new Act.intern.Meta(this, opts, msg, prior_reply)
      const prior_meta = new Meta(this, opts, msg, prior_reply)
      const prior_instance = Act.intern.make_act_delegate(
        this,
        opts,
        prior_meta,
        priordef
      )

      // Reply annotations.
      prior_reply.seneca = prior_instance

      const ctx = {
        seneca: prior_instance,
        origmsg: msg,
        reply: prior_reply,
        options: opts,
        callpoint: this.private$.callpoint(),
        actdef: priordef,
      }

      const data = { meta: prior_meta, msg: msg, reply: prior_reply }

      const inwardres = prior_inward.execSync(ctx, data)

      if (inwardres.err) {
        throw inwardres.err
      }

      // const inward = inwardres.data

      let prior_action = priordef.func

      let prior_args = [msg, prior_reply]

      if (!opts.legacy.meta_arg_remove) {
        prior_args.push(data.meta)
      }

      prior_action.apply(prior_instance, prior_args)
    } else {
      msg.prior$ = priordef.id
      this.act(msg, reply)
    }
  } else {
    var meta = msg.meta$ || {}
    var out = msg.default$ || meta.dflt || null
    out = null == out ? out : Object.assign({}, out)

    if (opts.legacy.meta_arg_remove) {
      // Non-existence != undefined, so must be a separate call.
      return reply.call(this, null, out)
    } else {
      return reply.call(this, null, out, meta)
    }
  }
}
