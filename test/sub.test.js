/* Copyright (c) 2020-2024 Richard Rodger and other contributors, MIT License */
'use strict'

const assert = require('node:assert/strict')
const { describe, it } = require('node:test')

var Seneca = require('..')

describe('sub', function () {
  it('happy-sub', function (t, fin) {
    var log = []
    Seneca()
      .test(fin)

      .add('a:1', function (msg, reply, meta) {
        log.push('a')
        assert.equal(meta.pattern, 'a:1')
        reply({ x: 1 })
      })

      // Sub actions are assumed synchronous.
      // Sub actions have own signature that includes reply (for outward case).
      .sub('a:1', function (msg, out, meta) {
        log.push('s1')
        // Default case is inwards, in$:true
        assert.equal(msg.in$, true)
        assert.ok(null == msg.out$)
        assert.ok(null == out)
        assert.equal(meta.pattern, 'a:1')
        assert.equal(msg.a, 1)
        assert.equal(msg.in$, true)
      })

      // Mutiple subs to same pattern are fine, called in definition order.
      .sub('a:1', function (msg, out, meta) {
        log.push('s2')
        assert.equal(msg.in$, true)
        assert.ok(null == out)
        assert.equal(meta.pattern, 'a:1')
        assert.equal(msg.a, 1)
        assert.equal(msg.in$, true)
      })

      // This should never match.
      .sub('a:1,x:1', function (msg) {
        fin(new Error('subs should be exact!'))
      })

      .act({ a: 1 }, function (err, out) {
        log.push('r1')
        assert.equal(err, null)
        assert.equal(out.x, 1)
        assert.deepEqual(log, ['s1', 's2', 'a', 'r1'])
      })

      // Irrelevant msg props are ignored.
      .act({ a: 1, b: 1 }, function (err, out) {
        log.push('r2')
        assert.equal(err, null)
        assert.equal(out.x, 1)

        // Subs are triggered in sequence, requiring completion of previous action.
        // This is the same as normal actions. The subscrition matches the call.
        assert.deepEqual(log, ['s1', 's2', 'a', 'r1', 's1', 's2', 'a', 'r2'])
        fin()
      })
  })

  it('inwards-outwards-sub', function (t, fin) {
    var log = []
    Seneca()
      .test(fin)

      .add('a:1', function (msg, reply, meta) {
        log.push('a')
        reply({ x: 1 })
      })

      .sub({ a: 1, in$: true }, function (msg, out, meta) {
        log.push('s1')
        // Default case is inwards, in$:true
        assert.equal(msg.in$, true)
        assert.ok(null == msg.out$)
        assert.ok(null == out)
        assert.equal(meta.pattern, 'a:1')
        assert.equal(msg.a, 1)
      })

      .add('b:1', function (msg, reply, meta) {
        log.push('b')
        reply({ x: 2 })
      })

      .sub({ b: 1, out$: true }, function (msg, out, meta) {
        log.push('s2')
        // Outwards alone forces inwards false, unless explicit
        assert.equal(msg.out$, true)
        assert.ok(null == msg.in$)
        assert.deepEqual(out, { x: 2 })
        assert.equal(meta.pattern, 'b:1')
        assert.equal(msg.b, 1)
      })

      .act({ a: 1 }, function (err, out) {
        log.push('r1')
        assert.equal(err, null)
        assert.equal(out.x, 1)
        assert.deepEqual(log, ['s1', 'a', 'r1'])
      })

      .act({ b: 1 }, function (err, out) {
        log.push('r2')
        assert.equal(err, null)
        assert.equal(out.x, 2)
        assert.deepEqual(log, ['s1', 'a', 'r1', 'b', 's2', 'r2'])
      })

      .add('c:1', function (msg, reply, meta) {
        log.push('c')
        reply({ x: 3 })
      })

      // Can do both together
      .sub({ c: 1, in$: true, out$: true }, function (msg, out, meta) {
        log.push('s3-' + (msg.in$ ? 'in' : msg.out$ ? 'out' : ''))
        if (msg.in$) {
          assert.ok(null == msg.out$)
        } else if (msg.out$) {
          assert.deepEqual(out, { x: 3 })
          assert.ok(null == msg.in$)
        } else {
          throw new Error('should never happen')
        }

        assert.equal(meta.pattern, 'c:1')
        assert.equal(msg.c, 1)
      })

      .act({ c: 1 }, function (err, out) {
        log.push('r3')
        assert.equal(err, null)
        assert.equal(out.x, 3)
        assert.deepEqual(log, [
          's1',
          'a',
          'r1',
          'b',
          's2',
          'r2',
          's3-in',
          'c',
          's3-out',
          'r3',
        ])
      })

      // Can do both separately

      .add('d:1', function (msg, reply, meta) {
        log.push('d')
        reply({ x: 4 })
      })

      .sub({ d: 1, in$: true }, function (msg, out, meta) {
        log.push('s4')
        // Default case is inwards, in$:true
        assert.equal(msg.in$, true)
        assert.ok(null == msg.out$)
        assert.ok(null == out)
        assert.equal(meta.pattern, 'd:1')
        assert.equal(msg.d, 1)
      })

      .sub({ d: 1, out$: true }, function (msg, out, meta) {
        log.push('s5')
        // Outwards alone forces inwards false, unless explicit
        assert.equal(msg.out$, true)
        assert.ok(null == msg.in$)
        assert.deepEqual(out, { x: 4 })
        assert.equal(meta.pattern, 'd:1')
        assert.equal(msg.d, 1)
      })

      .act({ d: 1 }, function (err, out) {
        log.push('r4')
        assert.equal(err, null)
        assert.equal(out.x, 4)
        assert.deepEqual(log, [
          's1',
          'a',
          'r1',
          'b',
          's2',
          'r2',
          's3-in',
          'c',
          's3-out',
          'r3',
          's4',
          'd',
          's5',
          'r4',
        ])

        fin()
      })
  })

  it('specific-sub', function (t, fin) {
    var log = []
    Seneca()
      .test(fin)
      .add('a:1', function (msg, reply, meta) {
        log.push('a')
        reply({ x: 1 })
      })
      .sub('a:1', function (msg) {
        log.push('sa')
      })
      .sub('a:1,b:1', function (msg) {
        log.push('sb')
      })
      .act({ a: 1 }, function (err, out) {
        log.push('ca')
        // Only sub(a:1) matches.
        assert.deepEqual(log, ['sa', 'a', 'ca'])
        assert.deepEqual(out, { x: 1 })
      })
      .act({ a: 1, b: 1 }, function (err, out) {
        log.push('cb')
        // Both sub(a:1) and sub(a:1,b:1) match.
        assert.deepEqual(log, ['sa', 'a', 'ca', 'sa', 'sb', 'a', 'cb'])
        assert.deepEqual(out, { x: 1 })

        this.add('b:1', function (msg, reply, meta) {
          log.push('b')
          reply({ x: 2 })
        })
          .sub('b:1', function (msg) {
            log.push('sB')
          })
          .act({ b: 1 }, function (err, out) {
            log.push('cB')

            // Only sub(b:1) matches.
            assert.deepEqual(log, [
              'sa',
              'a',
              'ca',
              'sa',
              'sb',
              'a',
              'cb',
              'sB',
              'b',
              'cB',
            ])
            assert.deepEqual(out, { x: 2 })
          })
          .act({ a: 1 }, function (err, out) {
            log.push('ca')

            // Only sub(a:1) matches.
            assert.deepEqual(log, [
              'sa',
              'a',
              'ca',
              'sa',
              'sb',
              'a',
              'cb',
              'sB',
              'b',
              'cB',
              'sa',
              'a',
              'ca',
            ])
            assert.deepEqual(out, { x: 1 })
          })
          .act({ a: 1, b: 1 }, function (err, out) {
            log.push('CB')

            // Now all of sub(a:1), sub(a:1,b:1), sub(b:1) match.
            // This is why you have to match partials.
            assert.deepEqual(log, [
              'sa',
              'a',
              'ca',
              'sa',
              'sb',
              'a',
              'cb',
              'sB',
              'b',
              'cB',
              'sa',
              'a',
              'ca',
              'sa',
              'sb',
              'sB',
              'a',
              'CB',
            ])
            assert.deepEqual(out, { x: 1 })
            fin()
          })
      })
  })

  // TODO: fix and test sub errors
  it('error-sub', function (t, fin) {
    Seneca()
      .test()
      .quiet()
      .add('a:1', function (msg, reply, meta) {
        reply({ x: 1 })
      })
      .sub('a:1', function (msg) {
        throw new Error('b1')
      })
      .act('a:1', function (err, out) {
        assert.equal(err.code, 'sub_inward_action_failed')
        fin()
      })
  })

  it('mixed-sub', function (t, fin) {
    var si = Seneca().test()

    var tmp = { a: 0, as1: 0, as2: 0, as1_in: 0, as1_out: 0, all: 0 }

    si.sub({}, function () {
      tmp.all++
    })

    si.add({ a: 1 }, function (args, reply) {
      tmp.a = tmp.a + 1
      reply({ b: 1, y: 1 })
    })

    si.act({ a: 1 }, function (err, out) {
      assert.ifError(err)
      assert.equal(1, out.b)
      assert.equal(1, tmp.a)
      assert.equal(0, tmp.as1)
      assert.equal(0, tmp.as2)

      si.sub({ a: 1 }, function (args) {
        assert.equal(1, args.a)
        assert.equal(true, args.in$)
        tmp.as1 = tmp.as1 + 1
      })

      si.sub({ a: 1, in$: true }, function (args) {
        assert.equal(1, args.a)
        assert.equal(true, args.in$)
        tmp.as1_in = tmp.as1_in + 1
      })

      si.sub({ a: 1, out$: true }, function (args, result) {
        assert.equal(1, args.a)
        assert.equal(1, result.y)
        assert.equal(true, args.out$)
        tmp.as1_out = tmp.as1_out + 1
      })

      si.act({ a: 1 }, function (err, out) {
        assert.ifError(err)
        assert.equal(1, out.b)
        assert.equal(2, tmp.a)
        assert.equal(1, tmp.as1)

        assert.equal(1, tmp.as1_in)
        assert.equal(1, tmp.as1_out)
        assert.equal(0, tmp.as2)

        si.sub({ a: 1 }, function () {
          tmp.as2 = tmp.as2 + 1
        })

        si.act({ a: 1, x: 1 }, function (err, out) {
          assert.ifError(err)
          assert.equal(1, out.b)
          assert.equal(3, tmp.a)
          assert.equal(2, tmp.as1)
          assert.equal(1, tmp.as2)
          assert.ok(tmp.all > 0)
          fin()
        })
      })
    })
  })

  it('sub-prior', function (t, fin) {
    var log = []
    var si = Seneca()
      .test(fin)
      .add('a:1')
      .add('a:1', function (msg, reply, meta) {
        this.prior(msg, reply)
      })
      .sub('a:1', function (msg, out, meta) {
        //console.log('SUBCALL',msg,meta)
        log.push(meta && meta.pattern)
      })
      .act('a:1')

      .add('b:1')
      .add('b:1', function (msg, reply, meta) {
        this.prior(msg, reply)
      })
      .sub('b:1,out$:true', function (msg, out, meta) {
        //console.log('SUBCALL',msg,meta)
        log.push(meta && meta.pattern)
      })
      .act('b:1')

      .ready(function () {
        // only entry msg of prior chain is published
        assert.deepEqual(log, ['a:1', 'b:1'])
        //console.log(log)
        fin()
      })
  })

  it('sub-close', function (t, fin) {
    var tmp = {}
    Seneca()
      .test(fin)
      .sub('sys:seneca,cmd:close', function () {
        tmp.sc = 1
      })
      .close(function () {
        assert.equal(1, tmp.sc)
        fin()
      })
  })

  it('sub-fix', function (t, fin) {
    var log = []
    var si = Seneca()
      .test(fin)

      .add('a:1,b:1', function (msg, reply, meta) {
        log.push('a')
        assert.equal(meta.pattern, 'a:1,b:1')
        reply({ x: 1 })
      })

    var sifix = si
      .fix('a:1')

      .sub('b:1', function (msg, out, meta) {
        log.push('s1')
        // Default case is inwards, in$:true
        assert.equal(msg.in$, true)
        assert.ok(null == out)
        assert.equal(meta.pattern, 'a:1,b:1')
        assert.equal(msg.a, 1)
        assert.equal(msg.b, 1)
      })

    si.act({ a: 1, b: 1 }, function (err, out) {
      log.push('r1')
      assert.equal(err, null)
      assert.equal(out.x, 1)
      assert.deepEqual(log, ['s1', 'a', 'r1'])

      fin()
    })
  })

  it('sub-once', function (t, fin) {
    var log = []
    Seneca()
      .test(fin)

      .add('c:1')

      .sub('c:1,a:1,b:1', function (msg, out, meta) {
        log.push('s1')
      })
      .sub('c:1', function (msg, out, meta) {
        log.push('s2')
      })

      .act('c:1,a:1')

      .ready(function () {
        assert.deepEqual(log, ['s2'])
        fin()
      })
  })
})
