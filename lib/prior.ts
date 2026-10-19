/* Copyright © 2019-2023 Richard Rodger and other contributors, MIT License. */


import { MakeArgu, Skip } from 'shape'

import {
  parse_jsonic,
  message_props_shape,
} from './common'

import { describe_args } from './redact'


const Argu = MakeArgu('seneca')


const ActArgu: any = Argu('prior', {
  props: message_props_shape(),
  moreprops: Skip(Object),
  reply: Skip(Function),
})



// const prior_inward = new Ordu({
//   name: 'prior_inward',
// })
//   .add(Inward.inward_msg_modify)
//   .add(Inward.inward_act_default)
//   .add(Inward.inward_msg_meta)
//   .add(Inward.inward_prepare_delegate)


function api_prior(this: any) {
  if (null == this.private$.act) {
    // TODO: should be a top level api method: seneca.fail
    throw this.util.error('no_prior_action', {
      args: describe_args(this, arguments),
    })
  }

  // Get definition of prior action
  const priordef = this.private$.act.def.priordef


  // var spec = Common.build_message(this, arguments, 'reply:f?', this.fixedargs)
  const spec = ActArgu(arguments)

  // TODO: duplicated, should be utility
  spec.msg = Object.assign(
    {},
    spec.moreprops ? spec.moreprops : null,
    'string' === typeof spec.props ?
      parse_jsonic(spec.props, 'msg_jsonic_syntax') :
      spec.props,
  )


  // TODO: clean sufficiently so that seneca.util.clean not needed
  const msg = spec.msg
  const reply = spec.reply

  if (priordef) {
    msg.prior$ = priordef.id
    return reply ? this.act(msg, reply) : this.post(msg)
  }
  else {
    const meta = msg.meta$ || {}
    const out = copy_default(msg.default$ || meta.dflt || null)
    return reply ? reply.call(this, null, out, meta) : out
  }
}


function api_direct_prior(this: any) {
  if (null == this.private$.act) {
    throw this.util.error('no_prior_action', {
      args: describe_args(this, arguments),
    })
  }

  // Get definition of prior action
  const priordef = this.private$.act.def.priordef

  const spec = ActArgu(arguments)

  spec.msg = Object.assign(
    {},
    spec.moreprops ? spec.moreprops : null,
    'string' === typeof spec.props ?
      parse_jsonic(spec.props, 'msg_jsonic_syntax') :
      spec.props,
  )

  const msg = spec.msg
  const reply = spec.reply

  if (priordef) {
    msg.prior$ = priordef.id
    return this.direct(msg, reply)
  }
  else {
    const meta = msg.meta$ || {}
    const out = copy_default(msg.default$ || meta.dflt || null)
    return reply ? reply.call(this, null, out, meta) : out
  }
}


// The default result when there is no prior action: a shallow copy, so
// that changes to the result do not change the default. Arrays stay arrays.
function copy_default(dflt: any) {
  return null == dflt || 'object' !== typeof dflt ? dflt :
    Array.isArray(dflt) ? dflt.slice() :
      Object.assign({}, dflt)
}


const Prior = {
  api_prior,
  api_direct_prior,
}


export {
  Prior
}
