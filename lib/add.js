/* Copyright © 2019 Richard Rodger and other contributors, MIT License. */
'use strict'

const Jsonic = require('jsonic')
const Common = require('./common')

exports.api_add = function () {
  let ctx = {
    opts: this.options(),
    args: Common.parsePattern(this, arguments, 'action:f? actdef:o?'),
    private: this.private$,
    instance: this,
  }

  let data = {
    actdef: null,
    pattern: null,
    action: null,
    strict_add: null,
    addroute: null,
  }

  // Senecca.order.add tasks are defined in main seneca file.
  let res = this.order.add.execSync(ctx, data)
  if (res.err) {
    throw res.err
  }

  return this
}

exports.task = {
  prepare(spec) {
    const args = spec.ctx.args

    let raw_pattern = args.pattern
    let pattern = Common.clean(raw_pattern)

    let action =
      args.action ||
      function default_action(msg, done, meta) {
        if (meta) {
          done.call(this, null, meta.dflt || null, meta)
        } else {
          done.call(this, null, null)
        }
      }

    let actdef = Common.deep(args.actdef) || {}

    actdef.raw = Common.deep({}, raw_pattern)

    return {
      // TODO: simple op:set would be faster
      op: 'merge',
      out: {
        actdef,
        action,
        pattern,
      },
    }
  },

  plugin(spec) {
    const actdef = spec.data.actdef

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

    return {
      // TODO: simple op:set would be faster
      op: 'merge',
      out: {
        actdef,
      },
    }
  },

  callpoint(spec) {
    const private$ = spec.ctx.private
    const actdef = spec.data.actdef

    let add_callpoint = private$.callpoint()
    if (add_callpoint) {
      actdef.callpoint = add_callpoint
    }

    return {
      // TODO: simple op:set would be faster
      op: 'merge',
      out: {
        actdef,
      },
    }
  },

  flags(spec) {
    const actdef = spec.data.actdef
    const pattern = spec.data.pattern
    const opts = spec.ctx.opts

    actdef.sub = !!actdef.raw.sub$
    actdef.client = !!actdef.raw.client$

    // Deprecate a pattern by providing a string message using deprecate$ key.
    actdef.deprecate = actdef.raw.deprecate$

    actdef.fixed = Jsonic(actdef.raw.fixed$ || {})
    actdef.custom = Jsonic(actdef.raw.custom$ || {})

    var strict_add =
      actdef.raw.strict$ && actdef.raw.strict$.add !== null
        ? !!actdef.raw.strict$.add
        : !!opts.strict.add

    if (opts.legacy.actdef) {
      actdef.args = Common.deep(pattern)
    }

    // Canonical string form of the action pattern.
    actdef.pattern = Common.pattern(pattern)

    // Canonical object form of the action pattern.
    actdef.msgcanon = Jsonic(actdef.pattern)

    // Canonical string form of the action pattern.
    actdef.pattern = Common.pattern(pattern)

    // Canonical object form of the action pattern.
    actdef.msgcanon = Jsonic(actdef.pattern)

    return {
      // TODO: simple op:set would be faster
      op: 'merge',
      out: {
        actdef,
        strict_add,
      },
    }
  },

  action(spec) {
    const actdef = spec.data.actdef
    const action = spec.data.action
    const private$ = spec.ctx.private

    var action_name =
      null == action.name || '' === action.name ? 'action' : action.name
    actdef.id = action_name + '_' + private$.next_action_id()
    actdef.name = action_name
    actdef.func = action

    if ('function' === typeof action.handle) {
      actdef.handle = action.handle
    }

    return {
      // TODO: simple op:set would be faster
      op: 'merge',
      out: {
        actdef,
      },
    }
  },

  prior(spec) {
    const actdef = spec.data.actdef
    const pattern = spec.data.pattern
    const strict_add = spec.data.strict_add
    const instance = spec.ctx.instance

    let addroute = true

    var priordef = instance.find(pattern)

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

    return {
      // TODO: simple op:set would be faster
      op: 'merge',
      out: {
        actdef,
        addroute,
      },
    }
  },

  rules(spec) {
    const actdef = spec.data.actdef
    const pattern = spec.data.pattern

    var pattern_rules = {}
    Common.each(actdef.raw, function (v, k) {
      if (v && 'object' === typeof v && !~k.indexOf('$')) {
        pattern_rules[k] = v
        delete pattern[k]
      }
    })
    actdef.rules = pattern_rules

    return {
      // TODO: simple op:set would be faster
      op: 'merge',
      out: {
        actdef,
      },
    }
  },

  register(spec) {
    const actdef = spec.data.actdef
    const pattern = spec.data.pattern
    const addroute = spec.data.addroute

    const private$ = spec.ctx.private
    const instance = spec.ctx.instance

    if (addroute) {
      instance.log.debug({
        kind: 'add',
        case: actdef.sub ? 'SUB' : 'ADD',
        action: actdef.id,
        pattern: actdef.pattern,
        callpoint: private$.callpoint(true),
      })

      private$.actrouter.add(pattern, actdef)
    }

    private$.stats.actmap[actdef.pattern] =
      private$.stats.actmap[actdef.pattern] || intern.make_action_stats(actdef)

    private$.actdef[actdef.id] = actdef

    return {
      op: 'next',
    }
  },

  modify(spec) {
    const actdef = spec.data.actdef
    const instance = spec.ctx.instance

    intern.deferred_modify_action(instance, actdef)

    return {
      op: 'next',
    }
  },
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
