/* Copyright (c) 2019-2022 Richard Rodger and other contributors, MIT License */
'use strict'

var Assert = require('assert')
var Lab = require('@hapi/lab')

var lab = exports.lab = Lab.script()
var describe = lab.describe
var it = lab.it
var assert = Assert

var Shared = require('../../shared')
var it = Shared.make_it(lab)

var Seneca = require('../../..')

describe('options', function () {
  it('options-happy', function (fin) {
    // loads ./seneca.options.js as well
    var si = Seneca({internal:{d: 4, foo: {dd: 4}}, module: module})
    si.test(fin)

    var opts = si.options()
    assert.equal(1, opts.internal.a)
    assert.equal(4, opts.internal.d)
    assert.equal(1, opts.internal.foo.aa)
    assert.equal(4, opts.internal.foo.dd)

    opts = si.export('options')
    assert.equal(1, opts.internal.a)
    assert.equal(4, opts.internal.d)
    assert.equal(1, opts.internal.foo.aa)
    assert.equal(4, opts.internal.foo.dd)
    si.close(fin)
  })


  it('options-getset', function (fin) {
    var si = Seneca({internal:{d: 4, foo: {dd: 4}}, module: module})
    si.test(fin)

    si.options({internal:{e: 5, foo: {ee: 5}}})

    var opts = si.options()

    assert.equal(1, opts.internal.a)
    assert.equal(4, opts.internal.d)
    assert.equal(5, opts.internal.e)
    assert.equal(1, opts.internal.foo.aa)
    assert.equal(4, opts.internal.foo.dd)
    assert.equal(5, opts.internal.foo.ee)

    opts = si.export('options')
    assert.equal(1, opts.internal.a)
    assert.equal(4, opts.internal.d)
    assert.equal(5, opts.internal.e)
    assert.equal(1, opts.internal.foo.aa)
    assert.equal(4, opts.internal.foo.dd)
    assert.equal(5, opts.internal.foo.ee)
    si.close(fin)
  })


  it('options-file-js', function (fin) {
    var si0 = Seneca({from: __dirname + '/options.require.js'},
                     {internal:{d: 4, foo: {dd: 4}}, module: module})
    si0.test(fin)

    var opts = si0.options()
    assert.equal(1, opts.internal.a)
    assert.equal(4, opts.internal.d)
    assert.equal(2, opts.internal.b)
    assert.equal(1, opts.internal.foo.aa)
    assert.equal(4, opts.internal.foo.dd)
    assert.equal(2, opts.internal.foo.bb)

    opts = si0.export('options')
    assert.equal(1, opts.internal.a)
    assert.equal(4, opts.internal.d)
    assert.equal(2, opts.internal.b)
    assert.equal(1, opts.internal.foo.aa)
    assert.equal(4, opts.internal.foo.dd)
    assert.equal(2, opts.internal.foo.bb)
    si0.close(fin)
  })


  // DEPRECATED: Remove when Seneca >= 4.x
  it('legacy-options-file-js', function (fin) {
    var si0 = Seneca({internal:{d: 4, foo: {dd: 4}}, module: module})
    si0.test(fin)

    si0.options(__dirname + '/options.require.js')

    var opts = si0.options()
    assert.equal(1, opts.internal.a)
    assert.equal(4, opts.internal.d)
    assert.equal(2, opts.internal.b)
    assert.equal(1, opts.internal.foo.aa)
    assert.equal(4, opts.internal.foo.dd)
    assert.equal(2, opts.internal.foo.bb)

    opts = si0.export('options')
    assert.equal(1, opts.internal.a)
    assert.equal(4, opts.internal.d)
    assert.equal(2, opts.internal.b)
    assert.equal(1, opts.internal.foo.aa)
    assert.equal(4, opts.internal.foo.dd)
    assert.equal(2, opts.internal.foo.bb)
    si0.close(fin)
  })


  it('options-file-json', function (fin) {
    var si0 = Seneca(__dirname + '/options.file.json',
                     {internal:{d: 4, foo: {dd: 4}}, module: module})
    si0.test(fin)

    var opts = si0.options()
    assert.equal(1, opts.internal.a)
    assert.equal(4, opts.internal.d)
    assert.equal(3, opts.internal.c)
    assert.equal(1, opts.internal.foo.aa)
    assert.equal(4, opts.internal.foo.dd)
    assert.equal(3, opts.internal.foo.cc)

    opts = si0.export('options')
    assert.equal(1, opts.internal.a)
    assert.equal(4, opts.internal.d)
    assert.equal(3, opts.internal.c)
    assert.equal(1, opts.internal.foo.aa)
    assert.equal(4, opts.internal.foo.dd)
    assert.equal(3, opts.internal.foo.cc)
    si0.close(fin)
  })


  it('options-file-json-nomore', function (fin) {
    // does NOT load seneca.options.js due to module reference from unit test
    var si0 = Seneca(__dirname + '/options.file.json')
    si0.test(fin)

    var opts = si0.options()
    assert.equal(3, opts.internal.c)
    assert.equal(3, opts.internal.foo.cc)

    opts = si0.export('options')
    assert.equal(3, opts.internal.c)
    assert.equal(3, opts.internal.foo.cc)
    si0.close(fin)
  })


  it('options-env', function (fin) {
    process.env.SENECA_OPTIONS = '{"internal":{"foo":"bar","a":99}}'
    var si = Seneca().test(fin)

    var opts = si.options()

    assert.equal('bar', opts.internal.foo)
    assert.equal(99, opts.internal.a)
    si.close(()=>{
      delete process.env.SENECA_OPTIONS
      fin()
    })
  })


  it('options-cmdline', function (fin) {
    let argv = [...process.argv]
    process.argv.push('--seneca.options.internal.cfoo=bar')
    process.argv.push('--seneca.options.internal.ca=99')

    var si = Seneca().test(fin)

    var opts = si.options()

    assert.equal('bar', opts.internal.cfoo)
    assert.equal(99, opts.internal.ca)
    si.close(()=>{
      process.argv = argv
      fin()
    })
  })
})
