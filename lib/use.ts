/* Copyright © 2020 Richard Rodger and other contributors, MIT License. */
'use strict'


exports.api_use = api_use


function api_use(arg0: any, arg1: any, arg2: any) {
  var self = this


  // DEPRECATED: Remove when Seneca >= 4.x
  // Allow chaining with seneca.use('options', {...})
  // see https://github.com/rjrodger/seneca/issues/80
  if (arg0 === 'options') {
    self.options(arg1)
    return self
  }

  try {
    // Plugin definition function is under property `define`.
    // `init` is deprecated from 4.x
    // TODO: use-plugin expects `init` - update use-plugin to make this customizable
    if (null != arg0 && 'object' === typeof arg0) {
      arg0.init = arg0.define || arg0.init
    }

    // TODO: use-plugin needs better error message for malformed plugin desc
    var desc = self.private$.use.build_plugin_desc(arg0, arg1, arg2)

    if (this.private$.ignore_plugins[desc.full]) {
      this.log.info({
        kind: 'plugin',
        case: 'ignore',
        plugin_full: desc.full,
        plugin_name: desc.name,
        plugin_tag: desc.tag,
      })

      return self
    }

    var plugin = self.private$.use.use_plugin_desc(desc)

    self.register(plugin)
  } catch (e) {
    self.die(self.private$.error(e, 'plugin_' + e.code))
  }

  return self
}
