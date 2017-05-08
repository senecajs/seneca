/* Copyright (c) 2010-2015 Richard Rodger, MIT License */
'use strict'

var Code = require('code')
var Lab = require('lab')
var Seneca = require('..')

var lab = (exports.lab = Lab.script())
var describe = lab.describe
var it = lab.it
var expect = Code.expect

var testopts = { log: 'test', debug: { short_logs: true } }

describe('close', function() {
  lab.beforeEach(function(done) {
    process.removeAllListeners('SIGHUP')
    process.removeAllListeners('SIGTERM')
    process.removeAllListeners('SIGINT')
    process.removeAllListeners('SIGBREAK')
    done()
  })

  it('add-close', function(fin) {
    var tmp = {}
    Seneca(testopts)
      //.error(fin)
      .add('role:seneca,cmd:close', function(msg, reply) {
        tmp.sc = 1
        this.prior(msg, reply)
      })
      .close(function(err) {
        expect(1).to.equal(tmp.sc)
        fin()
      })
  })

  it('sub-close', function(done) {
    var tmp = {}
    Seneca(testopts)
      .error(done)
      .sub('role:seneca,cmd:close', function() {
        tmp.sc = 1
      })
      .close(function() {
        expect(1).to.equal(tmp.sc)
        done()
      })
  })
})
