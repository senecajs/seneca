/* Copyright © 2019-2023 Richard Rodger and other contributors, MIT License. */


import { TaskSpec } from 'ordu'

import { Gubu, MakeArgu, Open, Skip, One, Empty } from 'gubu'


import {
  clean,
  deep,
  each,
  pattern,
  parse_jsonic,
} from './common'


const Argu = MakeArgu('seneca')


const AddArgu: any = Argu('add', {
  props: One(Empty(String), Object),
  moreprops: Skip(Object),
  action: Skip(Function),
  actdef: Skip(Object),
})


function api_add(this: any) {
  let args = AddArgu(arguments)

  args.pattern = Object.assign(
    {},
    args.moreprops ? args.moreprops : null,
    'string' === typeof args.props ?
      parse_jsonic(args.props, 'add_string_pattern_syntax') :
      args.props,
  )

  let ctx = {
    opts: this.options(),
    args,
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


function api_message(this: any, pattern0: any, pattern1: any, action: any) {
  let actfunc = action || pattern1
  const action_wrapper: any =
    null == actfunc
      ? null
      : function(this: any, msg: any, reply: any, meta: any) {
        actfunc.call(this, msg, meta).then(reply).catch(reply)
      }

  if (null != actfunc && null != action_wrapper) {
    if ('' != actfunc.name) {
      Object.defineProperty(action_wrapper, 'name', { value: actfunc.name })
    }

    for (var p in actfunc) {
      action_wrapper[p] = actfunc[p]
    }

    // NOTE: also set properties defined after call to seneca.message
    setImmediate(function() {
      for (var p in actfunc) {
        action_wrapper[p] = actfunc[p]
      }
    })
  }

  if (action) {
    this.add(pattern0, pattern1, action_wrapper)
  }
  else if (action_wrapper) {
    this.add(pattern0, action_wrapper)
  }
  else {
    this.add(pattern0)
  }

  return this
}



const task = {
  translate(spec: TaskSpec) {
    const args = spec.ctx.args
    let raw_pattern = args.pattern

    let pattern = null

    if (false !== raw_pattern.translate$) {

      // Must be exact match to ensure consistent translation
      let translation = spec.ctx.private.translationrouter.find(raw_pattern)

      if (translation) {
        pattern = translation(raw_pattern)
      }
    }

    return {
      // TODO: simple op:set would be faster
      op: 'merge',
      out: {
        pattern,
      },
    }
  },


  prepare(spec: TaskSpec) {
    const args = spec.ctx.args
    let raw_pattern = spec.data.pattern || args.pattern
    let pattern = clean(raw_pattern)

    let action =
      args.action ||
      function default_action(this: any, _msg: any, done: any, meta: any) {
        if (meta) {
          done.call(this, null, meta.dflt || null, meta)
        } else {
          done.call(this, null, null)
        }
      }

    let actdef = deep(args.actdef) || {}

    actdef.raw = deep({}, raw_pattern)

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


  plugin(spec: TaskSpec) {
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


  callpoint(spec: TaskSpec) {
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


  flags(spec: TaskSpec) {
    const actdef = spec.data.actdef
    const pat = spec.data.pattern
    const opts = spec.ctx.opts
    const Jsonic = spec.ctx.instance.util.Jsonic

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

    // if (opts.legacy.actdef) {
    //   actdef.args = deep(pat)
    // }

    // Canonical string form of the action pattern.
    actdef.pattern = pattern(pat)

    // Canonical object form of the action pattern.
    actdef.msgcanon = Jsonic(actdef.pattern)

    // Canonical string form of the action pattern.
    actdef.pattern = pattern(pat)

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


  action(spec: TaskSpec) {
    const actdef = spec.data.actdef
    const action = spec.data.action
    const private$ = spec.ctx.private

    const plugin = actdef.plugin || {}

    const action_name =
      ((null == action.name || '' === action.name) ?
        'action' : action.name)

    actdef.id =
      ((null == plugin.fullname || '' === plugin.fullname) ?
        '' : plugin.fullname + '/') +
      action_name + '/' + private$.next_action_id()

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


  prior(spec: TaskSpec) {
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


  // TODO: accept action.valid to define rules
  rules(spec: TaskSpec) {
    const actdef = spec.data.actdef
    const pattern = spec.data.pattern

    // TODO: provide option for seneca-joi etc to disable Gubu

    let pattern_rules: any = {}
    let external = false // external rule engine
    let prN = 0
    each(actdef.raw, function(v: any, k: string) {
      if (
        null != v &&
        ('object' === typeof v || 'function' === typeof v) &&
        !~k.indexOf('$')
      ) {
        pattern_rules[k] = v
        prN++
        delete pattern[k]

        // Recognize joi
        if (v.$_root) {
          external = true
        }
      }
    })
    actdef.rules = pattern_rules

    if (!external && 0 < prN) {
      // TODO: how to make Closed if specified by user ?
      actdef.gubu = Gubu(Open(pattern_rules))
    }

    return {
      // TODO: simple op:set would be faster
      op: 'merge',
      out: {
        actdef,
      },
    }
  },


  register(spec: TaskSpec) {
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

  modify(spec: TaskSpec) {
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
  make_action_stats: function(actdef: any) {
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
  deferred_modify_action: function(seneca: any, actdef: any) {
    setImmediate(function() {
      each(seneca.private$.action_modifiers, function(actmod: any) {
        actmod.call(seneca, actdef)
      })
    })
  },
})


export {
  api_add,
  api_message,
  task,
}
