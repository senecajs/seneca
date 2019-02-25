/* Copyright © 2014-2018 Richard Rodger and other contributors, MIT License. */
'use strict'

var _ = require('lodash')
var Eraro = require('eraro')
var Common = require('./common')
var Print = require('./print')

var internals = {
  error: Eraro({
    package: 'seneca',
    msgmap: {
      // REMOVE in 4.x
      unsupported_legacy_plugin:
        'The plugin <%=name%> uses an unsupported legacy ' +
        'callback to indicate plugin definition is complete: <%=init_func_sig%> ' +
        '... }. The correct format is: function(options) { ... }. For more details, ' +
        'please see http://senecajs.org/tutorials/how-to-write-a-plugin.html'
    }
  })
}

module.exports.register = function(opts, callpoint) {
  var seq = 0

  return function api_register(plugin) {
    var seneca = this
    var so = seneca.options()

    plugin.fullname = Common.make_plugin_key(plugin)

    // Don't reload plugins if load_once true
    if (so.system.plugin.load_once) {
      if (seneca.has_plugin(plugin)) {
        return this
      }
    }

    plugin.loading = true
    seneca.private$.plugins[plugin.fullname] = plugin

    var preload = plugin.init.preload
    preload = _.isFunction(preload) ? preload : _.noop
    var meta = preload.call(seneca, plugin) || {}

    var delegate = make_delegate(seneca, plugin)

    seq++

    var plugin_define_pattern = {
      role: 'seneca',
      plugin: 'define',
      name: plugin.name,
      seq: seq
    }

    if (plugin.tag !== null) {
      plugin_define_pattern.tag = plugin.tag
    }

    // seneca
    delegate.add(plugin_define_pattern, plugin_definition).act({
      role: 'seneca',
      plugin: 'define',
      name: plugin.name,
      tag: plugin.tag,
      seq: seq,
      default$: {},
      fatal$: true,
      local$: true
    })

    var preload_name = meta.name || plugin.name
    var preload_fullname = Common.make_plugin_key(preload_name, plugin.tag)
    seneca.private$.exports[preload_name] = meta.export || plugin

    resolve_plugin_exports(seneca, preload_fullname, meta)

    return this

    function plugin_definition(msg, plugin_done) {
      var plugin_seneca = this
      var plugin_options = resolve_options(plugin.fullname, plugin, seneca)

      // Update plugin options data in Seneca options.
      var seneca_options = { plugin: {} }
      seneca_options.plugin[plugin.fullname] = plugin_options
      seneca.options(seneca_options)

      plugin_seneca.log.debug({
        kind: 'plugin',
        case: 'init',
        name: plugin.name,
        tag: plugin.tag,
        options: plugin_options,
        callpoint: callpoint
      })

      try {
        meta = define_plugin(plugin_seneca, plugin, plugin_options)
      } catch (e) {
        // TODO: needs wrapping
        return plugin_done(e)
      }

      // legacy api for service function
      if (_.isFunction(meta)) {
        meta = { service: meta }
      }

      // Plugin may have changed its own name dynamically

      plugin.name = meta.name || plugin.name
      plugin.tag =
        meta.tag || plugin.tag || (plugin.options && plugin.options.tag$)

      plugin.fullname = Common.make_plugin_key(plugin)
      plugin.service = meta.service || plugin.service

      plugin_seneca.__update_plugin__(plugin)

      seneca.private$.plugins[plugin.fullname] = plugin

      seneca.private$.plugin_order.byname.push(plugin.name)
      seneca.private$.plugin_order.byname = _.uniq(
        seneca.private$.plugin_order.byname
      )
      seneca.private$.plugin_order.byref.push(plugin.fullname)

      var exports = resolve_plugin_exports(plugin_seneca, plugin.fullname, meta)

      // 3.x Backwards compatibility - REMOVE in 4.x
      if ('amqp-transport' === plugin.name) {
        seneca.options({ legacy: { meta: true } })
      }

      plugin_seneca.log.debug({
        kind: 'plugin',
        case: 'install',
        name: plugin.name,
        tag: plugin.tag,
        exports: exports
      })

      plugin_seneca.act(
        {
          role: 'seneca',
          plugin: 'init',
          seq: msg.seq,
          init: plugin.name,
          tag: plugin.tag,
          default$: {},
          fatal$: true,
          local$: true
        },
        function(err) {
          if (err) {
            var plugin_err_code = 'plugin_init'

            plugin.plugin_error = err.message

            if (err.code === 'action-timeout') {
              plugin_err_code = 'plugin_init_timeout'
              plugin.timeout = opts.$.timeout
            }

            return plugin_seneca.die(
              internals.error(err, plugin_err_code, plugin)
            )
          }

          var fullname = plugin.name + (plugin.tag ? '$' + plugin.tag : '')

          if (opts.$.debug.print && opts.$.debug.print.options) {
            Print.plugin_options(seneca, fullname, plugin_options)
          }

          plugin_seneca.log.info({
            kind: 'plugin',
            case: 'ready',
            name: plugin.name,
            tag: plugin.tag
          })

          plugin_done()
        }
      )
    }
  }
}

module.exports.make_delegate = make_delegate

function resolve_options(fullname, plugindef, seneca) {
  var so = seneca.options()

  var defaults = plugindef.defaults || {}

  var fullname_options = _.extend(
    {},

    // DEPRECATED: remove in 4
    so[fullname],

    so.plugin[fullname],

    // DEPRECATED: remove in 4
    so[fullname + '$' + plugindef.tag],

    so.plugin[fullname + '$' + plugindef.tag]
  )

  var shortname = fullname !== plugindef.name ? plugindef.name : null
  if (!shortname && fullname.indexOf('seneca-') === 0) {
    shortname = fullname.substring('seneca-'.length)
  }

  var shortname_options = _.extend(
    {},

    // DEPRECATED: remove in 4
    so[shortname],

    so.plugin[shortname],

    // DEPRECATED: remove in 4
    so[shortname + '$' + plugindef.tag],

    so.plugin[shortname + '$' + plugindef.tag]
  )

  var base = {}

  // NOTE: plugin error codes are in their own namespaces
  var errors = plugindef.errors || (plugindef.init && plugindef.init.errors)

  if (errors) {
    base.errors = errors
  }

  var outopts = _.extend(
    base,
    shortname_options,
    fullname_options,
    plugindef.options || {}
  )

  try {
    return seneca.util
      .Optioner(defaults, { allow_unknown: true })
      .check(outopts)
  } catch (e) {
    throw Common.error('invalid_plugin_option', {
      name: fullname,
      err_msg: e.message,
      options: outopts
    })
  }
}

function make_delegate(instance, plugin) {
  // Adjust Seneca API to be plugin specific.
  var delegate = instance.delegate({
    plugin$: {
      name: plugin.name,
      tag: plugin.tag
    },

    fatal$: true
  })

  delegate.private$ = Object.create(instance.private$)
  delegate.private$.ge = delegate.private$.ge.gate()

  delegate.log = instance.make_log(
    delegate,
    function plugin_delegate_log_modifier(data) {
      data.plugin_name = plugin.name
      data.plugin_tag = plugin.tag
    }
  )

  delegate.die = Common.makedie(delegate, {
    type: 'plugin',
    plugin: plugin.name
  })

  var actdeflist = []

  delegate.add = function() {
    var argsarr = new Array(arguments.length)
    for (var l = 0; l < argsarr.length; ++l) {
      argsarr[l] = arguments[l]
    }

    var actdef = argsarr[argsarr.length - 1] || {}

    if (_.isFunction(actdef)) {
      actdef = {}
      argsarr.push(actdef)
    }

    actdef.plugin_name = plugin.name || '-'
    actdef.plugin_tag = plugin.tag || '-'
    actdef.plugin_fullname = plugin.fullname

    // TODO: is this necessary?
    actdef.log = delegate.log

    actdeflist.push(actdef)

    instance.add.apply(delegate, argsarr)

    return delegate
  }

  delegate.__update_plugin__ = function(plugin) {
    delegate.context.name = plugin.name || '-'
    delegate.context.tag = plugin.tag || '-'
    delegate.context.full = plugin.fullname || '-'

    _.each(actdeflist, function(actdef) {
      actdef.plugin_name = plugin.name || actdef.plugin_name || '-'
      actdef.plugin_tag = plugin.tag || actdef.plugin_tag || '-'
      actdef.plugin_fullname = plugin.fullname || actdef.plugin_fullname || '-'
    })
  }

  delegate.init = function(init) {
    // TODO: validate init_action is function

    var pat = {
      role: 'seneca',
      plugin: 'init',
      init: plugin.name
    }

    if (null != plugin.tag && '-' != plugin.tag) {
      pat.tag = plugin.tag
    }

    delegate.add(pat, function(msg, reply) {
      init.call(this, reply)
    })
  }

  delegate.context.plugin = plugin

  return delegate
}

function define_plugin(delegate, plugin, options) {
  // legacy plugins
  if (plugin.init.length > 1) {
    plugin.init_func_sig = plugin.init.toString().match(/^(.*)\n/)[1]
    throw internals.error('unsupported_legacy_plugin', plugin)
  }

  if (options.errors) {
    plugin.eraro = Eraro({
      package: 'seneca',
      msgmap: options.errors,
      override: true
    })
  }

  var meta

  try {
    meta = plugin.init.call(delegate, options) || {}
  } catch (e) {
    if (e.seneca) {
      throw e
    } else {
      throw Common.error(e, 'plugin_define', {
        fullname: plugin.fullname,
        message: (
          e.message + (' (' + e.stack.match(/\n.*?\n/)).replace(/\n.*\//g, '')
        ).replace(/\n/g, ''),
        options: options,
        repo: plugin.repo ? ' ' + plugin.repo + '/issues' : ''
      })
    }
  }

  meta = _.isString(meta) ? { name: meta } : meta
  meta.options = meta.options || options

  var updated_options = {}
  updated_options[plugin.fullname] = meta.options
  delegate.options(updated_options)

  return meta
}

function resolve_plugin_exports(seneca, fullname, meta) {
  var exports = []

  if (meta.export !== void 0) {
    seneca.private$.exports[fullname] = meta.export
    exports.push(fullname)
  }

  if (_.isObject(meta.exportmap) || _.isObject(meta.exports)) {
    meta.exportmap = meta.exportmap || meta.exports
    _.each(meta.exportmap, function(v, k) {
      if (v !== void 0) {
        var exportname = fullname + '/' + k
        seneca.private$.exports[exportname] = v
        exports.push(exportname)
      }
    })
  }

  // Specific Seneca extension points
  if (_.isObject(meta.extend)) {
    if (_.isFunction(meta.extend.action_modifier)) {
      seneca.private$.action_modifiers.push(meta.extend.action_modifier)
    }

    if (_.isFunction(meta.extend.logger)) {
      if (
        !meta.extend.logger.replace &&
        _.isFunction(seneca.private$.logger.add)
      ) {
        seneca.private$.logger.add(meta.extend.logger)
      } else {
        seneca.private$.logger = meta.extend.logger
      }
    }
  }

  return exports
}
