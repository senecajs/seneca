/* Copyright © 2010-2018 Richard Rodger and other contributors, MIT License. */
'use strict'

var Util = require('util')

var Lab = require('lab')
var Code = require('code')

var Legacy = require('../lib/legacy.js')
var Seneca = require('..')

var lab = (exports.lab = Lab.script())
var describe = lab.describe
var it = lab.it
var expect = Code.expect

// TODO: move all legacy functions here and isolate lack of test coverage

describe('legacy', function() {
  it('fail', function(fin) {
    var f0 = Legacy.make_legacy_fail({})
    var e0 = f0.call({ log: { error: function() {} } }, { code: 'foo' })
    expect(e0.code).equal('foo')
    fin()
  })

  it('argprops', function(done) {
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
    done()
  })
})
