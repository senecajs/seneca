/* Copyright (c) 2010-2015 Richard Rodger, MIT License */
'use strict'

var Code = require('code')
var Lab = require('lab')
var Seneca = require('..')

var lab = exports.lab = Lab.script()
var describe = lab.describe
var it = lab.it
var expect = Code.expect

var testopts = { log: 'test', debug: { short_logs: true } }


describe('close', function () {
  lab.beforeEach(function (done) {
    process.removeAllListeners('SIGHUP')
    process.removeAllListeners('SIGTERM')
    process.removeAllListeners('SIGINT')
    process.removeAllListeners('SIGBREAK')
    done()
  })

  it('add-close', function (done) {
    var tmp = {}
    Seneca(testopts)
      .error(done)
      .add('role:seneca,cmd:close', function (msg, done) {
        tmp.sc = 1
        this.prior(msg, done)
      })
      .close(function () {
        expect(1).to.equal(tmp.sc)
        done()
      })
  })

  it('sub-close', function (done) {
    var tmp = {}
    Seneca(testopts)
      .error(done)
      .sub('role:seneca,cmd:close', function (msg) {
        tmp.sc = 1
      })
      .close(function () {
        expect(1).to.equal(tmp.sc)
        done()
      })
  })
})
