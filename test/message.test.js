/* Copyright (c) 2017 Richard Rodger, MIT License */
'use strict'

var tmx = parseInt(process.env.TIMEOUT_MULTIPLIER || 1, 10)

const assert = require('node:assert/strict')

const { describe, it } = require('node:test')

var Seneca = require('..')

var Transports = require('./stubs/transports.js')

var parents = (meta, i) => meta.parents.map((x) => x[null == i ? 0 : i])

var is_uniq = (arr) => arr.length === new Set(arr).size

var test_opts = { timeout: 5555 * tmx }

describe('message', function () {
  it('happy-parents', test_opts, function (t, fin) {
    Seneca({ tag: 'h0' })
      .test(fin)
      .add('a:1', function a1(msg, reply, meta) {
        assert.deepEqual(parents(meta), [])

        var m1 = { x1: 1 }
        this.act('a:2', m1, reply)
      })
      .add('a:2', function a2(msg, reply, meta) {
        assert.deepEqual(parents(meta), ['a:1'])
        assert.equal(msg.x1, 1)

        var m2 = { x2: 2 }
        this.act('a:3', m2, reply)
      })
      .add('a:3', function a3(msg, reply, meta) {
        assert.deepEqual(parents(meta), ['a:2', 'a:1'])

        // Ensure no duplicate message ids
        assert.equal(is_uniq(parents(meta, 1)), true)

        assert.equal(msg.x2, 2)

        var m3 = { x3: 3 }
        this.act('a:4', m3, reply)
      })
      .add('a:4', function a4(msg, reply, meta) {
        assert.deepEqual(parents(meta), ['a:3', 'a:2', 'a:1'])
        assert.equal(is_uniq(parents(meta, 1)), true)

        assert.equal(msg.x3, 3)

        var m4 = { x4: msg.x }
        reply(m4)
      })
      .act('a:1,x:1', function (err, out, meta) {
        assert.deepEqual(
          this.util.flatten(meta.trace, 'trace').map((x) => x.desc[0]),
          ['a:2', 'a:3', 'a:4'],
        )
        fin()
      })
  })

  it('complex-parents', test_opts, function (_t, fin) {
    var mark = {}
    Seneca({ tag: 'h0' })
      .test(fin)
      .add('a:1', function a1(msg, reply, meta) {
        //console.log('CP ', meta.action, meta.pattern, parents(meta), meta.trace)
        assert.deepEqual(parents(meta), [])

        mark.a1c = 1
        this.act('a:2', msg)
        //console.log('CP t', meta.action, meta.trace)

        this.act('a:3', msg, function (err, out, meta) {
          mark.a3r = 1

          //console.log('CP tr', meta.action, meta.trace)

          this.act('a:4', msg)

          this.act('a:5', msg, function (err, out, meta) {
            mark.a5r = 1

            //console.log('CP trr', meta.action, meta.trace)

            reply()
          })
        })
      })
      .add('a:2', function a2(msg, reply, meta) {
        //console.log('CP ', meta.action, meta.pattern, parents(meta), meta.trace)

        //assert.deepEqual(parents(meta), ['a:1'])
        //assert.deepEqual(msg.x1, msg.x)

        mark.a2c = 1
        //this.act('a:3', msg, reply)
        reply(msg)
      })
      .add('a:3', function a3(msg, reply, meta) {
        //console.log('CP ', meta.action, meta.pattern, parents(meta), meta.trace)

        //assert.deepEqual(parents(meta), ['a:2', 'a:1'])
        //assert.deepEqual(msg.x2, msg.x)

        mark.a3c = 1
        //this.act('a:4', msg, reply)
        reply(msg)
      })
      .add('a:4', function a4(msg, reply, meta) {
        //console.log('CP ', meta.action, meta.pattern, parents(meta), meta.trace)

        //assert.deepEqual(parents(meta), ['a:3', 'a:2', 'a:1'])
        //assert.deepEqual(msg.x3, msg.x)

        mark.a4c = 1
        reply(msg)
      })
      .add('a:5', function a4(msg, reply, meta) {
        //console.log('CP ', meta.action, meta.pattern, parents(meta), meta.trace)

        //assert.deepEqual(parents(meta), ['a:3', 'a:2', 'a:1'])
        //assert.deepEqual(msg.x3, msg.x)

        mark.a5c = 1
        reply(msg)
      })
      .act('a:1,x:10,y:20', function (err, out, meta) {
        /*
        assert.deepEqual(this.util.flatten(meta.trace, 'trace').map((x) => x.desc[0]), ['a:2', 'a:3', 'a:4'])
        */

        //console.log('CP mark', mark)
        assert.equal(
          JSON.stringify(mark),
          '{"a1c":1,"a2c":1,"a3c":1,"a3r":1,"a4c":1,"a5c":1,"a5r":1}',
        )

        //console.dir(meta,{depth:null})

        fin()
      })
  })

  it('loop', test_opts, function (t, fin) {
    var i = 0
    Seneca({ id$: 'loop', idlen: 4, limits: { maxparents: 3 } })
      .test()
      .quiet()
      .add('a:1', function a1(msg, reply, meta) {
        assert.equal(is_uniq(parents(meta, 1)), true)

        i++
        if (4 < i) {
          throw new Error('failed to catch loop i=' + i)
        }
        this.act('a:1', msg, reply)
      })
      .act('a:1', function (err, out) {
        assert.equal(i, 4)
        assert.equal(err.code, 'maxparents')
        // console.log(err.details.parents)
        assert.deepEqual(err.details.parents, [
          'a:1 root$/a1/8',
          'a:1 root$/a1/8',
          'a:1 root$/a1/8',
          'a:1 root$/a1/8',
        ])

        fin()
      })
  })

  it('branch', test_opts, function (t, fin) {
    var log = []
    Seneca({ id$: 'branch', idlen: 4, limits: { maxparents: 3 } })
      .test(fin)
      .add('a:1', function a1(msg, reply, meta) {
        log.push('a1')
        assert.deepEqual(parents(meta), [])
        msg.a1 = 1
        this.act('b:1,a:null', msg)
        this.act('a:2', msg, reply)
      })
      .add('a:2', function a2(msg, reply, meta) {
        assert.deepEqual(parents(meta), ['a:1'])
        log.push('a2')

        this.act('c:1,a:null', { a2: 1 })
        this.act('a:3', { a2: 1 }, function (err, out, meta) {
          assert.partialDeepStrictEqual(meta.trace, [
            {
              desc: ['a:4'],
              trace: [],
            },
          ])

          log.push('a2r')
          this.act('c:2,a:null', { a2: 1, a2r: 1 })

          // capture c2
          setImmediate(reply.bind(null, err, out))
        })
      })
      .add('a:3', function a3(msg, reply, meta) {
        assert.deepEqual(parents(meta), ['a:2', 'a:1'])
        assert.equal(is_uniq(parents(meta, 1)), true)

        log.push('a3')
        this.act('a:4', { a3: 1 }, reply)
      })
      .add('a:4', function a3(msg, reply, meta) {
        assert.deepEqual(parents(meta), ['a:3', 'a:2', 'a:1'])
        assert.equal(is_uniq(parents(meta, 1)), true)

        log.push('a4')
        reply({ a4: 1 })
      })
      .add('b:1', function b1(msg, reply, meta) {
        assert.deepEqual(parents(meta), ['a:1'])
        log.push('b1')
        reply()
      })
      .add('c:1', function c1(msg, reply, meta) {
        assert.deepEqual(parents(meta), ['a:2', 'a:1'])
        assert.equal(is_uniq(parents(meta, 1)), true)

        log.push('c1')
        reply()
      })
      .add('c:2', function c2(msg, reply, meta) {
        assert.deepEqual(parents(meta), ['a:3', 'a:2', 'a:1'])
        assert.equal(is_uniq(parents(meta, 1)), true)

        log.push('c2')
        reply()
      })
      .act('a:1', function (err, out, meta) {
        assert.equal(err, null)
        assert.partialDeepStrictEqual(out, { a4: 1 })
        assert.deepEqual(log, ['a1', 'b1', 'a2', 'c1', 'a3', 'a4', 'a2r', 'c2'])

        assert.partialDeepStrictEqual(meta.trace, [
          { desc: ['b:1'] },
          {
            desc: ['a:2'],
            trace: [
              { desc: ['c:1'] },
              {
                desc: ['a:3'],
                trace: [{ desc: ['a:4'] }, { desc: ['c:2'] }],
              },
            ],
          },
        ])

        fin()
      })
  })

  it('empty-response', test_opts, function (t, fin) {
    var si = Seneca()
      .test(fin)
      .add('a:1', function a1(msg, reply, meta) {
        reply()
      })
      .add('b:1', function b1(msg, reply, meta) {
        this.act('a:1', reply)
      })
      .add('c:1', function c1(msg, reply, meta) {
        this.prior(msg, reply)
      })
      .add('d:1', function d1a(msg, reply, meta) {
        reply()
      })
      .add('d:1', function d1b(msg, reply, meta) {
        this.prior(msg, reply)
      })
      .act('a:1', function (err, out, meta) {
        assert.ifError(err)
        assert.ok(null == out)
        assert.equal(meta.pattern, 'a:1')
      })
      .act('b:1', function (err, out, meta) {
        assert.ifError(err)
        assert.ok(null == out)
        assert.equal(meta.pattern, 'b:1')
        if (!this.options().prior.direct) {
          assert.equal(meta.trace[0].desc[0], 'a:1')
        }
      })
      .act('c:1', function (err, out, meta) {
        assert.ifError(err)
        assert.ok(null == out)
        assert.equal(meta.pattern, 'c:1')
      })
      .act('d:1', function (err, out, meta) {
        assert.ifError(err)
        assert.ok(null == out)
        assert.equal(meta.pattern, 'd:1')
        if (!this.options().prior.direct) {
          assert.equal(meta.trace[0].desc[0], 'd:1')
        }
      })
      .ready(fin)
  })

  it('reply', test_opts, function (t, fin) {
    Seneca()
      .test(fin)
      .add('a:1', function a1(msg, reply, meta) {
        reply({ x: 1 })
      })
      .add('b:1', function b1(msg, reply, meta) {
        msg.x = 2
        reply(msg)
      })
      .gate()
      .act('a:1', function (err, out, meta) {
        assert.equal(meta.pattern, 'a:1')
        assert.match(meta.action, /a1/)
      })
      .act('b:1', function (err, out, meta) {
        assert.equal(meta.pattern, 'b:1')
        assert.match(meta.action, /b1/)
      })
      .ready(fin)
  })

  it('prior', test_opts, function (t, fin) {
    Seneca()
      .test(fin)
      .add('a:1', function a1(msg, reply, meta) {
        reply({ x: 1 })
      })
      .add('a:1', function a1p(msg, reply, meta) {
        this.prior(msg, reply)
      })
      .add('b:1', function b1(msg, reply, meta) {
        this.prior(msg, reply)
      })
      .gate()
      .act('b:1', function (err, out, meta) {
        assert.equal(meta.pattern, 'b:1')
        assert.match(meta.action, /b1/)
      })
      .act('a:1', function (err, out, meta) {
        assert.ifError(err)
        assert.equal(out.x, 1)
        assert.equal(meta.pattern, 'a:1')

        if (!this.options().prior.direct) {
          assert.equal(meta.trace[0].desc[0], 'a:1')
        }
      })
      .ready(fin)
  })

  it('entity', test_opts, function (t, fin) {
    var si = Seneca().test(fin).use('entity')

    si = si.gate()

    var foo = si.make$('foo', { id$: 'a', a: 1 })

    foo.save$(function (err, out, meta) {
      assert.equal(out.toString(), '$-/-/foo;id=a;{a:1}')
      assert.ok(null != meta)
      assert.ok(null != out.canon$)
    })

    foo.list$(function (err, list, meta) {
      assert.equal(list.length, 1)
      assert.ok(null != meta)

      var foo0 = list[0]
      assert.equal(foo0.toString(), '$-/-/foo;id=a;{a:1}')
      assert.ok(null != foo0.canon$)

      fin()
    })
  })

  it('single-simple-transport', test_opts, function (t, fin) {
    var st = Transports.make_simple_transport()

    var s0 = Seneca({ id$: 's0' }).test(fin).use(st).listen({ type: 'simple' })
    s0.id = 's0'

    var c0 = Seneca({
      id$: 'c0',
      timeout: 22222 * tmx,
    })
      .test(fin)
      .use(st)
      .client({ type: 'simple' })
    c0.id = 'c0'

    s0.add('a:1', function a1(msg, reply, meta) {
      reply({ x: 1 })
    })

    s0.ready(function () {
      c0.act('a:1', function (err, out, meta) {
        assert.ifError(err)
        assert.deepEqual(out, { x: 1 })
        assert.equal(meta.pattern, '') // catchall
        assert.equal(meta.trace[0].desc[0], 'a:1')
        fin()
      })
    })
  })

  it('simple-transport', test_opts, function (t, fin) {
    var st = Transports.make_simple_transport()

    var s0 = Seneca({ id$: 's0', log: 'silent' })
      .test(function (err, meta) {
        if (
          'a3err' === err.message ||
          'a33throw' === err.message ||
          't4' === (meta && meta.tx)
        )
          return
        else fin(err)
      }, 'silent')
      .use(st)
      .listen({ type: 'simple' })
    s0.id = 's0'

    var c0 = Seneca({
      id$: 'c0',
      log: 'silent',
      timeout: 22222 * tmx,
    })
      .test(function (err, meta) {
        if (
          'a3err' === err.message ||
          'a33throw' === err.message ||
          't4' === (meta && meta.tx)
        )
          return
        else fin(err)
      }, 'silent')
      .use(st)
      .client({ type: 'simple' })
    c0.id = 'c0'

    s0.add('a:1', function a1(msg, reply, meta) {
      reply()
    })

    s0.add('a:2', function a2(msg, reply, meta) {
      reply({ x: 2 })
    })

    s0.add('a:3', function a3(msg, reply, meta) {
      reply(new Error('a3err'))
    })

    s0.add('a:33', function a3(msg, reply, meta) {
      throw new Error('a33throw')
    })

    s0.add('a:4', function a4(msg, reply, meta) {
      reply({ x: msg.x })
    })
    s0.add('a:4', function a4(msg, reply, meta) {
      this.prior({ x: 4 }, reply)
    })

    s0.ready(function () {
      c0.ready(function () {
        c0.add('b:1', function b1(msg, reply, meta) {
          this.act({ id$: 'b1/' + meta.tx, x: msg.x }, reply)
        })
          .act('a:1,id$:m0/t0', function (err, out, meta) {
            assert.ifError(err)
            assert.ok(null == out)
            assert.equal(meta.id, 'm0/t0')
            assert.equal(meta.pattern, '') // catchall pin
          })
          .act('a:2,id$:m1/t1', function (err, out, meta) {
            assert.ifError(err)
            assert.equal(out.x, 2)
            assert.equal(meta.id, 'm1/t1')
            assert.equal(meta.trace[0].desc[0], 'a:2')
            assert.equal(meta.pattern, '') // catchall pin
            assert.equal(meta.instance, 'c0')
          })
          .act('a:3,id$:m2/t2', function (err, out, meta) {
            assert.equal(out, null)
            assert.equal(err.message, 'a3err')

            assert.equal(meta.err.code, 'act_execute')
            assert.equal(meta.id, 'm2/t2')
          })
          .act('a:33,id$:m33/t33', function (err, out, meta) {
            assert.equal(out, null)
            assert.equal(err.message, 'a33throw')
            assert.equal(meta.id, 'm33/t33')
          })
          .act('a:4,id$:m3/t3', function (err, out, meta) {
            assert.equal(err, null)
            assert.equal(out.x, 4)
            assert.equal(meta.id, 'm3/t3')
            assert.equal(meta.pattern, '') // catchall pin
            assert.equal(meta.instance, 'c0')

            if (!this.options().prior.direct) {
              assert.equal(meta.trace[0].desc[0], 'a:4')
              assert.equal(meta.trace[0].trace[0].desc[0], 'a:4')
            }
          })
          .act('b:1,id$:m4/t4', function (err, out, meta) {
            assert.equal(out, null)
            assert.ok(null != err)
            assert.match(err.message, /seneca/)
          })
          .ready(function () {
            s0.close(c0.close.bind(c0, fin))
          })
      })
    })
  })

  it('partial-patterns', test_opts, function (t, fin) {
    var tmp = { a1: [], b2c3: [] }
    Seneca()
      .test(fin)
      .add('a:1', function a1(msg, reply) {
        tmp.a1.push(msg.x)
        reply()
      })
      .add('a:1,b:2,c:3', function b2c3(msg, reply) {
        tmp.b2c3.push(msg.x)
        reply()
      })
      .act('a:1,x:100')

      // Matches a:1
      .act('a:1,b:2,x:200')

      .act('a:1,b:2,c:3,x:300')
      .ready(function () {
        //console.log(tmp)
        assert.deepEqual(tmp, { a1: [100, 200], b2c3: [300] })
        fin()
      })
  })

  it('validate-active', (t, fin) => {
    let s0 = Seneca({
      legacy: false,
      error: { capture: { callback: false } },
    })
      .test()
      .quiet()
      .add('a:1', { b: Number, c: { d: String } }, function (msg, reply) {
        reply({ b: msg.b, cd: msg.c.d })
      })
      .act('a:1', { b: 22, c: { d: 'AA' } }, function (err, out) {
        assert.ifError(err)
        assert.deepEqual(out, { b: 22, cd: 'AA' })
      })
      .act('a:1', function (err, out) {
        assert.equal(err.code, 'act_invalid_msg')
        assert.match(err.msg, /required/)
      })
      .ready(function () {
        fin()
      })
  })

  it('validate-general-inactive', (t, fin) => {
    let s0 = Seneca({
      legacy: false,
      valid: { active: false },
      error: { capture: { callback: false } },
    })
      .test()
      .quiet()
      .add('a:1', { b: Number, c: { d: String } }, function (msg, reply) {
        reply({ b: msg.b, cd: msg.c.d })
      })
      .act('a:1', { b: 22, c: { d: 'AA' } }, function (err, out) {
        assert.ifError(err)
        assert.deepEqual(out, { b: 22, cd: 'AA' })
      })
      .act('a:1', { c: {} }, function (err, out) {
        assert.ifError(err)
        assert.deepEqual(out, { b: undefined, cd: undefined })
      })
      .ready(function () {
        fin()
      })
  })

  it('validate-message-inactive', (t, fin) => {
    let s0 = Seneca({
      legacy: false,
      valid: { message: false },
      error: { capture: { callback: false } },
    })
      .test()
      .quiet()
      .add('a:1', { b: Number, c: { d: String } }, function (msg, reply) {
        reply({ b: msg.b, cd: msg.c.d })
      })
      .act('a:1', { b: 22, c: { d: 'AA' } }, function (err, out) {
        assert.ifError(err)
        assert.deepEqual(out, { b: 22, cd: 'AA' })
      })
      .act('a:1', { c: {} }, function (err, out) {
        assert.ifError(err)
        assert.deepEqual(out, { b: undefined, cd: undefined })
      })
      .ready(function () {
        fin()
      })
  })
})
