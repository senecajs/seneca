/* Copyright © 2020 Richard Rodger and other contributors, MIT License. */
'use strict'

const Common = require('./common')

//const errlog = Common.make_standard_err_log_entry

// Subscribe to messages.
exports.api_sub = function() {
  var self = this
  var subargs = Common.parsePattern(self, arguments, 'action:f')
  var pattern = subargs.pattern
  var action = subargs.action

  var is_inward = !!pattern.in$
  var is_outward = !!pattern.out$

  if (!is_outward) {
    is_inward = true // Default if nothing specified
  }

  var sub_pattern = self.util.clean(pattern)

  var routers = [
    is_inward ? self.private$.subrouter.inward : null,
    is_outward ? self.private$.subrouter.outward : null
  ].filter(r => r)

  routers.forEach(router => {
    // Exact match, create if needed
    var sub_actions = router.find(sub_pattern, true)
    if (!sub_actions) {
      router.add(sub_pattern, (sub_actions = []))
      sub_actions.pattern = Common.pattern(sub_pattern)
    }
    sub_actions.push(action)
  })

  return self
}
