/* Copyright (c) 2017 Richard Rodger, MIT License */
'use strict'

var tmx = parseInt(process.env.TIMEOUT_MULTIPLIER || 1, 10)

const Lab = require('@hapi/lab')
var Hoek = require('@hapi/hoek')
const Code = require('@hapi/code')

var lab = (exports.lab = Lab.script())
var describe = lab.describe
var expect = Code.expect

var Shared = require('./shared')
var it = Shared.make_it(lab)

var Seneca = require('..')

var Transports = require('./stubs/transports.js')

var parents = (meta, i) => meta.parents.map((x) => x[null == i ? 0 : i])

var partial_match = (obj, pat) =>
  Hoek.contain(obj, pat, { deep: true, part: true })

var is_uniq = (arr) => arr.length === new Set(arr).size

var test_opts = { parallel: false, timeout: 5555 * tmx }

describe('message', function () {
  it('happy-parents', test_opts, function (fin) {
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

        // Ensure no duplicate message ids
        expect(is_uniq(parents(meta, 1))).true()

        expect(msg.x2).equal(2)

        var m3 = { x3: 3 }
        this.act('a:4', m3, reply)
      })
      .add('a:4', function a4(msg, reply, meta) {
        expect(parents(meta)).equal(['a:3', 'a:2', 'a:1'])
        expect(is_uniq(parents(meta, 1))).true()

        expect(msg.x3).equal(3)

        var m4 = { x4: msg.x }
        reply(m4)
      })
      .act('a:1,x:1', function (err, out, meta) {
        expect(
          this.util.flatten(meta.trace, 'trace').map((x) => x.desc[0])
        ).equal(['a:2', 'a:3', 'a:4'])
        fin()
      })
  })

  it('complex-parents', test_opts, function (fin) {
    var mark = {}
    Seneca({ tag: 'h0' })
      .test(fin)
      .add('a:1', function a1(msg, reply, meta) {
        //console.log('CP ', meta.action, meta.pattern, parents(meta), meta.trace)
        expect(parents(meta)).equal([])

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

        //expect(parents(meta)).equal(['a:1'])
        //expect(msg.x1).equal(msg.x)

        mark.a2c = 1
        //this.act('a:3', msg, reply)
        reply(msg)
      })
      .add('a:3', function a3(msg, reply, meta) {
        //console.log('CP ', meta.action, meta.pattern, parents(meta), meta.trace)

        //expect(parents(meta)).equal(['a:2', 'a:1'])
        //expect(msg.x2).equal(msg.x)

        mark.a3c = 1
        //this.act('a:4', msg, reply)
        reply(msg)
      })
      .add('a:4', function a4(msg, reply, meta) {
        //console.log('CP ', meta.action, meta.pattern, parents(meta), meta.trace)

        //expect(parents(meta)).equal(['a:3', 'a:2', 'a:1'])
        //expect(msg.x3).equal(msg.x)

        mark.a4c = 1
        reply(msg)
      })
      .add('a:5', function a4(msg, reply, meta) {
        //console.log('CP ', meta.action, meta.pattern, parents(meta), meta.trace)

        //expect(parents(meta)).equal(['a:3', 'a:2', 'a:1'])
        //expect(msg.x3).equal(msg.x)

        mark.a5c = 1
        reply(msg)
      })
      .act('a:1,x:10,y:20', function (err, out, meta) {
        /*
        expect(
          this.util.flatten(meta.trace, 'trace').map((x) => x.desc[0])
        ).equal(['a:2', 'a:3', 'a:4'])
        */

        //console.log('CP mark', mark)
        expect(JSON.stringify(mark)).equal(
          '{"a1c":1,"a2c":1,"a3c":1,"a3r":1,"a4c":1,"a5c":1,"a5r":1}'
        )

        //console.dir(meta,{depth:null})

        fin()
      })
  })

  it('loop', test_opts, function (fin) {
    var i = 0
    Seneca({ id$: 'loop', idlen: 4, log: 'silent', limits: { maxparents: 3 } })
      .add('a:1', function a1(msg, reply, meta) {
        expect(is_uniq(parents(meta, 1))).true()

        i++
        if (4 < i) {
          throw new Error('failed to catch loop i=' + i)
        }
        this.act('a:1', msg, reply)
      })
      .act('a:1', function (err, out) {
        expect(i).equal(4)
        expect(err.code).equal('maxparents')
        expect(err.details.parents).equal([
          'a:1 a1_8',
          'a:1 a1_8',
          'a:1 a1_8',
          'a:1 a1_8',
        ])

        fin()
      })
  })

  it('branch', test_opts, function (fin) {
    var log = []
    Seneca({ id$: 'branch', idlen: 4, limits: { maxparents: 3 } })
      .test(fin)
      .add('a:1', function a1(msg, reply, meta) {
        log.push('a1')
        expect(parents(meta)).equal([])
        msg.a1 = 1
        this.act('b:1,a:null', msg)
        this.act('a:2', msg, reply)
      })
      .add('a:2', function a2(msg, reply, meta) {
        expect(parents(meta)).equal(['a:1'])
        log.push('a2')

        this.act('c:1,a:null', { a2: 1 })
        this.act('a:3', { a2: 1 }, function (err, out, meta) {
          expect(
            partial_match(meta.trace, [
              {
                desc: ['a:4'],
                trace: [],
              },
            ])
          ).true()

          log.push('a2r')
          this.act('c:2,a:null', { a2: 1, a2r: 1 })

          // capture c2
          setImmediate(reply.bind(null, err, out))
        })
      })
      .add('a:3', function a3(msg, reply, meta) {
        expect(parents(meta)).equal(['a:2', 'a:1'])
        expect(is_uniq(parents(meta, 1))).true()

        log.push('a3')
        this.act('a:4', { a3: 1 }, reply)
      })
      .add('a:4', function a3(msg, reply, meta) {
        expect(parents(meta)).equal(['a:3', 'a:2', 'a:1'])
        expect(is_uniq(parents(meta, 1))).true()

        log.push('a4')
        reply({ a4: 1 })
      })
      .add('b:1', function b1(msg, reply, meta) {
        expect(parents(meta)).equal(['a:1'])
        log.push('b1')
        reply()
      })
      .add('c:1', function c1(msg, reply, meta) {
        expect(parents(meta)).equal(['a:2', 'a:1'])
        expect(is_uniq(parents(meta, 1))).true()

        log.push('c1')
        reply()
      })
      .add('c:2', function c2(msg, reply, meta) {
        expect(parents(meta)).equal(['a:3', 'a:2', 'a:1'])
        expect(is_uniq(parents(meta, 1))).true()

        log.push('c2')
        reply()
      })
      .act('a:1', function (err, out, meta) {
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
                  trace: [{ desc: ['a:4'] }, { desc: ['c:2'] }],
                },
              ],
            },
          ])
        ).true()

        fin()
      })
  })

  it('empty-response', test_opts, function (fin) {
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
        expect(err).not.exist()
        expect(out).not.exist()
        expect(meta.pattern).equal('a:1')
      })
      .act('b:1', function (err, out, meta) {
        expect(err).not.exist()
        expect(out).not.exist()
        expect(meta.pattern).equal('b:1')
        if (!this.options().prior.direct) {
          expect(meta.trace[0].desc[0]).equal('a:1')
        }
      })
      .act('c:1', function (err, out, meta) {
        expect(err).not.exist()
        expect(out).not.exist()
        expect(meta.pattern).equal('c:1')
      })
      .act('d:1', function (err, out, meta) {
        expect(err).not.exist()
        expect(out).not.exist()
        expect(meta.pattern).equal('d:1')
        if (!this.options().prior.direct) {
          expect(meta.trace[0].desc[0]).equal('d:1')
        }
      })
      .ready(fin)
  })

  it('reply', test_opts, function (fin) {
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
        expect(meta.pattern).equal('a:1')
        expect(meta.action).match(/a1/)
      })
      .act('b:1', function (err, out, meta) {
        expect(meta.pattern).equal('b:1')
        expect(meta.action).match(/b1/)
      })
      .ready(fin)
  })

  it('prior', test_opts, function (fin) {
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
        expect(meta.pattern).equal('b:1')
        expect(meta.action).match(/b1/)
      })
      .act('a:1', function (err, out, meta) {
        expect(err).not.exist()
        expect(out.x).equal(1)
        expect(meta.pattern).equal('a:1')

        if (!this.options().prior.direct) {
          expect(meta.trace[0].desc[0]).equal('a:1')
        }
      })
      .ready(fin)
  })

  it('entity', test_opts, function (fin) {
    var si = Seneca().test(fin).use('entity')

    si = si.gate()

    var foo = si.make$('foo', { id$: 'a', a: 1 })

    foo.save$(function (err, out, meta) {
      expect(out.toString()).equal('$-/-/foo;id=a;{a:1}')
      expect(meta).exist()
      expect(out.canon$).exist()
    })

    foo.list$(function (err, list, meta) {
      expect(list.length).equal(1)
      expect(meta).exist()

      var foo0 = list[0]
      expect(foo0.toString()).equal('$-/-/foo;id=a;{a:1}')
      expect(foo0.canon$).exist()

      fin()
    })
  })

  it('single-simple-transport', test_opts, function (fin) {
    var st = Transports.make_simple_transport()

    var s0 = Seneca({ id$: 's0', legacy: { transport: false } })
      .test(fin)
      .use(st)
      .listen({ type: 'simple' })
    s0.id = 's0'

    var c0 = Seneca({
      id$: 'c0',
      timeout: 22222 * tmx,
      legacy: { transport: false },
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
        expect(err).not.exist()
        expect(out).equal({ x: 1 })
        expect(meta.pattern).equal('') // catchall
        expect(meta.trace[0].desc[0]).equal('a:1')
        fin()
      })
    })
  })

  it('simple-transport', test_opts, function (fin) {
    var st = Transports.make_simple_transport()

    var s0 = Seneca({ id$: 's0', log: 'silent', legacy: { transport: false } })
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
      legacy: { transport: false },
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
            expect(err).not.exist()
            expect(out).not.exist()
            expect(meta.id).equal('m0/t0')
            expect(meta.pattern).equal('') // catchall pin
          })
          .act('a:2,id$:m1/t1', function (err, out, meta) {
            expect(err).not.exist()
            expect(out.x).equal(2)
            expect(meta.id).equal('m1/t1')
            expect(meta.trace[0].desc[0]).equal('a:2')
            expect(meta.pattern).equal('') // catchall pin
            expect(meta.instance).equal('c0')
          })
          .act('a:3,id$:m2/t2', function (err, out, meta) {
            expect(out).equal(null)
            expect(err.message).to.equal('a3err')

            expect(meta.err.code).equal('act_execute')
            expect(meta.id).equal('m2/t2')
          })
          .act('a:33,id$:m33/t33', function (err, out, meta) {
            expect(out).equal(null)
            expect(err.message).to.equal('a33throw')
            expect(meta.id).equal('m33/t33')
          })
          .act('a:4,id$:m3/t3', function (err, out, meta) {
            expect(err).equal(null)
            expect(out.x).equal(4)
            expect(meta.id).equal('m3/t3')
            expect(meta.pattern).equal('') // catchall pin
            expect(meta.instance).equal('c0')

            if (!this.options().prior.direct) {
              expect(meta.trace[0].desc[0]).equal('a:4')
              expect(meta.trace[0].trace[0].desc[0]).equal('a:4')
            }
          })
          .act('b:1,id$:m4/t4', function (err, out, meta) {
            expect(out).equal(null)
            expect(err).exists()
            expect(err.message).to.match(/seneca/)
          })
          .ready(function () {
            s0.close(c0.close.bind(c0, fin))
          })
      })
    })
  })

  it('partial-patterns', test_opts, function (fin) {
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
        expect(tmp).equal({ a1: [100, 200], b2c3: [300] })
        fin()
      })
  })
})
