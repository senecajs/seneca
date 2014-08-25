/* Copyright (c) 2014 Richard Rodger, MIT License */
/* jshint node:true, asi:true, eqnull:true */
"use strict";


var _     = require('underscore')
var async = require('async')
var error = require('eraro')({package:'seneca'})


var common  = require('./common')
var logging = require('./logging')



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


  sd.context.module = plugin.parent || module
  sd.context.name   = plugin.name
  sd.context.tag    = plugin.tag
  sd.context.full   = plugin.fullname


  return sd;
}



module.exports = {
  make_delegate: make_delegate
}

