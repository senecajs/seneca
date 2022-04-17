/* Copyright © 2020 Richard Rodger and other contributors, MIT License. */
/* $lab:coverage:off$ */
'use strict'

const Uniq: any = require('lodash.uniq')
const Eraro: any = require('eraro')

import Nua from 'nua'
import { Ordu, TaskSpec } from 'ordu'


// TODO: refactor: use.js->plugin.js and contain *_plugin api methods too
const Common: any = require('./common')
const { Print } = require('./print')

/* $lab:coverage:on$ */


const intern = make_intern()


function api_use(callpoint: any, opts: any) {
  const tasks = make_tasks()
  const ordu = new Ordu({ debug: opts.debug })

  ordu.operator('seneca_plugin', intern.op.seneca_plugin)
  ordu.operator('seneca_export', intern.op.seneca_export)
  ordu.operator('seneca_options', intern.op.seneca_options)
  ordu.operator('seneca_complete', intern.op.seneca_complete)

  ordu.add([
    tasks.args,
    tasks.load,
    tasks.normalize,
    tasks.preload,
    { name: 'pre_meta', exec: tasks.meta },
    { name: 'pre_legacy_extend', exec: tasks.legacy_extend },
    tasks.delegate,
    tasks.call_define,
    tasks.options,
    tasks.define,
    { name: 'post_meta', exec: tasks.meta },
    { name: 'post_legacy_extend', exec: tasks.legacy_extend },
    tasks.call_prepare,
    tasks.complete,
  ])

  return {
    use: make_use(ordu, callpoint),
    ordu,
    tasks,
  }
}



interface UseCtx {
  seq: { index: number }
  args: string[]
  seneca: any,
  callpoint: any
}

// TODO: not satisfactory
interface UseData {
  seq: number
  args: string[]
  plugin: any
  meta: any
  delegate: any
  plugin_done: any
  exports: any
  prepare: any
}





function make_use(ordu: any, callpoint: any) {
  let seq = { index: 0 }

  return function use(this: any) {
    let self = this
    let args = [...arguments]

    if (0 === args.length) {
      throw self.error('use_no_args')
    }

    let ctx: UseCtx = {
      seq: seq,
      args: args,
      seneca: this,
      callpoint: callpoint(true)
    }

    let data: UseData = {
      seq: -1,
      args: [],
      plugin: null,
      meta: null,
      delegate: null,
      plugin_done: null,
      exports: {},
      prepare: {},
    }

    async function run() {
      await ordu.exec(ctx, data, {
        done: function(res: any) {
          if (res.err) {
            var err = res.err.seneca ? res.err :
              self.private$.error(res.err, res.err.code)

            err.plugin = err.plugin ||
              (data.plugin ? (data.plugin.fullname || data.plugin.name) :
                args.join(' '))

            err.plugin_callpoint = err.plugin_callpoint || ctx.callpoint

            self.die(err)
          }
        }
      })
    }

    // NOTE: don't wait for result!
    run()

    return self
  }
}

function make_tasks(): any {
  return {
    // TODO: args validation?
    args: (spec: TaskSpec) => {
      let args: any[] = [...spec.ctx.args]

      // Plugin definition function is under property `define`.
      // `init` is deprecated from 4.x
      // TODO: use-plugin expects `init` - update use-plugin to make this customizable
      if (null != args[0] && 'object' === typeof args[0]) {
        args[0].init = args[0].define || args[0].init
      }

      return {
        op: 'merge',
        out: { plugin: { args } }
      }
    },


    load: (spec: TaskSpec) => {
      let args: string[] = spec.data.plugin.args
      let seneca: any = spec.ctx.seneca
      let private$: any = seneca.private$

      // TODO: use-plugin needs better error message for malformed plugin desc
      let desc = private$.use.build_plugin_desc(...args)
      desc.callpoint = spec.ctx.callpoint

      if (private$.ignore_plugins[desc.full]) {
        seneca.log.info({
          kind: 'plugin',
          case: 'ignore',
          plugin_full: desc.full,
          plugin_name: desc.name,
          plugin_tag: desc.tag,
        })

        return {
          op: 'stop',
          why: 'ignore'
        }
      }
      else {
        let plugin: any = private$.use.use_plugin_desc(desc)

        return {
          op: 'merge',
          out: {
            plugin
          }
        }
      }
    },


    normalize: (spec: TaskSpec) => {
      let plugin: any = spec.data.plugin

      let modify: any = {}

      // NOTE: `define` is the property for the plugin definition action.
      // The property `init` will be deprecated in 4.x
      modify.define = plugin.define || plugin.init

      modify.fullname = Common.make_plugin_key(plugin)

      modify.loading = true

      return {
        op: 'merge',
        out: { plugin: modify }
      }
    },


    preload: (spec: TaskSpec) => {
      let seneca: any = spec.ctx.seneca

      let plugin: any = spec.data.plugin

      let so: any = seneca.options()

      // Don't reload plugins if load_once true.
      if (so.system.plugin.load_once) {
        if (seneca.has_plugin(plugin)) {
          return {
            op: 'stop',
            why: 'already-loaded',
            out: {
              plugin: {
                loading: false
              }
            }
          }
        }
      }

      let meta: any = {}

      if ('function' === typeof plugin.define.preload) {
        // TODO: need to capture errors
        meta = plugin.define.preload.call(seneca, plugin) || {}
      }

      let name = meta.name || plugin.name
      let fullname = Common.make_plugin_key(name, plugin.tag)

      return {
        op: 'seneca_plugin',
        out: {
          merge: {
            meta,
            plugin: {
              name,
              fullname
            }
          },
          plugin
        }
      }
    },


    // Handle plugin meta data returned by plugin define function
    meta: (spec: TaskSpec) => {
      let seneca: any = spec.ctx.seneca
      let plugin: any = spec.data.plugin
      let meta: any = spec.data.meta

      let exports: any = {}
      exports[plugin.name] = meta.export || plugin
      exports[plugin.fullname] = meta.export || plugin

      let exportmap: any = meta.exportmap || meta.exports || {}

      Object.keys(exportmap).forEach(k => {
        let v: any = exportmap[k]
        if (void 0 !== v) {
          let exportfullname = plugin.fullname + '/' + k
          exports[exportfullname] = v

          // Also provide exports on untagged plugin name. This is the
          // standard name that other plugins use
          let exportname = plugin.name + '/' + k
          exports[exportname] = v
        }
      })


      if (meta.order) {
        if (meta.order.plugin) {
          let tasks: any[] =
            Array.isArray(meta.order.plugin) ? meta.order.plugin :
              [meta.order.plugin]

          seneca.order.plugin.add(tasks)
          delete meta.order.plugin
        }
      }

      return {
        op: 'seneca_export',
        out: {
          exports
        }
      }
    },


    // NOTE: mutates spec.ctx.seneca
    legacy_extend: (spec: TaskSpec) => {
      let seneca: any = spec.ctx.seneca

      // let plugin: any = spec.data.plugin
      let meta: any = spec.data.meta

      if (meta.extend && 'object' === typeof meta.extend) {
        if ('function' === typeof meta.extend.action_modifier) {
          seneca.private$.action_modifiers.push(meta.extend.action_modifier)
        }

        // FIX: needs to use logging.load_logger
        if ('function' === typeof meta.extend.logger) {
          if (
            !meta.extend.logger.replace &&
            'function' === typeof seneca.private$.logger.add
          ) {
            seneca.private$.logger.add(meta.extend.logger)
          } else {
            seneca.private$.logger = meta.extend.logger
          }
        }
      }

      //seneca.register(plugin, meta)
    },


    delegate: (spec: TaskSpec) => {
      let seneca: any = spec.ctx.seneca
      let plugin: any = spec.data.plugin

      // Adjust Seneca API to be plugin specific.
      let delegate = seneca.delegate({
        plugin$: {
          name: plugin.name,
          tag: plugin.tag,
        },

        fatal$: true,
      })

      delegate.private$ = Object.create(seneca.private$)
      delegate.private$.ge = delegate.private$.ge.gate()

      delegate.die = Common.makedie(delegate, {
        type: 'plugin',
        plugin: plugin.name,
      })

      let actdeflist: any = []

      delegate.add = function() {
        let argsarr = [...arguments]
        let actdef = argsarr[argsarr.length - 1] || {}

        if ('function' === typeof actdef) {
          actdef = {}
          argsarr.push(actdef)
        }

        actdef.plugin_name = plugin.name || '-'
        actdef.plugin_tag = plugin.tag || '-'
        actdef.plugin_fullname = plugin.fullname

        // TODO: is this necessary?
        actdef.log = delegate.log

        actdeflist.push(actdef)

        seneca.add.apply(delegate, argsarr)

        // FIX: should be this
        return delegate
      }

      delegate.__update_plugin__ = function(plugin: any) {
        delegate.context.name = plugin.name || '-'
        delegate.context.tag = plugin.tag || '-'
        delegate.context.full = plugin.fullname || '-'

        actdeflist.forEach(function(actdef: any) {
          actdef.plugin_name = plugin.name || actdef.plugin_name || '-'
          actdef.plugin_tag = plugin.tag || actdef.plugin_tag || '-'
          actdef.plugin_fullname = plugin.fullname || actdef.plugin_fullname || '-'
        })
      }

      delegate.init = function(init: any) {
        // TODO: validate init_action is function

        let pat: any = {
          role: 'seneca',
          plugin: 'init',
          init: plugin.name,
        }

        if (null != plugin.tag && '-' != plugin.tag) {
          pat.tag = plugin.tag
        }

        delegate.add(pat, function(this: any, _: any, reply: any): any {
          init.call(this, reply)
        })
      }

      delegate.context.plugin = plugin
      delegate.context.plugin.mark = Math.random()


      return {
        op: 'merge',
        out: {
          delegate
        }
      }
    },


    call_define: (spec: TaskSpec) => {
      let plugin: any = spec.data.plugin
      let delegate: any = spec.data.delegate

      // FIX: mutating context!!!
      let seq: number = spec.ctx.seq.index++


      let plugin_define_pattern: any = {
        role: 'seneca',
        plugin: 'define',
        name: plugin.name,
        seq: seq,
      }

      if (plugin.tag !== null) {
        plugin_define_pattern.tag = plugin.tag
      }

      return new Promise(resolve => {

        // seneca
        delegate.add(plugin_define_pattern, (_: any, reply: any) => {
          resolve({
            op: 'merge',
            out: { seq, plugin_done: reply }
          })
        })

        delegate.act({
          role: 'seneca',
          plugin: 'define',
          name: plugin.name,
          tag: plugin.tag,
          seq: seq,
          default$: {},
          fatal$: true,
          local$: true,
        })
      })
    },


    options: (spec: TaskSpec) => {
      let plugin: any = spec.data.plugin
      let delegate: any = spec.data.delegate

      let so = delegate.options()

      let fullname = plugin.fullname
      let defaults = plugin.defaults || {}

      let fullname_options = Object.assign(
        {},

        // DEPRECATED: remove in 4
        so[fullname],

        so.plugin[fullname],

        // DEPRECATED: remove in 4
        so[fullname + '$' + plugin.tag],

        so.plugin[fullname + '$' + plugin.tag]
      )

      let shortname = fullname !== plugin.name ? plugin.name : null
      if (!shortname && fullname.indexOf('seneca-') === 0) {
        shortname = fullname.substring('seneca-'.length)
      }

      let shortname_options = Object.assign(
        {},

        // DEPRECATED: remove in 4
        so[shortname],

        so.plugin[shortname],

        // DEPRECATED: remove in 4
        so[shortname + '$' + plugin.tag],

        so.plugin[shortname + '$' + plugin.tag]
      )

      let base: any = {
      }

      // NOTE: plugin error codes are in their own namespaces
      // TODO: test this!!!
      let errors = plugin.errors || (plugin.define && plugin.define.errors)

      if (errors) {
        base.errors = errors
      }

      // TODO: these should deep merge
      let fullopts = Object.assign(
        base,
        shortname_options,
        fullname_options,
        plugin.options || {}
      )

      let resolved_options: any = {}
      let valid = delegate.valid // Gubu validator: https://github.com/rjrodger/gubu

      let err: Error | undefined = void 0

      let defaults_values =
        ('function' === typeof (defaults) && !defaults.gubu) ?
          defaults({ valid }) : defaults

      let optionShape: any

      // TODO: use Gubu.isShape
      if (defaults_values.gubu && defaults_values.gubu.gubu$) {
        optionShape = defaults_values
      }

      // Only define a Gubu shape if defaults are provided.
      else if (0 < Object.keys(defaults_values).length) {
        defaults_values.errors = defaults_values.errors || delegate.valid.Skip({})
        optionShape = delegate.valid(defaults_values)
      }


      if (optionShape) {
        try {
          resolved_options = optionShape(fullopts)
        }
        catch (ex: any) {
          err = ex
        }
      }
      else {
        resolved_options = fullopts
      }

      return {
        op: 'seneca_options',
        err: err,
        out: {
          plugin: {
            options: resolved_options,
          }
        }
      }
    },


    // TODO: move data modification to returned operation
    define: (spec: TaskSpec) => {
      let seneca: any = spec.ctx.seneca
      let plugin: any = spec.data.plugin

      let delegate: any = spec.data.delegate
      let plugin_options: any = spec.data.plugin.options

      delegate.log.debug({
        kind: 'plugin',
        case: 'DEFINE',
        name: plugin.name,
        tag: plugin.tag,
        options: plugin_options,
        callpoint: spec.ctx.callpoint,
      })


      let meta

      meta = intern.define_plugin(
        delegate,
        plugin,
        seneca.util.clean(plugin_options)
      )

      if (meta instanceof Promise) {
        return meta.then(define_finalize_meta)
      }

      return define_finalize_meta(meta)


      function define_finalize_meta(meta: any) {
        plugin.meta = meta

        // legacy api for service function
        if ('function' === typeof meta) {
          meta = { service: meta }
        }

        // Plugin may have changed its own name dynamically

        plugin.name = meta.name || plugin.name
        plugin.tag =
          meta.tag || plugin.tag || (plugin.options && plugin.options.tag$)

        plugin.fullname = Common.make_plugin_key(plugin)
        plugin.service = meta.service || plugin.service

        delegate.__update_plugin__(plugin)

        seneca.private$.plugins[plugin.fullname] = plugin

        seneca.private$.plugin_order.byname.push(plugin.name)
        seneca.private$.plugin_order.byname = Uniq(
          seneca.private$.plugin_order.byname
        )
        seneca.private$.plugin_order.byref.push(plugin.fullname)

        if ('function' === typeof plugin_options.defined$) {
          plugin_options.defined$(plugin)
        }

        // TODO: test this, with preload, explicitly
        return {
          op: 'merge',
          out: {
            meta,
          }
        }
      }
    },

    call_prepare: (spec: TaskSpec) => {
      let plugin: any = spec.data.plugin
      let plugin_options: any = spec.data.plugin.options
      let delegate: any = spec.data.delegate


      // If init$ option false, do not execute init action.
      if (false === plugin_options.init$) {
        return
      }


      let exports = (spec.data as any).exports

      delegate.log.debug({
        kind: 'plugin',
        case: 'INIT',
        name: plugin.name,
        tag: plugin.tag,
        exports: exports,
      })


      return new Promise(resolve => {
        delegate.act(
          {
            role: 'seneca',
            plugin: 'init',
            seq: spec.data.seq,
            init: plugin.name,
            tag: plugin.tag,
            default$: {},
            fatal$: true,
            local$: true,
          },
          function(err: Error, res: any) {
            resolve({
              op: 'merge',
              out: {
                prepare: {
                  err,
                  res
                }
              }
            })
          }
        )
      })
    },

    complete: (spec: TaskSpec) => {
      let prepare: any = spec.data.prepare
      let plugin: any = spec.data.plugin
      let plugin_done: any = spec.data.plugin_done
      let plugin_options: any = spec.data.plugin.options
      let delegate: any = spec.data.delegate
      let so = delegate.options()

      if (prepare) {
        if (prepare.err) {
          let plugin_out: any = {}
          plugin_out.err_code = 'plugin_init'

          plugin_out.plugin_error = prepare.err.message

          if (prepare.err.code === 'action-timeout') {
            plugin_out.err_code = 'plugin_init_timeout'
            plugin_out.timeout = so.timeout
          }

          return {
            op: 'seneca_complete',
            out: {
              plugin: plugin_out
            }
          }
        }

        let fullname = plugin.name + (plugin.tag ? '$' + plugin.tag : '')

        if (so.debug.print && so.debug.print.options) {
          Print.plugin_options(delegate, fullname, plugin_options)
        }

        delegate.log.info({
          kind: 'plugin',
          case: 'READY',
          name: plugin.name,
          tag: plugin.tag,
        })

        if ('function' === typeof plugin_options.inited$) {
          plugin_options.inited$(plugin)
        }
      }

      plugin_done()

      return {
        op: 'seneca_complete',
        out: {
          plugin: {
            loading: false
          }
        }
      }
    }
  }
}


function make_intern() {
  return {
    // TODO: explicit tests for these operators

    op: {
      seneca_plugin: (tr: any, ctx: any, data: any): any => {
        Nua(data, tr.out.merge, { preserve: true })
        ctx.seneca.private$.plugins[data.plugin.fullname] = tr.out.plugin
        return { stop: false }
      },

      seneca_export: (tr: any, ctx: any, data: any): any => {
        // NOTE/plugin/774a: when loading multiple tagged plugins,
        // last plugin wins the plugin name on the exports. This is
        // consistent with general Seneca principal that plugin load
        // order is significant, as later plugins override earlier
        // action patterns. Thus later plugins override exports too.
        Object.assign(data.exports, tr.out.exports)
        Object.assign(ctx.seneca.private$.exports, tr.out.exports)
        return { stop: false }
      },

      seneca_options: (tr: any, ctx: any, data: any): any => {
        Nua(data.plugin, tr.out.plugin, { preserve: true })

        let plugin_fullname: string = data.plugin.fullname
        let plugin_options = data.plugin.options

        let plugin_options_update: any = { plugin: {} }
        plugin_options_update.plugin[plugin_fullname] = plugin_options

        ctx.seneca.options(plugin_options_update)

        return { stop: false }
      },

      seneca_complete: (tr: any, _ctx: any, data: any): any => {
        Nua(data.plugin, tr.out.plugin, { preserve: true })

        if (data.prepare.err) {
          data.delegate.die(
            data.delegate.error(data.prepare.err, data.plugin.err_code, data.plugin))
        }

        return { stop: true }
      },
    },


    define_plugin: function(delegate: any, plugin: any, options: any): any {
      // legacy plugins
      if (plugin.define.length > 1) {
        let fnstr = plugin.define.toString()
        plugin.init_func_sig = (fnstr.match(/^(.*)\r*\n/) || [])[1]
        let ex = delegate.error('unsupported_legacy_plugin', plugin)
        throw ex
      }

      if (options.errors) {
        plugin.eraro = Eraro({
          package: 'seneca',
          msgmap: options.errors,
          override: true,
        })
      }

      let meta

      try {
        meta = plugin.define.call(delegate, options) || {}
      } catch (e: any) {
        Common.wrap_error(e, 'plugin_define_failed', {
          fullname: plugin.fullname,
          message: (
            e.message + (' (' + e.stack.match(/\n.*?\n/)).replace(/\n.*\//g, '')
          ).replace(/\n/g, ''),
          options: options,
          repo: plugin.repo ? ' ' + plugin.repo + '/issues' : '',
        })
      }

      if (meta instanceof Promise) {
        return meta.then(finalize_meta)
      }

      return finalize_meta(meta)


      function finalize_meta(base_meta: any) {
        const meta = 'string' === typeof base_meta
          ? { name: base_meta }
          : base_meta

        meta.options = meta.options || options
        return meta
      }
    },
  }
}


const Plugin = {
  api_use,
  intern,
}


export {
  Plugin
}
