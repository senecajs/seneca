/* Copyright © 2010-2018 Richard Rodger and other contributors, MIT License. */
'use strict'

var Util = require('util')

var Lab = require('@hapi/lab')
var Code = require('code')

var lab = (exports.lab = Lab.script())
var describe = lab.describe
var expect = Code.expect

var Legacy = require('../lib/legacy.js')

var Shared = require('./shared')
var it = Shared.make_it(lab)

var Seneca = require('..')

// TODO: move all legacy functions here and isolate lack of test coverage

describe('legacy', function() {
  it('fail', function(fin) {
    var f0 = Legacy.make_legacy_fail({})
    var e0 = f0.call({ log: { error: function() {} } }, { code: 'foo' })
    expect(e0.code).equal('foo')
    fin()
  })

  it('argprops', function(fin) {
    var out = Seneca.util.argprops(
      { a: 1, b: 2, c: 3 },
      { b: 22, c: 33, d: 4 },
      { c: 333 },
      ['d']
    )
    expect(out).to.include({ a: 1, b: 22, c: 333 })

    out = Seneca.util.argprops({}, { d: 1 }, {}, 'd')
    expect('{}').to.equal(Util.inspect(out))

    out = Seneca.util.argprops({}, { d: 1, e: 2 }, {}, 'd, e')
    expect('{}').to.equal(Util.inspect(out))
    fin()
  })

  it('router', function(fin) {
    expect(Seneca.util.router()).exists()
    fin()
  })

  it('no-default-transport', function(fin) {
    Seneca({ default_plugins: { transport: false } })
      .test()
      .ready(function() {
        expect(this.list_plugins().transport).not.exists()
        fin()
      })
  })

  it('actdef', function(fin) {
    Seneca({ legacy: { actdef: true } })
      .test(fin)
      .add('a:1')
      .act('a:1')
      .ready(fin)
    fin()
  })
})
