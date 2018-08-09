/* Copyright (c) 2010-2015 Richard Rodger, MIT License */
'use strict'

var Code = require('code')
var Lab = require('lab')
var Seneca = require('..')

var lab = (exports.lab = Lab.script())
var describe = lab.describe
var it = lab.it
var expect = Code.expect

describe('close', function() {
  it('add-close', function(fin) {
    var tmp = {}
    Seneca()
      .test(fin, 'print')
      .add('role:seneca,cmd:close', function(msg, reply) {
        tmp.sc = 1
        this.prior(msg, reply)
      })
      .close(function(err) {
        expect(1).to.equal(tmp.sc)
        fin()
      })
  })

  it('sub-close', function(fin) {
    var tmp = {}
    Seneca()
      .test(fin)
      .sub('role:seneca,cmd:close', function() {
        tmp.sc = 1
      })
      .close(function() {
        expect(1).to.equal(tmp.sc)
        fin()
      })
  })

  it('close-graceful', function(fin) {
    var log = []
    Seneca({ log: 'silent' })
      .add('a:1', function a1(msg, reply) {
        log.push(msg.x)
        reply()
      })
      .ready(function() {
        this.act('a:1,x:1')
          .close(function() {
            expect(log).equal([1])
          })
          .ready(function() {
            this.act('a:1,x:2', function(err) {
              expect(err.code).equal('closed')
              fin()
            })
          })
      })
  })
})
