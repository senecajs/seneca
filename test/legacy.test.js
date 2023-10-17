/* Copyright © 2010-2022 Richard Rodger and other contributors, MIT License. */
'use strict'

const Util = require('util')

const Lab = require('@hapi/lab')
const Code = require('@hapi/code')

const lab = (exports.lab = Lab.script())
const describe = lab.describe
const expect = Code.expect

const { Legacy } = require('../lib/legacy.js')

const Shared = require('./shared')
const it = Shared.make_it(lab)

const Seneca = require('..')

// TODO: move all legacy functions here and isolate lack of test coverage

describe('legacy', function () {
  it('nil', function (fin) {
    Legacy.nil({ msg: 1 }, function reply() {
      fin()
    })
  })

  it('copydata', function (fin) {
    expect(Legacy.copydata()).to.equal(void 0)
    expect(Legacy.copydata(null)).to.equal(null)
    expect(Legacy.copydata(NaN)).to.equal(NaN)
    expect(Legacy.copydata(true)).to.equal(true)
    expect(Legacy.copydata(false)).to.equal(false)
    expect(Legacy.copydata(0)).to.equal(0)
    expect(Legacy.copydata(1)).to.equal(1)

    var d = new Date()
    expect(Legacy.copydata(d).getTime()).to.equal(d.getTime())

    expect(Legacy.copydata([])).to.equal([])
    expect(Legacy.copydata([1, 2, 3])).to.equal([1, 2, 3])
    expect(Legacy.copydata([1, ['a', 'b'], 3])).to.equal([1, ['a', 'b'], 3])

    expect(Legacy.copydata({})).to.equal({})
    expect(Legacy.copydata({ a: 1 })).to.equal({ a: 1 })
    expect(Legacy.copydata({ a: 1, b: { c: 2 } })).to.equal({
      a: 1,
      b: { c: 2 },
    })

    var a = { a: 1 }
    var b = Object.create(a)
    b.b = 2
    expect(Legacy.copydata(b)).to.equal({ b: 2 })

    fin()
  })

  it('recurse', function (fin) {
    Legacy.recurse(
      [1, 2, 3],
      function (i, next) {
        next()
      },
      fin,
    )
  })

  it('fail', function (fin) {
    var f0 = Legacy.make_legacy_fail({})
    var e0 = f0.call({ log: { error: function () {} } }, { code: 'foo' })
    expect(e0.code).equal('foo')
    fin()
  })

  it('argprops', function (fin) {
    var out = Seneca.util.argprops(
      { a: 1, b: 2, c: 3 },
      { b: 22, c: 33, d: 4 },
      { c: 333 },
      ['d'],
    )
    expect(out).to.include({ a: 1, b: 22, c: 333 })

    out = Seneca.util.argprops({}, { d: 1 }, {}, 'd')
    expect('{}').to.equal(Util.inspect(out))

    out = Seneca.util.argprops({}, { d: 1, e: 2 }, {}, 'd, e')
    expect('{}').to.equal(Util.inspect(out))
    fin()
  })

  it('router', function (fin) {
    expect(Seneca.util.router()).exists()
    fin()
  })

  it('no-default-transport', function (fin) {
    Seneca({ default_plugins: { transport: false } })
      .test()
      .ready(function () {
        expect(this.list_plugins().transport).not.exists()
        fin()
      })
  })

  it('actdef', function (fin) {
    Seneca({ legacy: { actdef: true } })
      .test(fin)
      .add('a:1')
      .act('a:1')
      .ready(fin)
    fin()
  })

  it('meta_arg_remove', function (fin) {
    Seneca({ legacy: { meta_arg_remove: true } })
      .test(fin)
      .add('a:1', (msg, reply, meta) => {
        expect(msg).includes({ x: 2 })
        expect(reply).function()
        expect(meta).not.exists()
        reply({ y: 3 })
      })
      .act('a:1', { x: 2 }, (err, out, meta) => {
        expect(err).not.exists()
        expect(out).includes({ y: 3 })
        expect(meta).not.exists()
        fin()
      })
  })


  it('act_if', function (done) {
    var si = Seneca({ log: 'silent' })

    si.add({ op: 'foo' }, function (args, next) {
      next(null, 'foo' + args.bar)
    })

    si.act_if(true, { op: 'foo', bar: '1' }, function (err, out) {
      expect(err).equal(null)
      expect('foo1').equal(out)
    })

    si.act_if(false, { op: 'foo', bar: '2' }, function () {
      expect(true).equal(false)
    })

    si.act_if(true, 'op:foo,bar:3', function (err, out) {
      expect(err).equal(null)
      expect('foo3').equal(out)
    })

    try {
      si.act_if({ op: 'foo', bar: '2' }, function () {
        expect(true).equal(false)
      })
      expect(true).equal(false)
    }
    catch (e) {
      expect(e.message).match(/not of type boolean/)
    }

    si = Seneca({log:'test'})
      .add('a:1', function (msg, reply) {
        reply({ b: msg.a + 1 })
      })
      .add('a:2', function (msg, reply) {
        reply({ b: msg.a + 2 })
      })

    si.act_if(true, 'a:1', function (err, out) {
      expect(!err).true()
      expect(2).equal(out.b)

      si.act_if(false, 'a:2', function () {
        expect(true).equal(false)
      })

      process.nextTick(done)
    })
  })

})
