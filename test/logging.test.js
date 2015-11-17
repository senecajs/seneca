'use strict'

var assert = require('assert')

var Lab = require('lab')

var logging = require('../lib/logging')

var lab = exports.lab = Lab.script()
var describe = lab.describe
var it = lab.it

function fmt (r) { return r.toString(true).replace(/\s+/g, '') }

describe('logging', function () {
  function A () {}; A.toString = function () { return 'A' }
  function B () {}; B.toString = function () { return 'B' }
  function C () {}; C.toString = function () { return 'C' }

  it('makelogrouter.happy', function (done) {
    var r = logging.makelogrouter({map: [
        {level: 'info', type: 'init', handler: A},
        {level: 'info', type: 'plugin', plugin: 'red', handler: B}
    ]})

    // console.log(fmt(r))
    assert.equal(fmt(r), 'level:info->plugin:red->type:plugin-><B>|type:init-><A>')
    done()
  })

  it('makelogrouter.short', function (done) {
    var r = logging.makelogrouter('level:info,type:plugin')
    // console.log(fmt(r))
    assert.equal(fmt(r), 'level:info->type:plugin-><print>')

    r = logging.makelogrouter(['level:info,type:plugin', 'level:debug,type:act'])
    // console.log(fmt(r))
    assert.equal(fmt(r), 'level:debug->type:act-><print>info->type:plugin-><print>')
    done()
  })

  it('makelogrouter.multiplex', function (done) {
    var r = logging.makelogrouter({map: [
        {level: 'info', type: 'init', handler: A},
        {level: 'info', type: 'init', handler: B},
        {level: 'info', type: 'init', handler: C}
    ]})

    // fix printing for test
    r.add({level: 'info', type: 'init'}, r.find({level: 'info', type: 'init'}).multiplex)
    // console.log(fmt(r))
    assert.equal(fmt(r), 'level:info->type:init-><A,B,C>')
    done()
  })

  it('makelogrouter.multival.comma', function (done) {
    var r = logging.makelogrouter({map: [
        {level: 'info', type: 'init,  status', handler: A}
    ]})
    // console.log(fmt(r))
    assert.equal(fmt(r), 'level:info->type:init-><A>status-><A>')
    done()
  })

  it('makelogrouter.multival.space', function (done) {
    var r = logging.makelogrouter({map: [
        {level: 'info', type: 'init status', handler: A}
    ]})
    // console.log(fmt(r))
    assert.equal(fmt(r), 'level:info->type:init-><A>status-><A>')
    done()
  })

  it('makelogrouter.multimultival', function (done) {
    var r = logging.makelogrouter({map: [
        {level: 'info,debug', type: 'init,status', handler: A}
    ]})
    // console.log(fmt(r))
    assert.equal(fmt(r), 'level:debug->type:init-><A>status-><A>info->type:init-><A>status-><A>')
    done()
  })

  it('makelogrouter.level.all', function (done) {
    var r = logging.makelogrouter({map: [
        {level: 'all', type: 'init', handler: A}
    ]})
    // console.log(fmt(r))
    assert.equal(fmt(r), 'level:debug->type:init-><A>error->type:init-><A>fatal->type:init-><A>info->type:init-><A>warn->type:init-><A>')
    done()
  })

  it('makelogrouter.level.upwards', function (done) {
    var r = logging.makelogrouter({map: [
        {level: 'warn+', type: 'init', handler: A}
    ]})
    // console.log(fmt(r))
    assert.equal(fmt(r), 'level:error->type:init-><A>fatal->type:init-><A>warn->type:init-><A>')
    done()
  })

  it('makelogrouter.level.bad', function (done) {
    try {
      logging.makelogrouter({map: [ {level: 'bad', type: 'init', handler: A} ]})
      assert.fail()
    }
    catch (e) {
      assert.equal('invalid_log_level', e.code)
    }
    done()
  })
})
