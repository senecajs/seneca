/* Copyright © 2014-2020 Richard Rodger and other contributors, MIT License. */
'use strict'

var Common = require('./common')


module.exports.make_delegate = make_delegate

/*
function resolve_options(fullname, plugindef, seneca) {
  var so = seneca.options()

  var defaults = plugindef.defaults || {}

  var fullname_options = Object.assign(
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

  var shortname_options = Object.assign(
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
  var errors = plugindef.errors || (plugindef.define && plugindef.define.errors)

  if (errors) {
    base.errors = errors
  }

  var outopts = Object.assign(
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
      options: outopts,
    })
  }
}
*/

function make_delegate(instance, plugin) {
  // Adjust Seneca API to be plugin specific.
  var delegate = instance.delegate({
    plugin$: {
      name: plugin.name,
      tag: plugin.tag,
    },

    fatal$: true,
  })

  delegate.private$ = Object.create(instance.private$)
  delegate.private$.ge = delegate.private$.ge.gate()

  delegate.die = Common.makedie(delegate, {
    type: 'plugin',
    plugin: plugin.name,
  })

  var actdeflist = []

  delegate.add = function () {
    var argsarr = new Array(arguments.length)
    for (var l = 0; l < argsarr.length; ++l) {
      argsarr[l] = arguments[l]
    }

    var actdef = argsarr[argsarr.length - 1] || {}

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

    instance.add.apply(delegate, argsarr)

    return delegate
  }

  delegate.__update_plugin__ = function (plugin) {
    delegate.context.name = plugin.name || '-'
    delegate.context.tag = plugin.tag || '-'
    delegate.context.full = plugin.fullname || '-'

    actdeflist.forEach(function (actdef) {
      actdef.plugin_name = plugin.name || actdef.plugin_name || '-'
      actdef.plugin_tag = plugin.tag || actdef.plugin_tag || '-'
      actdef.plugin_fullname = plugin.fullname || actdef.plugin_fullname || '-'
    })
  }

  delegate.init = function (init) {
    // TODO: validate init_action is function

    var pat = {
      role: 'seneca',
      plugin: 'init',
      init: plugin.name,
    }

    if (null != plugin.tag && '-' != plugin.tag) {
      pat.tag = plugin.tag
    }

    delegate.add(pat, function (msg, reply) {
      init.call(this, reply)
    })
  }

  delegate.context.plugin = plugin

  return delegate
}

/*
function resolve_plugin_exports(seneca, fullname, meta) {
  var exports = []

  if (meta.export !== void 0) {
    seneca.private$.exports[fullname] = meta.export
    exports.push(fullname)
  }

  if ('object' === typeof meta.exportmap || 'object' === typeof meta.exports) {
    meta.exportmap = meta.exportmap || meta.exports
    Object.keys(meta.exportmap).forEach((k) => {
      var v = meta.exportmap[k]
      if (v !== void 0) {
        var exportname = fullname + '/' + k
        seneca.private$.exports[exportname] = v
        exports.push(exportname)
      }
    })
  }

  // Specific Seneca extension points
  if ('object' === typeof meta.extend) {
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

  return exports
}
*/
