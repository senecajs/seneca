/* Copyright (c) 2010-2015 Richard Rodger, MIT License */

'use strict'

var assert = require('assert')
var childProcess = require('child_process')
var path = require('path')
var Lab = require('lab')

var lab = exports.lab = Lab.script()
var describe = lab.describe
var it = lab.it

describe('CLI', function () {
  var launchPath = path.join(__dirname, 'launch')

  it('respects seneca.print.tree[.all] arg', function (done) {
    var cli = childProcess.spawn('node', [launchPath, '--seneca.print.tree'])
    var output = ''

    cli.stdout.on('data', function (data) {
      output += data
    })

    cli.stderr.on('data', function (data) {
      assert(!data)
    })

    cli.once('close', function (code, signal) {
      assert(code === 0)
      assert(!signal)
      assert(output.indexOf('Seneca action patterns') !== -1)
      done()
    })
  })

  it('won\'t display action patterns message when they aren\'t provided', function (done) {
    var cli = childProcess.spawn('node', [launchPath])
    var output = ''

    cli.stdout.on('data', function (data) {
      output += data
    })

    cli.stderr.on('data', function (data) {
      assert(!data)
    })

    cli.once('close', function (code, signal) {
      assert(code === 0)
      assert(!signal)
      assert(output.indexOf('Seneca action patterns') === -1)
      done()
    })
  })
})
