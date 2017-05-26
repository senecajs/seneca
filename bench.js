'use strict'

var Bench = require('bench')
var Latest = require('../seneca-main')
var LatestNGT = require('../seneca-main')
var Local = require('./')

var color = function () {
  this.add('color:red', function (msg, reply) {
    reply({ hex: '#FF0000' })
  })
}

LatestNGT({ log: 'silent', transport: { port: 9997 }, legacy:{transport:false} }).use(color).listen()
var latestClientNGT = Latest({ log: 'silent', transport: { port: 9997 }, legacy:{transport:false} }).client()

Latest({ log: 'silent', transport: { port: 9998 } }).use(color).listen()
var latestClient = Latest({ log: 'silent', transport: { port: 9998 } }).client()

Local({ log: 'silent', transport: { port: 9999 } }).use(color).listen()
var localClient = Local({ log: 'silent', transport: { port: 9999 } }).client()

var countLocal = 0
var countLatest = 0
var countLatestNGT = 0

exports.compare = {
  'latestNGT': function (done) {
    countLatestNGT++
    latestClientNGT.act('color:red', done)
  },
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
  console.log(countLocal, countLatest, countLatestNGT)
}, 10*exports.time)
