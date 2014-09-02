/* Copyright (c) 2014 Richard Rodger, MIT License */
/* jshint node:true, asi:true, eqnull:true */
"use strict";


var _     = require('underscore')
var async = require('async')
var error = require('eraro')({package:'seneca'})


var common  = require('./common')
var logging = require('./logging')




function resolve_options( fullname, plugindef, seneca_options ) {
  var so = seneca_options

  var fullname_options  = _.extend(
    {},
    so[fullname],
    so.plugin[fullname],
    so[fullname+'$'+plugindef.tag],
    so.plugin[fullname+'$'+plugindef.tag]        
  )
  
  var shortname = fullname != plugindef.name ? plugindef.name : null
  if( !shortname && 0 === fullname.indexOf('seneca-') ) {
    shortname = fullname.substring('seneca-'.length)
  }

  var shortname_options = _.extend(
    {},
    so[shortname],
    so.plugin[shortname],
    so[shortname+'$'+plugindef.tag],
    so.plugin[shortname+'$'+plugindef.tag]        
  )

  var outopts = _.extend( {},
                          shortname_options,
                          fullname_options,
                          plugindef.options || {} )

  return outopts
}



function make_delegate( instance, plugin, derived, options ) {

  // Adjust Seneca API to be plugin specific.
  var sd = instance.delegate({
    plugin$: {
      name: plugin.name,
      tag:  plugin.tag
    },

    // Act calls inside the plugin definition function are not gated.
    ungate$:true
  })


  sd.log = function(level) {
    var args = common.arrayify(arguments)

    args.splice(1,0,'plugin',plugin.name,derived.tag)
    instance.log.apply(instance,args)
  }
  logging.makelogfuncs(sd)


  sd.die  = options.makedie( sd, {type:'plugin',plugin:plugin.name} )
  sd.fail = options.makefail( sd, {type:'plugin',plugin:plugin.name} )


  sd.add = function() {
    var args = common.arrayify(arguments)

    var actmeta = args[args.length-1]
    
    if( _.isFunction(actmeta) ) {
      actmeta = {}
      args.push(actmeta)
    }

    actmeta.plugin_nameref  = derived.nameref
    actmeta.plugin_fullname = plugin.fullname
    actmeta.plugin_tag      = derived.tag
    actmeta.log             = sd.log

    return instance.add.apply(sd,args)
  }


  sd.context.module   = plugin.parent || module
  sd.context.name     = plugin.name
  sd.context.tag      = plugin.tag
  sd.context.full     = plugin.fullname
  sd.context.isplugin = true


  return sd;
}



function define_plugin( sd, plugin, options, done ) {
  var init_args = [options]
  var is_normal = plugin.init.length <= 1

  // legacy plugins with function(opts,cb)
  if( !is_normal ) {
    init_args.push( done )
  }

  // legacy plugins with function(seneca,opts,cb)
  if( 3 == plugin.init.length ) {
    init_args.unshift(sd)
  }

  var meta = plugin.init.apply(sd,init_args) || {}

  meta = _.isString( meta ) ? {name:meta} : meta
  meta.options = meta.options || options

  var updated_options = {}
  updated_options[plugin.fullname] = meta.options
  sd.options( updated_options )

  if( is_normal ) {
    return done(null,meta)
  }
}



module.exports = {
  make_delegate:   make_delegate,
  resolve_options: resolve_options,
  define_plugin:   define_plugin,
}

