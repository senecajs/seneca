/* Copyright (c) 2010-2018 Richard Rodger, MIT License */
'use strict'

var Code = require('code')
var Lab = require('@hapi/lab')

var lab = (exports.lab = Lab.script())
var describe = lab.describe
var expect = Code.expect

var Shared = require('./shared')
var it = Shared.make_it(lab)

var Seneca = require('..')

describe('api', function() {
  var si = Seneca({ log: 'silent' })

  function z(msg, reply) {
    reply({ z: msg.z })
  }

  it('error', function(fin) {
    si = si.test()

    try {
      si.error()
    } catch (e) {
      expect(e.code).equal('no_error_code')
    }

    try {
      si.error(null)
    } catch (e) {
      expect(e.code).equal('no_error_code')
    }

    var e0 = si.error('test_args', {
      arg0: 'foo',
      arg1: { bar: 1 },
      not_an_arg: 1
    })
    expect(e0.code).equal('test_args')
    expect(e0.message).equal('seneca: Test args foo { bar: 1 }.')
    expect(e0.details).equal({ arg0: 'foo', arg1: { bar: 1 }, not_an_arg: 1 })
    expect(e0.seneca).true()

    fin()
  })

  it('fail', function(fin) {
    try {
      si.fail('test_args', { arg0: 'foo', arg1: { bar: 1 }, not_an_arg: 1 })
    } catch (e0) {
      expect(e0.code).equal('test_args')
      expect(e0.message).equal('seneca: Test args foo { bar: 1 }.')
      expect(e0.details).equal({ arg0: 'foo', arg1: { bar: 1 }, not_an_arg: 1 })
      expect(e0.seneca).true()
    }

    fin()
  })

  it('list', function(fin) {
    si = si.test()

    expect(si.list().length).above(6)

    var nump = si.list({}).length
    expect(nump).above(6)
    expect(si.list('a:1')).to.equal([])

    si.add('a:1', function() {})

    expect(si.list({}).length).equal(nump + 1)
    expect(si.list('a:1')).equal([{ a: '1' }])
    expect(si.list({ a: 1 })).equal([{ a: '1' }])
    expect(si.list({ a: '1' })).equal([{ a: '1' }])

    si.test().add('a:1,b:2', function() {})

    expect(si.list('a:1')).equal([{ a: '1' }, { a: '1', b: '2' }])
    expect(si.list({ a: 1 })).equal([{ a: '1' }, { a: '1', b: '2' }])
    expect(si.list({ a: '1' })).equal([{ a: '1' }, { a: '1', b: '2' }])

    expect(si.list('b:2')).equal([{ a: '1', b: '2' }])
    expect(si.list({ b: 2 })).equal([{ a: '1', b: '2' }])
    expect(si.list({ b: '2' })).equal([{ a: '1', b: '2' }])

    fin()
  })

  it('translate', function(fin) {
    si.test()
      .add('a:2', function(msg, reply) {
        reply(msg)
      })
      .add('a:4', function(msg, reply) {
        reply(msg)
      })
      .add('b:3', function(msg, reply) {
        reply(msg)
      })
      .add('a:5', function(msg, reply) {
        reply({ a: 5, x: msg.x, y: msg.y })
      })
      .add('e:5,f:1', function(msg, reply) {
        reply(msg)
      })

    si.translate('a:1', 'a:2')
      .translate({ a: 3 }, { a: 4 })
      .translate('c:3,d:4', 'b:3')
      .translate('a:6', 'a:5', 'x')
      .translate('a:7', 'a:5', '-x,y')
      .translate('a:8', 'a:5', ['x'])
      .translate('a:9', 'a:5', ['-x', 'y'])
      .translate('a:10', 'a:5', { x: true })
      .translate('a:11', 'a:5', { x: false, y: true })
      .translate('e:6,g:1', 'e:5,f:1', 'x')
      .translate('e:7,g:1', 'e:5,f:1', 'x,g')

    si.gate()
      .act('a:1', function(err, out) {
        expect(out).contains({ a: 2 })
      })
      .act('a:3', function(err, out) {
        expect(out).contains({ a: 4 })
      })
      .act('c:3,d:4', function(err, out) {
        expect(out).contains({ b: 3, c: 3, d: 4 })
      })

      // y is removed as not picked
      .act('a:6,x:1,y:2', function(err, out) {
        expect(out).contains({ a: 5, x: 1 })
      })
      // x is removed as not picked
      .act('a:7,x:1,y:2', function(err, out) {
        expect(out).contains({ a: 5, y: 2 })
      })

      // y is removed as not picked
      .act('a:8,x:1,y:2', function(err, out) {
        expect(out).contains({ a: 5, x: 1 })
      })
      // x is removed as not picked
      .act('a:9,x:1,y:2', function(err, out) {
        expect(out).contains({ a: 5, y: 2 })
      })

      // y is removed as not picked
      .act('a:10,x:1,y:2', function(err, out) {
        expect(out).contains({ a: 5, x: 1 })
      })
      // x is removed as not picked
      .act('a:11,x:1,y:2', function(err, out) {
        expect(out).contains({ a: 5, y: 2 })
      })

      // with pick, unused from props are dropped
      .act('e:6,g:1,x:1,y:2', function(err, out) {
        expect(this.util.clean(out)).equals({ e: 5, x: 1, f: 1 })
      })

      // ... unless explicitly added
      .act('e:7,g:1,x:1,y:2', function(err, out) {
        expect(this.util.clean(out)).equals({ e: 5, g: 1, x: 1, f: 1 })
      })

      .ready(fin)
  })

  it('test-mode', function(fin) {
    var si0 = Seneca({ id$: 'foo', tag: null, log: 'silent' })
    si0.error(console.log)
    si0.test()
    expect(si0.id).equals('foo')

    var si1 = Seneca({ tag: 't0', log: 'silent' })
    si1.options({ errhandler: null })
    si1.test(console.log)
    expect(si1.id).endsWith('/t0')

    var si2 = Seneca({ id$: 'bar', tag: 't0', log: 'silent' })
    si2.test()
    expect(si2.id).equals('bar')

    fin()
  })

  it('find_plugin', function(fin) {
    var si = Seneca().test(fin)
    si.use(function foo() {})
    si.use({ tag: 't0', name: 'bar', init: function bar() {} })

    si.ready(function() {
      expect(si.find_plugin('foo').name).equals('foo')
      expect(si.find_plugin('bar', 't0').name).equals('bar')

      expect(si.find_plugin({ name: 'foo' }).name).equals('foo')
      expect(si.find_plugin({ name: 'bar', tag: 't0' }).name).equals('bar')

      fin()
    })
  })

  it('has_plugin', function(fin) {
    var si = Seneca.test(fin)

    si.use(function foo() {})
    si.use({ init: function() {}, name: 'bar', tag: 'aaa' })

    si.ready(function() {
      expect(si.has_plugin('foo')).true()
      expect(si.has_plugin('bar')).false()
      expect(si.has_plugin('bar', 'bbb')).false()
      expect(si.has_plugin('bar', 'aaa')).true()

      si.close(fin)
    })
  })

  it('ignore_plugin', function(fin) {
    var si = Seneca.test(fin)

    var tmp = {}
    function zed() {
      tmp.a = 1
    }

    si.ignore_plugin('foo')
    si.ignore_plugin('zed', true)
    si.ignore_plugin('qaz', false)
    si.ignore_plugin('red', 't0', true)
    si.ignore_plugin('red$t1', true)

    si.use(function foo() {})
    si.use(function bar() {})
    si.use(zed)
    si.use(function qaz() {})
    si.use({ tag: 't0', name: 'red', init: function() {} })
    si.use({ tag: 't1', name: 'red', init: function() {} })

    si.ready(function() {
      expect(si.has_plugin('foo')).false()
      expect(si.has_plugin('bar')).true()
      expect(si.has_plugin('zed')).false()
      expect(si.has_plugin('qaz')).true()
      expect(si.has_plugin('red', 't0')).false()
      expect(si.has_plugin('red', 't1')).false()

      si.ignore_plugin('zed', false)
      si.use(zed)
      si.ready(function() {
        expect(si.has_plugin('zed')).true()
        expect(tmp.a).equal(1)
        si.close(fin)
      })
    })
  })

  it('has', function(fin) {
    si = si.test()

    expect(si.has('h:1')).equal(false)
    expect(si.has('g:1')).equal(false)

    si.add('h:1', function() {})

    expect(si.has('h:1')).equal(true)
    expect(si.has('g:1')).equal(false)

    expect(si.has('h:1,x:1')).equal(false)

    si.add('h:1,g:1', function() {})
    expect(si.has('h:1')).equal(true)
    expect(si.has('g:1')).equal(false)
    expect(si.has('h:1,g:1')).equal(true)
    expect(si.has('h:1,g:1,x:1')).equal(false)

    fin()
  })

  it('find', function(fin) {
    var seneca = Seneca()
      .test(fin)
      .add('a:1', z)
      .add('a:1,b:2', z)
      .add('a:1,b:2,c:3', z)
      .add('a:2', z)

    expect(seneca.has('a:1')).to.be.true()
    expect(seneca.has({ a: 1 })).to.be.true()

    expect(seneca.has('a:1,b:2')).to.be.true()
    expect(seneca.has('a:1,b:2,c:3')).to.be.true()

    expect(seneca.has('not:0')).to.be.false()

    expect(seneca.find('a:1').pattern).to.equal('a:1')
    expect(seneca.find({ a: 1 }).pattern).to.equal('a:1')

    expect(seneca.find('a:1,b:2').pattern).to.equal('a:1,b:2')
    expect(seneca.find('a:1,b:2,c:3').pattern).to.equal('a:1,b:2,c:3')

    expect(seneca.list('a:1')).to.equal([
      { a: '1' },
      { a: '1', b: '2' },
      { a: '1', b: '2', c: '3' }
    ])
    expect(seneca.list('a:1,b:2')).to.equal([
      { a: '1', b: '2' },
      { a: '1', b: '2', c: '3' }
    ])
    expect(seneca.list('a:1,b:2,c:3')).to.equal([{ a: '1', b: '2', c: '3' }])
    expect(seneca.list({ a: 1, b: 2, c: 3 })).to.equal([
      { a: '1', b: '2', c: '3' }
    ])

    expect(seneca.list('a:*')).to.equal([
      { a: '1' },
      { a: '1', b: '2' },
      { a: '1', b: '2', c: '3' },
      { a: '2' }
    ])

    expect(seneca.list('b:*')).to.equal([
      { a: '1', b: '2' },
      { a: '1', b: '2', c: '3' }
    ])

    expect(seneca.list('c:*')).to.equal([{ a: '1', b: '2', c: '3' }])

    expect(seneca.list({ c: '*' })).to.equal([{ a: '1', b: '2', c: '3' }])

    expect(seneca.find()).to.equal(null)
    expect(seneca.find('')).to.equal(null)
    expect(seneca.find('not-here:at-all')).to.equal(null)

    seneca.add('')

    expect(seneca.find().pattern).to.equal('')
    expect(seneca.find('').pattern).to.equal('')
    expect(seneca.find('not-here:at-all').pattern).to.equal('')

    fin()
  })

  it('status', function(fin) {
    var si = Seneca({ legacy: { transport: false } }).test(fin)

    expect(si.status().stats.act.calls).equal(0)
    expect(si.status({ stats: false }).stats.act.calls).equal(0)

    si.ready(function() {
      expect(si.status().stats.act.calls).equal(0)
      expect(si.status().stats.act.done).equal(0)
      expect(si.status().history.total).equal(0)
      expect(si.status().transport.register.length).equal(0)
      fin()
    })
  })

  it('reply', function(fin) {
    var si = Seneca({ legacy: { transport: false } }).test(fin)
    expect(si.reply()).equal(false)
    expect(si.reply({ out: { z: 1 } })).equal(false)
    expect(si.reply({ meta: { id: 'foo' }, out: { z: 2 } })).equal(false)

    si.add('a:1', function() {}).act('a:1,id$:aa/bb', function(err, out) {
      expect(err).not.exist()
      expect(out.x).equal(1)
      fin()
    })

    setImmediate(function() {
      si.reply({ meta: { id: 'aa/bb' }, out: { x: 1 } })
    })
  })

  it('delegate', function(fin) {
    var si = Seneca({ legacy: { transport: false } }).test(fin)

    si.add('a:1', function(msg, reply) {
      this.context.bar = 2
      this.context.zed = 4
      this.act('b:1', reply)
    })

    si.add('b:1', function(msg, reply) {
      expect(this.context).equal({ foo: 1, bar: 2, zed: 4 })
      reply()
    })

    si.context.foo = 1
    si.context.zed = 3

    si.act('a:1', fin)
  })
})
