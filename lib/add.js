/* Copyright © 2019 Richard Rodger and other contributors, MIT License. */
'use strict'

const Common = require('./common')

exports.api_add = function () {
  var self = this
  var private$ = self.private$
  var opts = self.options()
  var args = Common.parsePattern(self, arguments, 'action:f? actdef:o?')

  var raw_pattern = args.pattern
  var pattern = self.util.clean(raw_pattern)

  var action =
    args.action ||
    function default_action(msg, done, meta) {
      done.call(this, null, meta.dflt || null)
    }

  var actdef = self.util.deepextend(args.actdef) || {}

  actdef.raw = Common.deepextend({}, raw_pattern)

  // TODO: change root$ to root as plugin_name should not contain $
  actdef.plugin_name = actdef.plugin_name || 'root$'
  actdef.plugin_fullname =
    actdef.plugin_fullname ||
    actdef.plugin_name +
      ((actdef.plugin_tag === '-' ? void 0 : actdef.plugin_tag)
        ? '$' + actdef.plugin_tag
        : '')

  actdef.plugin = {
    name: actdef.plugin_name,
    tag: actdef.plugin_tag,
    fullname: actdef.plugin_fullname,
  }

  var add_callpoint = private$.callpoint()
  if (add_callpoint) {
    actdef.callpoint = add_callpoint
  }

  actdef.sub = !!raw_pattern.sub$
  actdef.client = !!raw_pattern.client$

  // Deprecate a pattern by providing a string message using deprecate$ key.
  actdef.deprecate = raw_pattern.deprecate$

  actdef.fixed = self.util.Jsonic(raw_pattern.fixed$ || {})
  actdef.custom = self.util.Jsonic(raw_pattern.custom$ || {})

  var strict_add =
    raw_pattern.strict$ && raw_pattern.strict$.add !== null
      ? !!raw_pattern.strict$.add
      : !!opts.strict.add

  var addroute = true

  if (opts.legacy.actdef) {
    actdef.args = Common.deepextend(pattern)
  }

  var action_name =
    null == action.name || '' === action.name ? 'action' : action.name
  actdef.id = action_name + '_' + private$.next_action_id()
  actdef.name = action_name
  actdef.func = action

  // Canonical string form of the action pattern.
  actdef.pattern = Common.pattern(pattern)

  // Canonical object form of the action pattern.
  actdef.msgcanon = self.util.Jsonic(actdef.pattern)

  var priordef = self.find(pattern)

  if (priordef && strict_add && priordef.pattern !== actdef.pattern) {
    // only exact action patterns are overridden
    // use .wrap for pin-based patterns
    priordef = null
  }

  if (priordef) {
    // Clients needs special handling so that the catchall
    // pattern does not submit all patterns into the handle
    if (
      'function' === typeof priordef.handle &&
      ((priordef.client && actdef.client) ||
        (!priordef.client && !actdef.client))
    ) {
      //priordef.handle(args.pattern, action)
      priordef.handle(actdef)
      addroute = false
    } else {
      actdef.priordef = priordef
    }
    actdef.priorpath = priordef.id + ';' + priordef.priorpath
  } else {
    actdef.priorpath = ''
  }

  if (action && actdef && 'function' === typeof action.handle) {
    actdef.handle = action.handle
  }

  private$.stats.actmap[actdef.pattern] =
    private$.stats.actmap[actdef.pattern] || intern.make_action_stats(actdef)

  var pattern_rules = {}
  Common.each(raw_pattern, function (v, k) {
    if ('object' === typeof v && !~k.indexOf('$')) {
      pattern_rules[k] = v
      delete pattern[k]
    }
  })
  actdef.rules = pattern_rules

  if (addroute) {
    self.log.debug({
      kind: 'add',
      case: actdef.sub ? 'SUB' : 'ADD',
      action: actdef.id,
      pattern: actdef.pattern,
      callpoint: private$.callpoint(true),
    })

    private$.actrouter.add(pattern, actdef)
  }

  private$.actdef[actdef.id] = actdef

  intern.deferred_modify_action(self, actdef)

  return self
}

// TODO: write specific test cases for these
const intern = (module.exports.intern = {
  make_action_stats: function (actdef) {
    return {
      id: actdef.id,
      plugin: {
        full: actdef.plugin_fullname,
        name: actdef.plugin_name,
        tag: actdef.plugin_tag,
      },
      prior: actdef.priorpath,
      calls: 0,
      done: 0,
      fails: 0,
      time: {},
    }
  },

  // NOTE: use setImmediate so that action annotations (such as .validate)
  // can be defined after call to seneca.add (for nicer plugin code order).
  deferred_modify_action: function (seneca, actdef) {
    setImmediate(function () {
      Common.each(seneca.private$.action_modifiers, function (actmod) {
        actmod.call(seneca, actdef)
      })
    })
  },
})
