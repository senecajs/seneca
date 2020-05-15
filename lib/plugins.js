/* Copyright © 2014-2020 Richard Rodger and other contributors, MIT License. */
'use strict'

var Common = require('./common')


module.exports.make_delegate = make_delegate


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

