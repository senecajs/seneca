/* Copyright (c) 2017 Richard Rodger, MIT License */
'use strict'

var tmx = parseInt(process.env.TIMEOUT_MULTIPLIER || 1, 10)

var Lab = require('lab')
var Code = require('code')
var Hoek = require('hoek')

var lab = (exports.lab = Lab.script())
var describe = lab.describe
var expect = Code.expect

var Shared = require('./shared')
var it = Shared.make_it(lab)

var Seneca = require('..')

var Transports = require('./stubs/transports.js')

var parents = meta => meta.parents.map(x => x[0])

var partial_match = (obj, pat) => Hoek.contain(obj, pat, { deep: true })

var test_opts = { parallel: false, timeout: 5555 * tmx }

describe('message', function() {
  it('happy-vanilla', test_opts, function(fin) {
    Seneca({ tag: 'h0' })
      .test(fin)
      .add('a:1', function a1(msg, reply, meta) {
        expect(parents(meta)).equal([])

        var m1 = { x1: 1 }
        this.act('a:2', m1, reply)
      })
      .add('a:2', function a2(msg, reply, meta) {
        expect(parents(meta)).equal(['a:1'])
        expect(msg.x1).equal(1)

        var m2 = { x2: 2 }
        this.act('a:3', m2, reply)
      })
      .add('a:3', function a3(msg, reply, meta) {
        expect(parents(meta)).equal(['a:2', 'a:1'])
        expect(msg.x2).equal(2)

        var m3 = { x3: 3 }
        this.act('a:4', m3, reply)
      })
      .add('a:4', function a4(msg, reply, meta) {
        expect(parents(meta)).equal(['a:3', 'a:2', 'a:1'])
        expect(msg.x3).equal(3)

        var m4 = { x4: msg.x }
        reply(m4)
      })
      .act('a:1,x:1', function(err, out, meta) {
        expect(
          this.util.flatten(meta.trace, 'trace').map(x => x.desc[0])
        ).equal(['a:2', 'a:3', 'a:4'])
        fin()
      })
  })

  it('happy-msg', test_opts, function(fin) {
    Seneca({ tag: 'h0' })
      .test(fin)
      .add('a:1', function a1(msg, reply, meta) {
        expect(parents(meta)).equal([])

        msg.x1 = msg.x
        this.act('a:2', msg, reply)
      })
      .add('a:2', function a2(msg, reply, meta) {
        expect(parents(meta)).equal(['a:1'])
        expect(msg.x1).equal(msg.x)

        msg.x2 = msg.x
        this.act('a:3', msg, reply)
      })
      .add('a:3', function a3(msg, reply, meta) {
        expect(parents(meta)).equal(['a:2', 'a:1'])
        expect(msg.x2).equal(msg.x)

        msg.x3 = msg.x
        this.act('a:4', msg, reply)
      })
      .add('a:4', function a4(msg, reply, meta) {
        expect(parents(meta)).equal(['a:3', 'a:2', 'a:1'])
        expect(msg.x3).equal(msg.x)

        msg.x4 = msg.x
        reply(msg)
      })
      .act('a:1,x:1', function(err, out, meta) {
        expect(
          this.util.flatten(meta.trace, 'trace').map(x => x.desc[0])
        ).equal(['a:2', 'a:3', 'a:4'])
        fin()
      })
  })

  it('loop', test_opts, function(fin) {
    var i = 0
    Seneca({ id$: 'loop', idlen: 4, log: 'silent', limits: { maxparents: 3 } })
      .add('a:1', function a1(msg, reply, meta) {
        i++
        if (4 < i) {
          throw new Error('failed to catch loop i=' + i)
        }
        this.act('a:1', msg, reply)
      })
      .act('a:1', function(err, out) {
        expect(i).equal(4)
        expect(err.code).equal('maxparents')
        expect(err.details.parents).equal([
          'a:1 a1_8',
          'a:1 a1_8',
          'a:1 a1_8',
          'a:1 a1_8'
        ])
        fin()
      })
  })

  it('branch', test_opts, function(fin) {
    var log = []
    Seneca({ id$: 'branch', idlen: 4, limits: { maxparents: 3 } })
      .test(fin)
      .add('a:1', function a1(msg, reply, meta) {
        log.push('a1')
        expect(meta.parents.map(x => x[0])).equal([])
        msg.a1 = 1
        this.act('b:1,a:null', msg)
        this.act('a:2', msg, reply)
      })
      .add('a:2', function a2(msg, reply, meta) {
        expect(meta.parents.map(x => x[0])).equal(['a:1'])
        log.push('a2')

        this.act('c:1,a:null', { a2: 1 })
        this.act('a:3', { a2: 1 }, function(err, out, meta) {
          expect(
            partial_match(meta.trace, [
              {
                desc: ['a:4'],
                trace: []
              }
            ])
          ).true()

          log.push('a2r')
          this.act('c:2,a:null', { a2: 1, a2r: 1 })

          // capture c2
          setImmediate(reply.bind(null, err, out))
        })
      })
      .add('a:3', function a3(msg, reply, meta) {
        expect(meta.parents.map(x => x[0])).equal(['a:2', 'a:1'])
        log.push('a3')
        this.act('a:4', { a3: 1 }, reply)
      })
      .add('a:4', function a3(msg, reply, meta) {
        expect(meta.parents.map(x => x[0])).equal(['a:3', 'a:2', 'a:1'])
        log.push('a4')
        reply({ a4: 1 })
      })
      .add('b:1', function b1(msg, reply, meta) {
        expect(meta.parents.map(x => x[0])).equal(['a:1'])
        log.push('b1')
        reply()
      })
      .add('c:1', function c1(msg, reply, meta) {
        expect(meta.parents.map(x => x[0])).equal(['a:2', 'a:1'])
        log.push('c1')
        reply()
      })
      .add('c:2', function c2(msg, reply, meta) {
        expect(meta.parents.map(x => x[0])).equal(['a:3', 'a:2', 'a:1'])
        log.push('c2')
        reply()
      })
      .act('a:1', function(err, out, meta) {
        expect(err).equal(null)
        expect(out).includes({ a4: 1 })
        expect(log).equal(['a1', 'b1', 'a2', 'c1', 'a3', 'a4', 'a2r', 'c2'])

        expect(
          partial_match(meta.trace, [
            { desc: ['b:1'] },
            {
              desc: ['a:2'],
              trace: [
                { desc: ['c:1'] },
                {
                  desc: ['a:3'],
                  trace: [{ desc: ['a:4'] }, { desc: ['c:2'] }]
                }
              ]
            }
          ])
        ).true()

        fin()
      })
  })

  it('custom-basic', test_opts, function(fin) {
    var si = Seneca()
      .test(fin)
      .add('a:1', function a1(msg, reply, meta) {
        meta.custom.a1 = 1
        reply({ x: 1 })
      })
      .add('a:2', function a2(msg, reply, meta) {
        meta.custom.a2 = 1
        msg.x = 2
        reply(msg)
      })

    var foo = { y: 1 }
    var bar = { z: 1 }

    si.gate()
      .act({ a: 1, custom$: foo }, function(err, out, meta) {
        expect(err).equal(null)
        expect(out).includes({ x: 1 })
        expect(foo).equal({ y: 1, a1: 1 })
        expect(meta.custom).equal({ y: 1, a1: 1 })
      })
      .act({ a: 2, custom$: bar }, function(err, out, meta) {
        expect(err).equal(null)
        expect(out).includes({ a: 2, x: 2 })
        expect(bar).equal({ z: 1, a2: 1 })
        expect(meta.custom).equal({ z: 1, a2: 1 })
        fin()
      })
  })

  it('custom-deep', test_opts, function(fin) {
    var si = Seneca()
      .test(fin)
      .add('a:1', function a1(msg, reply, meta) {
        expect(meta.custom.y).equal(meta.custom.z)
        if (2 == meta.custom.y) {
          expect(meta.custom.a2).equal(1)
        }
        if (3 == meta.custom.y) {
          expect(meta.custom.a3).equal(1)
        }

        meta.custom.a1 = 1
        msg.x1 = 1
        reply(this.util.clean(msg))
      })
      .add('a:2', function a2(msg, reply, meta) {
        expect(meta.custom.y).equal(meta.custom.z)
        if (3 == meta.custom.y) {
          expect(meta.custom.a3).equal(1)
        }

        meta.custom.a2 = 1
        msg.x2 = 1
        this.act('a:1', this.util.clean(msg), reply)
      })
      .add('a:3', function a3(msg, reply, meta) {
        expect(meta.custom.y).equal(meta.custom.z)
        meta.custom.a3 = 1
        msg.x3 = 1
        this.act('a:2', this.util.clean(msg), reply)
      })
      .ready(do_a1)

    function do_a1() {
      si.act({ a: 1, q: 1, custom$: { y: 1, z: 1 } }, function(err, out, meta) {
        expect(out).includes({ a: 1, x1: 1 })
        expect(meta.custom).equal({ y: 1, z: 1, a1: 1 })

        do_a2()
      })
    }

    function do_a2() {
      si.act({ a: 2, q: 2, custom$: { y: 2, z: 2 } }, function(err, out, meta) {
        expect(out).includes({ a: 1, x1: 1, x2: 1 })
        expect(meta.custom).equal({ y: 2, z: 2, a1: 1, a2: 1 })

        do_a3()
      })
    }

    function do_a3() {
      si.act({ a: 3, q: 3, custom$: { y: 3, z: 3 } }, function(err, out, meta) {
        expect(out).includes({ a: 1, x1: 1, x2: 1, x3: 1 })
        expect(meta.custom).equal({ y: 3, z: 3, a1: 1, a2: 1, a3: 1 })

        fin()
      })
    }
  })

  it('custom-reply', test_opts, function(fin) {
    var si = Seneca()
      .test(fin)
      .add('a:1', function a1(msg, reply, meta) {
        meta.custom.a1 = 1
        reply({ g: 2 })
      })
      .add('b:1', function b1(msg, reply, meta) {
        meta.custom.b1q = 1

        this.act('a:1', function(err, out, meta) {
          meta.custom.b1w = 1
          reply({ g: out.g, h: 1 })
        })
      })
      .ready(function() {
        this.act('b:1', { custom$: { x: 1 } }, function(err, out, meta) {
          expect(out).equal({ g: 2, h: 1 })
          expect(meta.custom).equal({ x: 1, b1q: 1, a1: 1, b1w: 1 })
          fin()
        })
      })
  })

  it('custom-entity', test_opts, function(fin) {
    var v8 = require('v8')

    var si = Seneca()
      .test(fin)
      .use('entity')
      .add('a:1', function a1(msg, reply, meta1) {
        meta1.custom.a1x = 1
        this.make('foo', { id$: msg.id, q: msg.q }).save$(function(
          err,
          foo1,
          meta2
        ) {
          meta2.custom.a1y = 1
          reply({ foo: foo1 })
        })
      })

      .ready(function() {
        this.act('a:1,id:A,q:1', { custom$: { w: 1 } }, function(
          err,
          out,
          meta
        ) {
          expect('' + out.foo).equal('$-/-/foo;id=A;{q:1}')
          expect(meta.custom).equals({ w: 1, a1x: 1, a1y: 1 })
          fin()
        })
      })
  })

  it('custom-prior', test_opts, function(fin) {
    var si = Seneca()
      .test(fin)
      .add('a:1', function a1(msg, reply, meta) {
        meta.custom.q4 = 1
        reply({ x: msg.x, y: msg.y, z: msg.z })
      })
      .add('a:1', function a2(msg, reply, meta) {
        meta.custom.q3 = 1
        this.prior({ x: msg.x, y: msg.y, z: 1 }, reply)
      })
      .add('a:1', function a3(msg, reply, meta) {
        meta.custom.q2 = 1
        this.prior({ x: msg.x, y: 1 }, reply)
      })
      .act('a:1,x:1', { custom$: { q1: 1 } }, function(err, out, meta) {
        expect(meta.custom).equal({ q1: 1, q2: 1, q3: 1, q4: 1 })
        expect(out).equal({ x: 1, y: 1, z: 1 })
        fin()
      })
  })

  it('custom-simple-transport', test_opts, function(fin) {
    var st = Transports.make_simple_transport()

    var s0 = Seneca({ id$: 's0', legacy: { transport: false } })
      .test(fin)
      .use(st)
      .listen({ type: 'simple' })

    var c0 = Seneca({
      id$: 'c0',
      timeout: 22222 * tmx,
      legacy: { transport: false }
    })
      .test(fin)
      .use(st)
      .client({ type: 'simple' })

    s0.add('a:1', function a1(msg, reply, meta) {
      expect(meta.custom).equal({ q: 1 })
      reply({ x: 1 })
    })

    s0.ready(function() {
      c0.act('a:1', { custom$: { q: 1 } }, function(err, out, meta) {
        expect(err).not.exist()
        expect(out).equal({ x: 1 })
        expect(meta.custom).equal({ q: 1 })

        fin()
      })
    })
  })

  it('custom-bells-transport', test_opts, function(fin) {
    var st = Transports.make_simple_transport()

    var s0 = Seneca({
      id$: 's0',
      legacy: { transport: false },
      limits: { maxparents: 111 }
    })
      .test(fin)
      .use(st)
      .listen({ type: 'simple' })

    var c0 = Seneca({
      id$: 'c0',
      timeout: 22222 * tmx,
      legacy: { transport: false },
      limits: { maxparents: 111 }
    })
      .test(fin)
      .use(st)
      .client({ type: 'simple' })

    s0.add('a:1', function a1A(msg, reply, meta) {
      // console.log('s0 a1 A',meta.custom, msg)
      meta.custom.a1A = 1
      msg.r = 1
      msg.x = 1
      reply(msg)
    })
      .add('a:1', function a1B(msg, reply, meta) {
        // console.log('s0 a1 A',meta.custom)
        meta.custom.a1B = 1
        msg.a = 11
        this.prior(msg, { y: 1 }, reply)
      })
      .add('b:1', function b1(msg, reply, meta) {
        // console.log('s0 b1',meta.custom)
        meta.custom.b1 = 1
        msg.b = 11
        this.act(msg, { a: 1, z: 1 }, reply)
      })
      .add('c:1', function c1(msg, reply, meta) {
        // console.log('s0 c1',meta.custom)
        meta.custom.c1 = 1
        msg.c = 11
        this.act(msg, { b: 1, k: 1 }, reply)
      })
      .add('c:2', function c2(msg, reply, meta) {
        // console.log('s0 c2',meta.custom)
        meta.custom.c2 = 1
        msg.c = 22
        reply(msg)
      })
      .add('c:3', function c3(msg, reply, meta) {
        //console.log('s0 c3',meta)
        meta.custom.c3 = 1
        msg.c = 2
        this.act(msg, function c3r(err, out, meta) {
          // console.log('s0 c3r',meta.custom)
          meta.custom.c3r = 1
          this.act({ c: 1 }, out, reply)
        })
      })

    s0.ready(function() {
      c0.add('d:1', function q1A(msg, reply, meta) {
        // console.log('c0 q1A',meta.custom)
        meta.custom.q1A = 1
        this.act(msg, { c: 3 }, reply)
      })
        .add('d:1', function q1B(msg, reply, meta) {
          // console.log('c0 q1B',meta.custom)
          meta.custom.q1B = 1
          msg.d = 11

          this.prior(msg, { m: 1 }, function q1Br1(err, out, meta) {
            // console.log('c0 q1Br1',meta.custom)
            meta.custom.q1Br1 = 1
            this.act(out, { g: 1, n4: 1 }, reply)
          })
        })
        .add('g:1', function g1(msg, reply, meta) {
          // console.log('c0 g1',meta.custom,msg)
          meta.custom.g1 = 1
          msg.n4 = 1
          msg.g = 2
          this.act(msg, reply)
        })
        .add('g:2', function g2(msg, reply, meta) {
          // console.log('c0 g2',meta.custom,msg)
          meta.custom.g2 = 1
          msg.n3 = 1
          msg.g = 22
          reply(msg)
        })
        .add('h:1', function h1(msg, reply, meta) {
          // console.log('c0 h1',meta.custom)
          meta.custom.h1 = 1
          msg.n2 = 1
          msg.h = 11
          this.act('d:1', msg, reply)
        })
        .add('h:2', function h2(msg, reply, meta) {
          // console.log('c0 h2',meta.custom)
          meta.custom.h2 = 1
          delete msg.custom$
          msg.n1 = 1
          this.act('h:1', msg, reply)
        })

        .ready(function() {
          // Message pathway:
          // h:2->h:1->d:1->d:1-|->c:3->c:2->c:1->b:1->a:1->a:1-|->g:1->g2
          this.act('h:2,p:1', { custom$: { v: 1 } }, function(err, out, meta) {
            expect(this.util.clean(out)).equal({
              g: 22,
              x: 1,
              y: 1,
              z: 1,
              a: 11,
              b: 11,
              k: 1,
              c: 11,
              m: 1,
              h: 11,
              p: 1,
              n1: 1,
              n2: 1,
              n3: 1,
              n4: 1,
              d: 11,
              r: 1
            })
            expect(meta.custom).equal({
              v: 1,
              g1: 1,
              g2: 1,
              h2: 1,
              h1: 1,
              q1B: 1,
              q1Br1: 1,
              q1A: 1,
              c1: 1,
              c2: 1,
              c3: 1,
              c3r: 1,
              b1: 1,
              a1B: 1,
              a1A: 1
            })
            fin()
          })
        })
    })
  })

  it('empty-response', test_opts, function(fin) {
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
      .act('a:1', function(err, out, meta) {
        expect(err).not.exist()
        expect(out).not.exist()
        expect(meta.pattern).equal('a:1')
      })
      .act('b:1', function(err, out, meta) {
        expect(err).not.exist()
        expect(out).not.exist()
        expect(meta.pattern).equal('b:1')
        expect(meta.trace[0].desc[0]).equal('a:1')
      })
      .act('c:1', function(err, out, meta) {
        expect(err).not.exist()
        expect(out).not.exist()
        expect(meta.pattern).equal('c:1')
      })
      .act('d:1', function(err, out, meta) {
        expect(err).not.exist()
        expect(out).not.exist()
        expect(meta.pattern).equal('d:1')
        expect(meta.trace[0].desc[0]).equal('d:1')
      })
      .ready(fin)
  })

  it('reply', test_opts, function(fin) {
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
      .act('a:1', function(err, out, meta) {
        expect(meta.pattern).equal('a:1')
        expect(meta.action).match(/a1/)
      })
      .act('b:1', function(err, out, meta) {
        expect(meta.pattern).equal('b:1')
        expect(meta.action).match(/b1/)
      })
      .ready(fin)
  })

  it('prior', test_opts, function(fin) {
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
      .act('b:1', function(err, out, meta) {
        expect(meta.pattern).equal('b:1')
        expect(meta.action).match(/b1/)
      })
      .act('a:1', function(err, out, meta) {
        expect(err).not.exist()
        expect(out.x).equal(1)
        expect(meta.pattern).equal('a:1')
        expect(meta.trace[0].desc[0]).equal('a:1')
      })
      .ready(fin)
  })

  it('entity', test_opts, function(fin) {
    var si = Seneca()
      .test(fin)
      .use('entity')

    si = si.gate()

    var foo = si.make$('foo', { id$: 'a', a: 1 })

    foo.save$(function(err, out, meta) {
      expect(out.toString()).equal('$-/-/foo;id=a;{a:1}')
      expect(meta).exist()
      expect(out.canon$).exist()
    })

    foo.list$(function(err, list, meta) {
      expect(list.length).equal(1)
      expect(meta).exist()

      var foo0 = list[0]
      expect(foo0.toString()).equal('$-/-/foo;id=a;{a:1}')
      expect(foo0.canon$).exist()

      fin()
    })
  })

  it('single-simple-transport', test_opts, function(fin) {
    var st = Transports.make_simple_transport()

    var s0 = Seneca({ id$: 's0', legacy: { transport: false } })
      .test(fin)
      .use(st)
      .listen({ type: 'simple' })
    s0.id = 's0'

    var c0 = Seneca({
      id$: 'c0',
      timeout: 22222 * tmx,
      legacy: { transport: false }
    })
      .test(fin)
      .use(st)
      .client({ type: 'simple' })
    c0.id = 'c0'

    s0.add('a:1', function a1(msg, reply, meta) {
      reply({ x: 1 })
    })

    s0.ready(function() {
      c0.act('a:1', function(err, out, meta) {
        expect(err).not.exist()
        expect(out).equal({ x: 1 })
        expect(meta.pattern).equal('') // catchall
        expect(meta.trace[0].desc[0]).equal('a:1')
        fin()
      })
    })
  })

  it('simple-transport', test_opts, function(fin) {
    var st = Transports.make_simple_transport()

    var s0 = Seneca({ id$: 's0', log: 'silent', legacy: { transport: false } })
      .test(function(err, meta) {
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
      legacy: { transport: false }
    })
      .test(function(err, meta) {
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

    s0.ready(function() {
      c0.ready(function() {
        c0.add('b:1', function b1(msg, reply, meta) {
          this.act({ id$: 'b1/' + meta.tx, x: msg.x }, reply)
        })
          .act('a:1,id$:m0/t0', function(err, out, meta) {
            expect(err).not.exist()
            expect(out).not.exist()
            expect(meta.id).equal('m0/t0')
            expect(meta.pattern).equal('') // catchall pin
          })
          .act('a:2,id$:m1/t1', function(err, out, meta) {
            expect(err).not.exist()
            expect(out.x).equal(2)
            expect(meta.id).equal('m1/t1')
            expect(meta.trace[0].desc[0]).equal('a:2')
            expect(meta.pattern).equal('') // catchall pin
            expect(meta.instance).equal('c0')
          })
          .act('a:3,id$:m2/t2', function(err, out, meta) {
            expect(out).equal(null)
            expect(err.message).to.equal('a3err')

            expect(meta.err.code).equal('act_execute')
            expect(meta.id).equal('m2/t2')
          })
          .act('a:33,id$:m33/t33', function(err, out, meta) {
            expect(out).equal(null)
            expect(err.message).to.equal('a33throw')
            expect(meta.id).equal('m33/t33')
          })
          .act('a:4,id$:m3/t3', function(err, out, meta) {
            expect(err).equal(null)
            expect(out.x).equal(4)
            expect(meta.id).equal('m3/t3')
            expect(meta.pattern).equal('') // catchall pin
            expect(meta.instance).equal('c0')

            expect(meta.trace[0].desc[0]).equal('a:4')
            expect(meta.trace[0].trace[0].desc[0]).equal('a:4')
          })
          .act('b:1,id$:m4/t4', function(err, out, meta) {
            expect(out).equal(null)
            expect(err).exists()
            expect(err.message).to.match(/seneca/)
          })
          .ready(function() {
            s0.close(c0.close.bind(c0, fin))
          })
      })
    })
  })
})
