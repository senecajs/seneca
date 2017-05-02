/* Copyright (c) 2010-2015 Richard Rodger, MIT License */

'use strict'

var ChildProcess = require('child_process')
var Path = require('path')
var Code = require('code')
var Lab = require('lab')

var lab = (exports.lab = Lab.script())
var describe = lab.describe
var it = lab.it
var expect = Code.expect

describe('cli', function() {
  var launchPath = Path.join(__dirname, '/stubs/launch.js')

  it("won't display action patterns message when they aren't provided", function(
    done
  ) {
    ChildProcess.exec(process.argv[0] + ' ' + launchPath, function(
      err,
      stdout
    ) {
      expect(err).to.not.exist()
      expect(stdout).to.contain('hello')
      done()
    })
  })
})
