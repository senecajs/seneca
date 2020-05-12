/* Copyright © 2020 Richard Rodger and other contributors, MIT License. */
'use strict'

//import { make_plugin_key } from './common.js'

import { Ordu } from 'ordu'


// TODO: refactor: use.js->plugin.js and contain *_plugin api methods too
const Common: any = require('./common')
//import * as Common from './common.js'



exports.api_use = api_use


function api_use(callpoint: any) {
  const exec = make_exec()
  const ordu = new Ordu()

  ordu.add(exec.args)
  ordu.add(exec.load)
  ordu.add(exec.normalize)
  ordu.add(exec.preload)
  ordu.add(exec.exports)

  return {
    use: make_use(ordu, callpoint),
    ordu,
    exec,
  }
}



interface UseCtx {
  args: string[]
  seneca: any,
  callpoint: any
}

// TODO: not satisfactory
interface UseData {
  args: string[]
  plugin: any
  preload: any
}

interface UseSpec {
  ctx: UseCtx
  data: UseData
}





function make_use(ordu: any, callpoint: any) {
  return function use() {
    var self = this

    let ctx: UseCtx = {
      args: [...arguments],
      seneca: this,
      callpoint: callpoint(true)
    }
    let data: UseData = {
      args: [],
      plugin: null,
      preload: null,
    }

    // NOTE: don't wait for result!
    ordu.exec(ctx, data, {
      done: function(res: any) {
        // console.log('RES', res)
        if (res.err) {
          self.die(self.private$.error(res.err, 'plugin_' + res.err.code))
        }
      }
    })

    return self
  }
}

function make_exec(): any {
  return {
    args: (spec: UseSpec) => {
      let args: any[] = [...spec.ctx.args]

      // DEPRECATED: Remove when Seneca >= 4.x
      // Allow chaining with seneca.use('options', {...})
      // see https://github.com/rjrodger/seneca/issues/80
      if ('options' === args[0]) {
        spec.ctx.seneca.options(args[1])
        return {
          op: 'stop',
          why: 'legacy-options'
        }
      }

      // Plugin definition function is under property `define`.
      // `init` is deprecated from 4.x
      // TODO: use-plugin expects `init` - update use-plugin to make this customizable
      if (null != args[0] && 'object' === typeof args[0]) {
        args[0].init = args[0].define || args[0].init
      }


      return {
        op: 'merge',
        out: { args }
      }
    },


    load: (spec: UseSpec) => {
      let args: string[] = spec.data.args
      let seneca: any = spec.ctx.seneca
      let private$: any = seneca.private$

      // TODO: use-plugin needs better error message for malformed plugin desc
      var desc = private$.use.build_plugin_desc(...args)

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
          out: { plugin }
        }
      }
    },


    normalize: (spec: UseSpec) => {
      let plugin: any = spec.data.plugin

      var modify: any = {}

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


    preload: (spec: UseSpec) => {
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

      // TODO: how to handle this properly?
      seneca.private$.plugins[plugin.fullname] = plugin

      let preload: any = {}

      if ('function' === typeof plugin.define.preload) {
        preload.meta = plugin.define.preload.call(seneca, plugin)
      }

      preload.meta = preload.meta || {}
      preload.name = preload.meta.name || plugin.name
      preload.fullname = Common.make_plugin_key(preload.name, plugin.tag)

      return {
        op: 'merge',
        out: {
          preload
        }
      }
    },


    exports: (spec: UseSpec) => {
      let seneca: any = spec.ctx.seneca

      let plugin: any = spec.data.plugin
      let preload: any = spec.data.preload

      seneca.private$.exports[preload.name] = preload.meta.export || plugin

      seneca.register(plugin, preload)
    }
  }
}
