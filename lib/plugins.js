/* Copyright (c) 2014-2015 Richard Rodger, MIT License */
'use strict'

var _ = require('lodash')
var Eraro = require('eraro')
var Parambulator = require('parambulator')
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
  }),
  schema: Parambulator({
    type$: 'object',
    required$: ['name', 'init'],
    string$: ['name'],
    function$: ['init', 'service'],
    object$: ['options']
  }, {
    topname: 'plugin',
    msgprefix: 'register(plugin): '
  })
}

module.exports = function default_decorations () {
  var seneca = this

  seneca.decorate('hasplugin', internals.isRegistered)
  seneca.decorate('findplugin', internals.find)
  seneca.decorate('plugins', internals.all)
}

module.exports.register = function (callpoint) {
  return function api_register (plugin) {
    var seneca = this

    internals.schema.validate(plugin, function (err) {
      if (err) {
        throw err
      }
    })

    seneca.private$.definitions.push(function (so, next) {
      var fullname = plugin.name + (plugin.tag ? '/' + plugin.tag : '')

      plugin.fullname = fullname

      var delegate = make_delegate(seneca, plugin)

      seneca.log.debug('register', 'init', fullname, callpoint())

      var plugin_options = resolve_options(fullname, plugin, so)
      delegate.log.debug('DEFINE', plugin_options)
      var meta
      try {
        meta = define_plugin(delegate, plugin, plugin_options)
      }
      catch (ex) {
        delegate.die(ex)
        return next(ex)
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
      plugin.plugin_options = plugin_options

      delegate.__update_plugin__(plugin)

      var pluginref = plugin.name + (plugin.tag ? '/' + plugin.tag : '')
      seneca.private$.plugins[pluginref] = plugin

      seneca.private$.plugin_order.byname.push(plugin.name)
      seneca.private$.plugin_order.byname = _.uniq(seneca.private$.plugin_order.byname)

      seneca.private$.plugin_order.byref.push(pluginref)

      // LEGACY
      var service = plugin.service
      if (service) {
        service.log = delegate.log
        service.key = pluginref
        seneca.act('role:web', { use: service })
      }

      var exports = []

      if (meta.export !== void 0) {
        seneca.private$.exports[pluginref] = meta.export
        exports.push(pluginref)
      }

      if (_.isObject(meta.exportmap) || _.isObject(meta.exports)) {
        meta.exportmap = meta.exportmap || meta.exports
        _.each(meta.exportmap, function (v, k) {
          if (v !== void 0) {
            var exportname = pluginref + '/' + k
            seneca.private$.exports[exportname] = v
            exports.push(exportname)
          }
        })
      }

      seneca.log.debug('register', 'install', pluginref,
        { exports: exports }, fullname !== pluginref ? fullname : undefined)

      next(null, plugin)
    })
  }
}

internals.isRegistered = function api_hasplugin (plugindesc, tag) {
  var seneca = this
  tag = ('' === tag || '-' === tag) ? null : tag
  return !!seneca.findplugin(plugindesc, tag)
}

internals.find = function (plugindesc, tag) {
  var seneca = this
  var name = plugindesc.name || plugindesc
  tag = plugindesc.tag || tag

  var key = name + (tag ? '/' + tag : '')
  var plugin = seneca.private$.plugins[key]

  return plugin
}

internals.all = function () {
  return _.clone(this.private$.plugins)
}

module.exports.make_delegate = make_delegate

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

function make_delegate (instance, plugin) {
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
    var tag = ('-' === plugin.tag) ? void 0 : plugin.tag
    var plugin_fullname = plugin.name + (tag ? '/' + tag : '')
    var plugin_fullname_wide =
          (plugin_fullname.length < 8 ? plugin_fullname + '       ' : plugin_fullname)

    args.splice(1, 0, 'plugin', plugin_fullname_wide)
    instance.log.apply(instance, args)
  }
  Logging.makelogfuncs(delegate)

  delegate.die = Common.makedie(delegate, { type: 'plugin', plugin: plugin.name })

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
    throw internals.error('unsupported_legacy_plugin', plugin)
  }

  var meta = plugin.init.call(delegate, options) || {}

  meta = _.isString(meta) ? {name: meta} : meta
  meta.options = meta.options || options

  var updated_options = {}
  updated_options[plugin.fullname] = meta.options
  delegate.options(updated_options)

  return meta
}
