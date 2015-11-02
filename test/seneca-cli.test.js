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
    childProcess.exec(process.argv[0] + ' ' + launchPath + ' --seneca.print.tree', { env: { 'SENECA_LOG': 'all' } }, function (err, stdout, stderr) {
      assert(!err)
      assert(stdout.indexOf('Seneca') !== -1)
      done()
    })
  })

  it('won\'t display action patterns message when they aren\'t provided', function (done) {
    childProcess.exec(process.argv[0] + ' ' + launchPath, function (err, stdout, stderr) {
      assert(!err)
      assert(stdout.indexOf('Seneca') === -1)
      done()
    })
  })
})
