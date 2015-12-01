/* Copyright (c) 2014-2015 Richard Rodger, MIT License */
'use strict'

var Util = require('util')
var _ = require('lodash')
var Eraro = require('eraro')
var Common = require('./common')
var Logging = require('./logging')


var internals = {
  error: Eraro({
    package: 'seneca',
    msgmap: {
      unsupported_legacy_plugin: 'The plugin <%=name%> uses an unsupported legacy ' +
        'callback to indicate plugin definition is complete: <%=init_func_sig%> ' +
        '... }. The correct format is: function(options) { ... }. For more details, ' +
        'please see http://senecajs.org/tutorials/how-to-write-a-plugin.html'
    }
  })
}

exports.register = function (so, private$, paramcheck, makedie, callpoint) {
  return function api_register (plugin) {
    var self = this

    paramcheck.register.validate(plugin, function (err) {
      if (err) {
        throw err
      }
    })

    var fullname = plugin.name + (plugin.tag ? '/' + plugin.tag : '')

    plugin.fullname = fullname

    var delegate = make_delegate(
      self,
      plugin,
      { makedie: makedie }
    )

    self.log.debug('register', 'init', fullname, callpoint())

    var plugin_options = resolve_options(fullname, plugin, so)

    delegate.log.debug('DEFINE', plugin_options)

    var meta
    try {
      meta = define_plugin(delegate, plugin, plugin_options)
    }
    catch (e) {
      return delegate.die(e)
    }

    // legacy api for service function
    if (_.isFunction(meta)) {
      meta = {service: meta}
    }

    plugin.name = meta.name || plugin.name
    plugin.tag =
      meta.tag ||
      plugin.tag ||
      (plugin.options && plugin.options.tag$)

    plugin.fullname = plugin.name + (plugin.tag ? '/' + plugin.tag : '')

    plugin.service = meta.service || plugin.service

    delegate.__update_plugin__(plugin)

    var pluginref = plugin.name + (plugin.tag ? '/' + plugin.tag : '')
    private$.plugins[pluginref] = plugin

    private$.plugin_order.byname.push(plugin.name)
    private$.plugin_order.byname = _.uniq(private$.plugin_order.byname)

    private$.plugin_order.byref.push(pluginref)

    // LEGACY
    var service = plugin.service
    if (service) {
      service.log = delegate.log
      service.key = pluginref
      self.act('role:web', {use: service})
    }

    self.act(
      {
        init: plugin.name,
        tag: plugin.tag,
        default$: {},
        gate$: true,
        fatal$: true,
        local$: true
      },
      function (err, out) {
        if (err) {
          var plugin_err_code = 'plugin_init'

          plugin.plugin_error = err.message

          if (err.code === 'action-timeout') {
            plugin_err_code = 'plugin_init_timeout'
            plugin.timeout = so.timeout
          }

          return self.die(internals.error(err, plugin_err_code, plugin))
        }

        if (so.debug.print && so.debug.print.options) {
          console.log('\nSeneca Options (' + self.id + '): plugin: ' + plugin.name +
            (plugin.tag ? '$' + plugin.tag : '') + '\n' +
            '===\n')
          console.log(Util.inspect(plugin_options, {depth: null}))
          console.log('')
        }

        return self.log.debug('register', 'ready', pluginref, out)
      }
    )

    var exports = []

    if (meta.export !== void 0) {
      private$.exports[pluginref] = meta.export
      exports.push(pluginref)
    }

    if (_.isObject(meta.exportmap) || _.isObject(meta.exports)) {
      meta.exportmap = meta.exportmap || meta.exports
      _.each(meta.exportmap, function (v, k) {
        if (v !== void 0) {
          var exportname = pluginref + '/' + k
          private$.exports[exportname] = v
          exports.push(exportname)
        }
      })
    }

    self.log.debug('register', 'install', pluginref,
      { exports: exports }, fullname !== pluginref ? fullname : undefined)
  }
}

exports.isRegistered = function api_hasplugin (plugindesc, tag) {
  var self = this
  tag = ('' === tag || '-' === tag) ? null : tag
  return !!self.findplugin(plugindesc, tag)
}

exports.find = function (private$) {
  return function api_findplugin (plugindesc, tag) {
    var name = plugindesc.name || plugindesc
    tag = plugindesc.tag || tag

    var key = name + (tag ? '/' + tag : '')
    var plugin = private$.plugins[key]

    return plugin
  }
}

exports.all = function (private$) {
  return function api_plugins () {
    return _.clone(private$.plugins)
  }
}

exports.make_delegate = make_delegate

function resolve_options (fullname, plugindef, seneca_options) {
  var so = seneca_options

  var fullname_options = _.extend(
    {},
    so[fullname],
    so.plugin[fullname],
    so[fullname + '$' + plugindef.tag],
    so.plugin[fullname + '$' + plugindef.tag]
 )

  var shortname = fullname !== plugindef.name ? plugindef.name : null
  if (!shortname && fullname.indexOf('seneca-') === 0) {
    shortname = fullname.substring('seneca-'.length)
  }

  var shortname_options = _.extend(
    {},
    so[shortname],
    so.plugin[shortname],
    so[shortname + '$' + plugindef.tag],
    so.plugin[shortname + '$' + plugindef.tag]
 )

  var outopts = _.extend({},
    shortname_options,
    fullname_options,
    plugindef.options || {})

  return outopts
}

function make_delegate (instance, plugin, options) {
  // Adjust Seneca API to be plugin specific.
  var delegate = instance.delegate({
    plugin$: {
      name: plugin.name,
      tag: plugin.tag
    },

    // Act calls inside the plugin definition function are not gated.
    ungate$: true,
    fatal$: true
  })

  delegate.log = function (level) {
    var args = Common.arrayify(arguments)

    // TODO: move outside log function - need handle __update_plugin__
    var tag = '-' === plugin.tag ? void 0 : plugin.tag
    var plugin_fullname = plugin.name + (tag ? '/' + tag : '')
    var plugin_fullname_wide =
          (plugin_fullname.length < 8 ? plugin_fullname + '       ' : plugin_fullname)

    args.splice(1, 0, 'plugin', plugin_fullname_wide)
    instance.log.apply(instance, args)
  }
  Logging.makelogfuncs(delegate)

  delegate.die = options.makedie(delegate, {type: 'plugin', plugin: plugin.name})

  var actmetalist = []

  delegate.add = function () {
    var args = Common.arrayify(arguments)

    var actmeta = args[args.length - 1] || {}

    if (_.isFunction(actmeta)) {
      actmeta = {}
      args.push(actmeta)
    }

    actmeta.plugin_name = plugin.name || '-'
    actmeta.plugin_tag = plugin.tag || '-'
    actmeta.plugin_fullname = plugin.fullname
    actmeta.log = delegate.log

    actmetalist.push(actmeta)

    return instance.add.apply(delegate, args)
  }

  delegate.__update_plugin__ = function (plugin) {
    delegate.context.name = plugin.name || '-'
    delegate.context.tag = plugin.tag || '-'
    delegate.context.full = plugin.fullname || '-'

    _.each(actmetalist, function (actmeta) {
      actmeta.plugin_name = plugin.name || actmeta.plugin_name || '-'
      actmeta.plugin_tag = plugin.tag || actmeta.plugin_tag || '-'
      actmeta.plugin_fullname =
        plugin.fullname || actmeta.plugin_fullname || '-'
    })
  }

  delegate.context.module = plugin.parent || module
  delegate.context.name = plugin.name || '-'
  delegate.context.tag = plugin.tag || '-'
  delegate.context.full = plugin.fullname
  delegate.context.isplugin = true

  return delegate
}

function define_plugin (delegate, plugin, options) {
  // legacy plugins
  if (plugin.init.length > 1) {
    plugin.init_func_sig = plugin.init.toString().match(/^(.*)\n/)[1]
    throw internals.Error('unsupported_legacy_plugin', plugin)
  }

  delegate.act = Util.deprecate(delegate.act, 'act() will be removed from plugin initialization')
  var meta = plugin.init.call(delegate, options) || {}

  meta = _.isString(meta) ? {name: meta} : meta
  meta.options = meta.options || options

  var updated_options = {}
  updated_options[plugin.fullname] = meta.options
  delegate.options(updated_options)

  return meta
}
