/* Copyright (c) 2013-2015 Richard Rodger */
'use strict'

var Assert = require('assert')
var Lab = require('lab')
var Seneca = require('../../..')

var lab = exports.lab = Lab.script()
var describe = lab.describe
var it = lab.it
var assert = Assert


describe('options', function () {
  lab.before(function (done) {
    process.removeAllListeners('SIGHUP')
    process.removeAllListeners('SIGTERM')
    process.removeAllListeners('SIGINT')
    process.removeAllListeners('SIGBREAK')
    done()
  })

  it('options-happy', function (done) {
    // loads ./seneca.options.js as well
    var si = Seneca({d: 4, foo: {dd: 4}, log: 'silent', module: module})

    var opts = si.options()
    assert.equal(1, opts.a)
    assert.equal(4, opts.d)
    assert.equal(1, opts.foo.aa)
    assert.equal(4, opts.foo.dd)

    opts = si.export('options')
    assert.equal(1, opts.a)
    assert.equal(4, opts.d)
    assert.equal(1, opts.foo.aa)
    assert.equal(4, opts.foo.dd)
    si.close(done)
  })

  it('options-getset', function (done) {
    var si = Seneca({d: 4, foo: {dd: 4}, log: 'silent', module: module})

    si.options({e: 5, foo: {ee: 5}})
    // console.log('a',a)

    var opts = si.options()
    // console.log('b',opts)

    assert.equal(1, opts.a)
    assert.equal(4, opts.d)
    assert.equal(5, opts.e)
    assert.equal(1, opts.foo.aa)
    assert.equal(4, opts.foo.dd)
    assert.equal(5, opts.foo.ee)

    opts = si.export('options')
    assert.equal(1, opts.a)
    assert.equal(4, opts.d)
    assert.equal(5, opts.e)
    assert.equal(1, opts.foo.aa)
    assert.equal(4, opts.foo.dd)
    assert.equal(5, opts.foo.ee)
    si.close(done)
  })

  it('options-legacy', function (done) {
    var si = Seneca({d: 4, foo: {dd: 4}, log: 'silent', module: module})

    si.use('options', {e: 5, foo: {ee: 5}})

    var opts = si.options()
    assert.equal(1, opts.a)
    assert.equal(4, opts.d)
    assert.equal(5, opts.e)
    assert.equal(1, opts.foo.aa)
    assert.equal(4, opts.foo.dd)
    assert.equal(5, opts.foo.ee)

    opts = si.export('options')
    assert.equal(1, opts.a)
    assert.equal(4, opts.d)
    assert.equal(5, opts.e)
    assert.equal(1, opts.foo.aa)
    assert.equal(4, opts.foo.dd)
    assert.equal(5, opts.foo.ee)
    si.close(done)
  })

  it('options-file-js', function (done) {
    var si0 = Seneca({d: 4, foo: {dd: 4}, log: 'silent', module: module})

    si0.options(__dirname + '/options.require.js')

    var opts = si0.options()
    assert.equal(1, opts.a)
    assert.equal(4, opts.d)
    assert.equal(2, opts.b)
    assert.equal(1, opts.foo.aa)
    assert.equal(4, opts.foo.dd)
    assert.equal(2, opts.foo.bb)

    opts = si0.export('options')
    assert.equal(1, opts.a)
    assert.equal(4, opts.d)
    assert.equal(2, opts.b)
    assert.equal(1, opts.foo.aa)
    assert.equal(4, opts.foo.dd)
    assert.equal(2, opts.foo.bb)
    si0.close(done)
  })

  it('options-file-json', function (done) {
    var si0 = Seneca({d: 4, foo: {dd: 4}, log: 'silent', module: module})

    si0.options(__dirname + '/options.file.json')

    var opts = si0.options()
    assert.equal(1, opts.a)
    assert.equal(4, opts.d)
    assert.equal(3, opts.c)
    assert.equal(1, opts.foo.aa)
    assert.equal(4, opts.foo.dd)
    assert.equal(3, opts.foo.cc)

    opts = si0.export('options')
    assert.equal(1, opts.a)
    assert.equal(4, opts.d)
    assert.equal(3, opts.c)
    assert.equal(1, opts.foo.aa)
    assert.equal(4, opts.foo.dd)
    assert.equal(3, opts.foo.cc)
    si0.close(done)
  })

  it('options-env', function (done) {
    process.env.SENECA_OPTIONS = '{"foo":"bar","a":99}'
    var si = Seneca()
    var opts = si.options()

    assert.equal('bar', opts.foo)
    assert.equal(99, opts.a)
    si.close(done)
  })

  it('options-cmdline', function (done) {
    process.argv.push('--seneca.options.foo=bar')
    process.argv.push('--seneca.options.a=99')

    var si = Seneca({log: 'silent'})
    var opts = si.options()

    assert.equal('bar', opts.foo)
    assert.equal(99, opts.a)
    si.close(done)
  })

  it('options-internal', function (done) {
    var si = Seneca({log: 'silent'})
    var ar = si.options().internal.actrouter
    assert.ok(ar)
    si.close(done)
  })

  it('options-invalid', function (done) {
    try {
      Seneca({idlen: 'foo'})
      assert.fail()
    }
    catch (e) {
      assert.equal('integer$', e.parambulator.code)
    }
    done()
  })

// TODO: failure modes
})
