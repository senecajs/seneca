/* Copyright (c) 2010-2018 Richard Rodger, MIT License */
'use strict'

const assert = require('node:assert/strict')
const { describe, it } = require('node:test')

var Seneca = require('..')

describe('api', function () {
  var si = Seneca({ log: 'silent' })

  function z(msg, reply) {
    reply({ z: msg.z })
  }

  it('error', function (t, fin) {
    si = si.test()

    try {
      si.error()
    } catch (e) {
      assert.equal(e.code, 'no_error_code')
    }

    try {
      si.error(null)
    } catch (e) {
      assert.equal(e.code, 'no_error_code')
    }

    var e0 = si.error('test_args', {
      arg0: 'foo',
      arg1: { bar: 1 },
      not_an_arg: 1,
    })
    assert.equal(e0.code, 'test_args')
    assert.equal(e0.message, 'seneca: Test args foo {bar:1}.')
    assert.deepEqual(e0.details, {
      arg0: 'foo',
      arg1: { bar: 1 },
      not_an_arg: 1,
    })
    assert.equal(e0.seneca, true)

    fin()
  })

  describe('fail', function () {
    it('invoked with a code and details', function (t, fin) {
      try {
        si.fail('test_args', { arg0: 'foo', arg1: { bar: 1 }, not_an_arg: 1 })
      } catch (err) {
        assert.equal(err.code, 'test_args')
        assert.equal(err.message, 'seneca: Test args foo {bar:1}.')
        assert.deepEqual(err.details, {
          arg0: 'foo',
          arg1: { bar: 1 },
          not_an_arg: 1,
        })
        assert.equal(err.seneca, true)

        return fin()
      }

      return fin(new Error('Expected the "fail" method to throw.'))
    })

    describe('invoked with a condition, code and details', function () {
      describe('when the condition is true', function () {
        it('throws', function (t, fin) {
          try {
            si.fail(true, 'test_args', {
              arg0: 'foo',
              arg1: { bar: 1 },
              not_an_arg: 1,
            })
          } catch (err) {
            assert.equal(err.code, 'test_args')
            assert.equal(err.message, 'seneca: Test args foo {bar:1}.')
            assert.deepEqual(err.details, {
              arg0: 'foo',
              arg1: { bar: 1 },
              not_an_arg: 1,
            })
            assert.equal(err.seneca, true)

            return fin()
          }

          return fin(new Error('Expected the "fail" method to throw.'))
        })
      })

      describe('when the condition is false', function () {
        it('does not throw', function (t, fin) {
          try {
            si.fail(false, 'test_args', {
              arg0: 'foo',
              arg1: { bar: 1 },
              not_an_arg: 1,
            })
          } catch (err) {
            return fin(new Error('Expected the "fail" method to not throw.'))
          }

          return fin()
        })
      })

      describe('when the condition is not a boolean', function () {
        it('throws informing the client of the wrong type', function (t, fin) {
          try {
            si.fail(0, 'test_args', {
              arg0: 'foo',
              arg1: { bar: 1 },
              not_an_arg: 1,
            })
          } catch (err) {
            assert.equal(err.code, 'fail_cond_must_be_bool')

            assert.equal(
              err.message,
              'seneca: The Seneca.fail method expected the `cond` param to be a boolean.',
            )

            assert.equal(err.seneca, true)

            return fin()
          }

          return fin(new Error('Expected the "fail" method to throw.'))
        })
      })
    })

    describe('when given no arguments', function () {
      it('throws a seneca error', function (t, fin) {
        try {
          si.fail()
        } catch (err) {
          assert.equal(err.code, 'no_error_code')
          assert.equal(err.seneca, true)

          return fin()
        }

        return fin(new Error('Expected the "fail" method to throw.'))
      })
    })

    describe('when given too many arguments', () => {
      it('throws a seneca error', function (t, fin) {
        try {
          si.fail(
            true,
            'test_args',
            { arg0: 'foo', arg1: { bar: 1 }, not_an_arg: 1 },
            2,
          )
        } catch (err) {
          assert.equal(err.code, 'fail_wrong_number_of_args')

          assert.equal(
            err.message,
            'seneca: The Seneca.fail method was called with the wrong number of arguments: 4',
          )

          assert.equal(err.seneca, true)

          return fin()
        }

        return fin(new Error('Expected the "fail" method to throw.'))
      })
    })
  })

  it('list', function (t, fin) {
    si = si.test()

    assert.ok(si.list().length > 5)

    var nump = si.list({}).length
    assert.ok(nump > 5)
    assert.deepEqual(si.list('a:1'), [])

    si.add('a:1', function () {})

    assert.equal(si.list({}).length, nump + 1)
    assert.deepEqual(si.list('a:1'), [{ a: '1' }])
    assert.deepEqual(si.list({ a: 1 }), [{ a: '1' }])
    assert.deepEqual(si.list({ a: '1' }), [{ a: '1' }])

    si.test().add('a:1,b:2', function () {})

    assert.deepEqual(si.list('a:1'), [{ a: '1' }, { a: '1', b: '2' }])
    assert.deepEqual(si.list({ a: 1 }), [{ a: '1' }, { a: '1', b: '2' }])
    assert.deepEqual(si.list({ a: '1' }), [{ a: '1' }, { a: '1', b: '2' }])

    assert.deepEqual(si.list('b:2'), [{ a: '1', b: '2' }])
    assert.deepEqual(si.list({ b: 2 }), [{ a: '1', b: '2' }])
    assert.deepEqual(si.list({ b: '2' }), [{ a: '1', b: '2' }])

    fin()
  })

  it('translate', function (t, fin) {
    si.test()
      .add('a:2', function (msg, reply) {
        reply(msg)
      })
      .add('a:4', function (msg, reply) {
        reply(msg)
      })
      .add('b:3', function (msg, reply) {
        reply(msg)
      })
      .add('a:5', function (msg, reply) {
        reply({ a: 5, x: msg.x, y: msg.y })
      })
      .add('e:5,f:1', function (msg, reply) {
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
      .act('a:1', function (err, out) {
        assert.partialDeepStrictEqual(out, { a: 2 })
      })
      .act('a:3', function (err, out) {
        assert.partialDeepStrictEqual(out, { a: 4 })
      })
      .act('c:3,d:4', function (err, out) {
        assert.partialDeepStrictEqual(out, { b: 3, c: 3, d: 4 })
      })

      // y is removed as not picked
      .act('a:6,x:1,y:2', function (err, out) {
        assert.partialDeepStrictEqual(out, { a: 5, x: 1 })
      })
      // x is removed as not picked
      .act('a:7,x:1,y:2', function (err, out) {
        assert.partialDeepStrictEqual(out, { a: 5, y: 2 })
      })

      // y is removed as not picked
      .act('a:8,x:1,y:2', function (err, out) {
        assert.partialDeepStrictEqual(out, { a: 5, x: 1 })
      })
      // x is removed as not picked
      .act('a:9,x:1,y:2', function (err, out) {
        assert.partialDeepStrictEqual(out, { a: 5, y: 2 })
      })

      // y is removed as not picked
      .act('a:10,x:1,y:2', function (err, out) {
        assert.partialDeepStrictEqual(out, { a: 5, x: 1 })
      })
      // x is removed as not picked
      .act('a:11,x:1,y:2', function (err, out) {
        assert.partialDeepStrictEqual(out, { a: 5, y: 2 })
      })

      // with pick, unused from props are dropped
      .act('e:6,g:1,x:1,y:2', function (err, out) {
        assert.deepEqual(this.util.clean(out), { e: 5, x: 1, f: 1 })
      })

      // ... unless explicitly added
      .act('e:7,g:1,x:1,y:2', function (err, out) {
        assert.deepEqual(this.util.clean(out), { e: 5, g: 1, x: 1, f: 1 })
      })

      .ready(fin)
  })

  it('test-mode', function (t, fin) {
    // var si0 = Seneca({ id$: 'foo', tag: null, log: 'silent' })
    var si0 = Seneca({ id$: 'foo', log: 'silent' })
    si0.error(console.log)
    si0.test()
    assert.equal(si0.id, 'foo')

    var si1 = Seneca({ tag: 't0', log: 'silent' })
    si1.options({ errhandler: null })
    si1.test(console.log)
    assert.ok(si1.id.endsWith('/t0'))

    var si2 = Seneca({ id$: 'bar', tag: 't0', log: 'silent' })
    si2.test()
    assert.equal(si2.id, 'bar')

    fin()
  })

  it('find_plugin', function (t, fin) {
    var si = Seneca().test(fin)
    si.use(function foo() {})
    si.use({ tag: 't0', name: 'bar', init: function bar() {} })

    si.ready(function () {
      assert.equal(si.find_plugin('foo').name, 'foo')
      assert.equal(si.find_plugin('bar', 't0').name, 'bar')

      assert.equal(si.find_plugin({ name: 'foo' }).name, 'foo')
      assert.equal(si.find_plugin({ name: 'bar', tag: 't0' }).name, 'bar')

      fin()
    })
  })

  it('has_plugin', function (t, fin) {
    var si = Seneca.test(fin)

    si.use(function foo() {})
    si.use({ init: function () {}, name: 'bar', tag: 'aaa' })

    si.ready(function () {
      assert.equal(si.has_plugin('foo'), true)
      assert.equal(si.has_plugin('bar'), false)
      assert.equal(si.has_plugin('bar', 'bbb'), false)
      assert.equal(si.has_plugin('bar', 'aaa'), true)

      si.close(fin)
    })
  })

  it('ignore_plugin', function (t, fin) {
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
    si.use({ tag: 't0', name: 'red', init: function () {} })
    si.use({ tag: 't1', name: 'red', init: function () {} })

    si.ready(function () {
      assert.equal(si.has_plugin('foo'), false)
      assert.equal(si.has_plugin('bar'), true)
      assert.equal(si.has_plugin('zed'), false)
      assert.equal(si.has_plugin('qaz'), true)
      assert.equal(si.has_plugin('red', 't0'), false)
      assert.equal(si.has_plugin('red', 't1'), false)

      si.ignore_plugin('zed', false)
      si.use(zed)
      si.ready(function () {
        assert.equal(si.has_plugin('zed'), true)
        assert.equal(tmp.a, 1)
        si.close(fin)
      })
    })
  })

  it('has', function (t, fin) {
    si = si.test()

    assert.equal(si.has('h:1'), false)
    assert.equal(si.has('g:1'), false)

    si.add('h:1', function () {})

    assert.equal(si.has('h:1'), true)
    assert.equal(si.has('g:1'), false)

    assert.equal(si.has('h:1,x:1'), false)

    si.add('h:1,g:1', function () {})
    assert.equal(si.has('h:1'), true)
    assert.equal(si.has('g:1'), false)
    assert.equal(si.has('h:1,g:1'), true)
    assert.equal(si.has('h:1,g:1,x:1'), false)

    fin()
  })

  it('find', function (t, fin) {
    var seneca = Seneca()
      .test(fin)
      .add('a:1', z)
      .add('a:1,b:2', z)
      .add('a:1,b:2,c:3', z)
      .add('a:2', z)

    assert.equal(seneca.has('a:1'), true)
    assert.equal(seneca.has({ a: 1 }), true)

    assert.equal(seneca.has('a:1,b:2'), true)
    assert.equal(seneca.has('a:1,b:2,c:3'), true)

    assert.equal(seneca.has('not:0'), false)

    assert.equal(seneca.find('a:1').pattern, 'a:1')
    assert.equal(seneca.find({ a: 1 }).pattern, 'a:1')

    assert.equal(seneca.find('a:1,b:2').pattern, 'a:1,b:2')
    assert.equal(seneca.find('a:1,b:2,c:3').pattern, 'a:1,b:2,c:3')

    assert.deepEqual(seneca.list('a:1'), [
      { a: '1' },
      { a: '1', b: '2' },
      { a: '1', b: '2', c: '3' },
    ])
    assert.deepEqual(seneca.list('a:1,b:2'), [
      { a: '1', b: '2' },
      { a: '1', b: '2', c: '3' },
    ])
    assert.deepEqual(seneca.list('a:1,b:2,c:3'), [{ a: '1', b: '2', c: '3' }])
    assert.deepEqual(seneca.list({ a: 1, b: 2, c: 3 }), [
      { a: '1', b: '2', c: '3' },
    ])

    assert.deepEqual(seneca.list('a:*'), [
      { a: '1' },
      { a: '1', b: '2' },
      { a: '1', b: '2', c: '3' },
      { a: '2' },
    ])

    assert.deepEqual(seneca.list('b:*'), [
      { a: '1', b: '2' },
      { a: '1', b: '2', c: '3' },
    ])

    assert.deepEqual(seneca.list('c:*'), [{ a: '1', b: '2', c: '3' }])

    assert.deepEqual(seneca.list({ c: '*' }), [{ a: '1', b: '2', c: '3' }])

    assert.equal(seneca.find(), null)
    assert.equal(seneca.find(''), null)
    assert.equal(seneca.find('not-here:at-all'), null)

    seneca.add('')

    assert.equal(seneca.find().pattern, '')
    assert.equal(seneca.find('').pattern, '')
    assert.equal(seneca.find('not-here:at-all').pattern, '')

    fin()
  })

  it('status', function (t, fin) {
    var si = Seneca().test(fin)

    assert.equal(si.status().stats.act.calls, 0)
    assert.equal(si.status({ stats: false }).stats.act.calls, 0)

    si.ready(function () {
      assert.equal(si.status().stats.act.calls, 1)
      assert.equal(si.status().stats.act.done, 1)
      assert.equal(si.status().history.total, 0)
      assert.equal(si.status().transport.register.length, 0)
      fin()
    })
  })

  it('options-tag', function (t, fin) {
    // Custom instance id does not contain the tag.
    var s0 = Seneca({ id$: 'custom-id' }).test(fin)
    assert.equal(s0.id, 'custom-id')

    s0.options({ tag: 't0' })
    assert.equal(s0.tag, 't0')
    assert.equal(s0.id, 'custom-id/t0')

    s0.options({ tag: 't1' })
    assert.equal(s0.id, 'custom-id/t1')

    // Generated instance id ends with the tag.
    var s1 = Seneca().test(fin)
    var id1 = s1.id
    assert.equal(id1.endsWith('/-'), true)

    s1.options({ tag: 't2' })
    assert.equal(s1.id, id1.substring(0, id1.length - 1) + 't2')

    fin()
  })

  it('reply', function (t, fin) {
    var si = Seneca().test(fin)
    assert.equal(si.reply(), false)
    assert.equal(si.reply({ out: { z: 1 } }), false)
    assert.equal(si.reply({ meta: { id: 'foo' }, out: { z: 2 } }), false)

    si.add('a:1', function () {}).act('a:1,id$:aa/bb', function (err, out) {
      assert.ifError(err)
      assert.equal(out.x, 1)
      fin()
    })

    setImmediate(function () {
      si.reply({ meta: { id: 'aa/bb' }, out: { x: 1 } })
    })
  })

  it('delegate', function (t, fin) {
    var si = Seneca().test(fin)

    si.add('a:1', function (msg, reply) {
      this.context.bar = 2
      this.context.zed = 4
      this.act('b:1', reply)
    })

    si.add('b:1', function (msg, reply) {
      assert.deepEqual(this.context, { foo: 1, bar: 2, zed: 4 })
      reply()
    })

    si.context.foo = 1
    si.context.zed = 3

    si.act('a:1', fin)
  })
})
