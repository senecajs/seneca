/* Copyright © 2020 Richard Rodger and other contributors, MIT License. */
'use strict'

const Common = require('./common')


// Subscribe to messages.
exports.api_sub = function() {
  const self = this
  const subargs = Common.parsePattern(self, arguments, 'action:f')
  const pattern = subargs.pattern
  const action = subargs.action

  let is_inward = !!pattern.in$
  let is_outward = !!pattern.out$

  if (!is_outward) {
    is_inward = true // Default if nothing specified
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
      sub_actions.pattern = Common.pattern(sub_pattern)
    }
    sub_actions.push(action)
  })

  return self
}
