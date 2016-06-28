/* Copyright (c) 2016 Richard Rodger and other contributors, MIT License */
'use strict'

var _ = require('lodash')
var Patrun = require('patrun')

module.exports = logging


function logging (options) {

}

logging.preload = function () {
  var seneca = this

  var logrouter

  var so = seneca.options()
  var logspec = so.log

  if( 0 === _.keys(logspec).length ) {
    logspec = {level: 'info'}
  }

  if( null !== logspec.level && 'none' !== logspec.level ) {
    // this should be optional, need to allow for pure pass-through
    logrouter = Patrun({ gex: true })

    var logpatterns = _.isArray(logspec) ? logspec : [logspec]
  
    for ( var i = 0; i < logpatterns.length; ++i ) {
      logrouter.add(logpatterns[i],true)
    }
  }

  var logger = function (seneca, data) {
    if (logrouter && logrouter.find(data)) {
      console.log( JSON.stringify(data) )
    }
  }

  return {
    extend: {
      logger: logger
    }
  }
}
