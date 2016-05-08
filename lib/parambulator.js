/* Copyright (c) 2016 Richard Rodger and other contributors, MIT License */
'use strict'

var _ = require('lodash')
var Parambulator = require('parambulator')

var pm_custom_args = {
  rules: {
    entity$: function (ctxt, cb) {
      var val = ctxt.point
      if (val.entity$) {
        if (val.canon$({isa: ctxt.rule.spec})) {
          return cb()
        }
        else return ctxt.util.fail(ctxt, cb)
      }
      else return ctxt.util.fail(ctxt, cb)
    }
  },
  msgs: {
    entity$:
    'The value <%=value%> is not a data entity of kind <%=rule.spec%>' +
      ' (property <%=parentpath%>).'
  }
}


function parambulator (options) {
}


// Has to be preloaded as seneca.add does not wait for plugins to load.
parambulator.preload = function parambulator_preload (plugin) {
  return {
    extend: {
      action_modifier: function parambulator_modifier (actmeta) {
        if (_.keys(actmeta.rules).length) {
          var pm = Parambulator(actmeta.rules, pm_custom_args)
          actmeta.validate = function parambulator_validate (msg, done) {
            pm.validate(msg, done)
          }
        }

        return actmeta
      }
    }
  }
}


module.exports = parambulator
