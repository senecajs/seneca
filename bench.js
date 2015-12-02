'use strict'

var Bench = require('bench')
var Latest = require('seneca')
var Local = require('./')

var color = function () {
  this.add('color:red', function (args, callback) {
    callback(null, { hex: '#FF0000' })
  })
}

Latest({ log: 'silent', transport: { port: 9998 } }).use(color).listen()
var latestClient = Latest({ log: 'silent', transport: { port: 9998 } }).client()

Local({ log: 'silent', transport: { port: 9999 } }).use(color).listen()
var localClient = Local({ log: 'silent', transport: { port: 9999 } }).client()

exports.compare = {
  'latest': function (done) {
    latestClient.act('color:red', done)
  },
  'local': function (done) {
    localClient.act('color:red', done)
  }
}

Bench.runMain()
