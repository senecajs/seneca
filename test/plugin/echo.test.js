/* Copyright (c) 2010-2015 Richard Rodger, MIT License */
'use strict'

var Assert = require('assert')
var Events = require('events')
var Lab = require('lab')
var Seneca = require('../..')

var lab = exports.lab = Lab.script()
var describe = lab.describe
var it = lab.it
var assert = Assert


describe('plugin.echo', function () {
  it('happy', function (done) {
    var si = Seneca({log: {map: [{type: 'init',
    handler: Seneca.loghandler.stream(process.stdout)}]}})
    si.use('echo')

    si.act({role: 'echo', baz: 'bax'}, function (err, out) {
      assert.ok(!err)
      assert.equal('' + {baz: 'bax'}, '' + out)
      done()
    })
  })

  it('options', function (done) {
    var printevents = new Events.EventEmitter()
    printevents.on('log', function (data) { console.log(data) })

    var si = Seneca({log: {map: [{type: 'init',
    handler: Seneca.loghandler.emitter(printevents)}]}})
    si.use('echo', {inject: {foo: 'bar'}})

    si.act({role: 'echo', baz: 'bax'}, function (err, out) {
      assert.ok(!err)
      assert.equal('' + {baz: 'bax', foo: 'bar'}, '' + out)
      done()
    })
  })
})
