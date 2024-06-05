/* Copyright © 2019-2023 Richard Rodger and other contributors, MIT License. */


import Util from 'util'

import { MakeArgu, Open, Skip, One, Empty } from 'gubu'


// const { Ordu } = require('ordu')

// const Common = require('./common')
// const { Inward } = require('./inward')
// const Act = require('./act')
// const { Meta } = require('./meta')

import {
  parse_jsonic,
} from './common'


const Argu = MakeArgu('seneca')


const ActArgu: any = Argu('prior', {
  props: One(Empty(String), Object),
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
    throw this.util.error('no_prior_action', { args: arguments })
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
    let out = msg.default$ || meta.dflt || null
    out = null == out ? out : Object.assign({}, out)
    return reply ? reply.call(this, null, out, meta) : out
  }
}


const Prior = {
  api_prior
}


export {
  Prior
}
