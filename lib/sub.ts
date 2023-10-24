/* Copyright © 2020-2023 Richard Rodger and other contributors, MIT License. */
'use strict'

import { MakeArgu, Skip, One, Empty } from 'gubu'


import {
  pattern as common_pattern,
  parse_jsonic,
} from './common'


const Argu = MakeArgu('seneca')


const SubArgu: any = Argu('sub', {
  props: One(Empty(String), Object),
  moreprops: Skip(Object),
  action: Function,
})


// Subscribe to messages.
function api_sub(this: any) {
  const self = this

  // const subargs = Common.parsePattern(self, arguments, 'action:f')

  const args = SubArgu(arguments)

  // TODO: this is duplicated - need to be a util
  args.pattern = Object.assign(
    {},
    args.moreprops ? args.moreprops : null,
    'string' === typeof args.props ?
      parse_jsonic(args.props, 'add_string_pattern_syntax') :
      args.props,
  )


  const raw_pattern = args.pattern
  const action = args.action

  let is_inward = !!raw_pattern.in$
  let is_outward = !!raw_pattern.out$

  if (!is_outward) {
    is_inward = true // Default if nothing specified
  }

  let pattern = raw_pattern

  if (false !== raw_pattern.translate$) {

    // Must be exact match to ensure consistent translation
    let translation = this.private$.translationrouter.find(raw_pattern)

    if (translation) {
      pattern = translation(raw_pattern)
    }
  }

  const sub_pattern = self.util.clean(pattern)

  const routers = [
    is_inward ? self.private$.subrouter.inward : null,
    is_outward ? self.private$.subrouter.outward : null,
  ].filter((r) => r)

  routers.forEach((router) => {
    // Exact match, create if needed
    let sub_actions = router.find(sub_pattern, true)
    if (!sub_actions) {
      router.add(sub_pattern, (sub_actions = []))
      sub_actions.pattern = common_pattern(sub_pattern)
    }
    sub_actions.push(action)
  })

  return self
}

export {
  api_sub
}
