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
      var seneca = Seneca({ repl: { port: port }, log: 'silent' })
      seneca.repl()
      var result = ''

      setTimeout(function () {
        var sock = Net.connect(port)
        var first = true

        sock.on('data', function (data) {
          result += data.toString('ascii')

          expect(result).to.contain('seneca')
          if (first) {
            setTimeout(function () {
              first = false
              expect(result).to.contain('->')
              sock.write('this\n')
            }, 50)
          }
          else {
            expect(result).to.contain('->')
            sock.write('seneca.quit\n')
            sock.destroy()
            sock.removeAllListeners('data')
            done()
          }
        }, 100)
      })
    })
  })
})
