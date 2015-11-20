/* Copyright (c) 2010-2015 Richard Rodger, MIT License */
'use strict'

var _ = require('lodash')
var Eraro = require('eraro')
var Semver = require('semver')
var Errors = require('./errors')

var internals = {
  error: Eraro({
    package: 'seneca',
    msgmap: Errors,
    override: true
  })
}

module.exports = function api_cluster () {
  var self = this
  var version = process.versions.node

  if (Semver.lt(version, '0.12.0')) {
    return self.die(internals.error('bad_cluster_version', {version: version}))
  }

  var cluster = require('cluster')

  if (cluster.isMaster) {
    require('os').cpus().forEach(function () {
      cluster.fork()
    })

    cluster.on('disconnect', function (worker) {
      cluster.fork()
    })

    var noopinstance = self.delegate()
    for (var fn in noopinstance) {
      if (_.isFunction(noopinstance[fn])) {
        noopinstance[fn] = function () {
          return noopinstance
        }
      }
    }

    return noopinstance
  }
  else return self
}
