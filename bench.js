'use strict'

var Bench = require('bench')
var Latest = require('../seneca-main')
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

var countLocal = 0
var countLatest = 0

exports.compare = {
  'latest': function (done) {
    countLatest++
    latestClient.act('color:red', done)
  },
  'local': function (done) {
    countLocal++
    localClient.act('color:red', done)
  }
}

exports.time = 2000

Bench.runMain()

setTimeout(function() {
  console.log(countLocal, countLatest)
}, 10*exports.time)
