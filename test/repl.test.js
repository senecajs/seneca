/* Copyright (c) 2014-2015 Richard Rodger, MIT License */
'use strict'

var Net = require('net')
var Code = require('code')
var Lab = require('lab')
var Seneca = require('..')

// Test shortcuts
var lab = exports.lab = Lab.script()
var describe = lab.describe
var it = lab.it
var expect = Code.expect

var internals = {}

internals.availablePort = function (callback) {
  var server = Net.createServer()
  server.listen(0, function () {
    var port = server.address().port
    server.close(function () {
      callback(port)
    })
  })
}

describe('repl', function () {
  lab.beforeEach(function (done) {
    process.removeAllListeners('SIGHUP')
    process.removeAllListeners('SIGTERM')
    process.removeAllListeners('SIGINT')
    process.removeAllListeners('SIGBREAK')
    done()
  })

  it('accepts local connections and responds to commands', function (done) {
    internals.availablePort(function (port) {
      var seneca = Seneca({ repl: { port: port } })
      seneca.repl()

      setTimeout(function () {
        var sock = Net.connect(port)
        var state = 0

        sock.on('readable', function () {
          var buffer = sock.read()
          if (!buffer) {
            return
          }

          var result = buffer.toString('ascii')

          if (state === 0) {
            expect(result).to.contain('seneca')
            sock.write('console.log(this)\n')
          }
          else if (state === 1) {
            expect(result).to.contain('{')
            sock.write('seneca.quit\n')
          }
          else if (state === 2) {
            expect(result).to.contain('seneca')
            done()
          }

          state++
        }, 100)
      })
    })
  })
})
