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

  if(!is_outward) {
    is_inward = true // Default if nothing specified
  } 
  
  var sub_pattern = self.util.clean(pattern)

  var routers = [
    is_inward ? self.private$.subrouter.inward : null,
    is_outward ? self.private$.subrouter.outward : null,
  ].filter(r=>r)

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

/*
exports.api_subx = function() {
  var self = this
  //var private$ = self.private$
  //var opts = self.options()
  //var args = Common.parsePattern(self, arguments, 'action:f? actdef:o?')
  //var raw_pattern = args.pattern
  //var pattern = self.util.clean(raw_pattern)

  var private_sub = self.private$.sub

  var subargs = Common.parsePattern(self, arguments, 'action:f actdef:o?')
  var pattern = subargs.pattern
  if (
    pattern.in$ == null &&
    pattern.out$ == null &&
    pattern.error$ == null &&
    pattern.cache$ == null &&
    pattern.default$ == null &&
    pattern.client$ == null
  ) {
    pattern.in$ = true
  }

  if (!private_sub.handler) {
    private_sub.handler = function handle_sub(msg, result, meta) {
      // only entry msg of prior chain is published
      if (meta && meta.prior) {
        return
      }

      var subfuncs = self.private$.subrouter.find(msg)

      if (subfuncs) {
        meta.sub = subfuncs.pattern
        var actdef = subfuncs.actdef

        subfuncs.forEach(function subfunc(subfunc) {
          try {
            for (
              var stI = 0, stlen = private_sub.tracers.length;
              stI < stlen;
              stI++
            ) {
              private_sub.tracers[stI].call(
                self,
                subfunc.instance$,
                msg,
                result,
                meta,
                actdef
              )
            }

            subfunc.call(subfunc.instance$, msg, result, meta)

            // TODO: this should in it's own function
          } catch (ex) {
            // TODO: not really satisfactory
            var err = self.private$.error(ex, 'sub_function_catch', {
              args: msg,
              result: result
            })
            self.log.error(
              errlog(err, {
                kind: 'sub',
                msg: msg,
                actid: meta.id
              })
            )
          }
        })
      }
    }

    // TODO: other cases

    // Subs are triggered via events
    self.on('act-in', annotate('in$', private_sub.handler))
    self.on('act-out', annotate('out$', private_sub.handler))
  }

  function annotate(prop, handle_sub) {
    return function annotation(origmsg, result, meta) {
      var msg = self.util.deep(origmsg)
      result = self.util.deep(result)
      msg[prop] = true
      handle_sub(msg, result, meta)
    }
  }

  var subs = self.private$.subrouter.find(pattern)
  if (!subs) {
    self.private$.subrouter.add(pattern, (subs = []))
    subs.pattern = Common.pattern(pattern)
    subs.actdef = self.find(pattern)
  }
  subs.push(subargs.action)
  subargs.action.instance$ = self

  return self

}
*/
