/* Copyright (c) 2020 Richard Rodger and other contributors, MIT License */
'use strict'

const Code = require('@hapi/code')
const Lab = require('@hapi/lab')

var lab = (exports.lab = Lab.script())
var describe = lab.describe
var expect = Code.expect

var Shared = require('./shared')
var it = Shared.make_it(lab)

var Seneca = require('..')

describe('sub', function () {
  it('happy-sub', function (fin) {
    var log = []
    Seneca()
      .test(fin)

      .add('a:1', function (msg, reply, meta) {
        log.push('a')
        expect(meta.pattern).equals('a:1')
        reply({ x: 1 })
      })

      // Sub actions are assumed synchronous.
      // Sub actions have own signature that includes reply (for outward case).
      .sub('a:1', function (msg, out, meta) {
        log.push('s1')
        // Default case is inwards, in$:true
        expect(msg.in$).true()
        expect(msg.out$).not.exists()
        expect(out).not.exists()
        expect(meta.pattern).equals('a:1')
        expect(msg.a).equal(1)
        expect(msg.in$).equal(true)
      })

      // Mutiple subs to same pattern are fine, called in definition order.
      .sub('a:1', function (msg, out, meta) {
        log.push('s2')
        expect(msg.in$).true()
        expect(out).not.exists()
        expect(meta.pattern).equals('a:1')
        expect(msg.a).equal(1)
        expect(msg.in$).equal(true)
      })

      // This should never match.
      .sub('a:1,x:1', function (msg) {
        fin(new Error('subs should be exact!'))
      })

      .act({ a: 1 }, function (err, out) {
        log.push('r1')
        expect(err).equal(null)
        expect(out.x).equal(1)
        expect(log).equal(['s1', 's2', 'a', 'r1'])
      })

      // Irrelevant msg props are ignored.
      .act({ a: 1, b: 1 }, function (err, out) {
        log.push('r2')
        expect(err).equal(null)
        expect(out.x).equal(1)

        // Subs are triggered in sequence, requiring completion of previous action.
        // This is the same as normal actions. The subscrition matches the call.
        expect(log).equal(['s1', 's2', 'a', 'r1', 's1', 's2', 'a', 'r2'])
        fin()
      })
  })

  it('inwards-outwards-sub', function (fin) {
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
        expect(msg.in$).true()
        expect(msg.out$).not.exists()
        expect(out).not.exists()
        expect(meta.pattern).equals('a:1')
        expect(msg.a).equal(1)
      })

      .add('b:1', function (msg, reply, meta) {
        log.push('b')
        reply({ x: 2 })
      })

      .sub({ b: 1, out$: true }, function (msg, out, meta) {
        log.push('s2')
        // Outwards alone forces inwards false, unless explicit
        expect(msg.out$).true()
        expect(msg.in$).not.exists()
        expect(out).equal({ x: 2 })
        expect(meta.pattern).equals('b:1')
        expect(msg.b).equal(1)
      })

      .act({ a: 1 }, function (err, out) {
        log.push('r1')
        expect(err).equal(null)
        expect(out.x).equal(1)
        expect(log).equal(['s1', 'a', 'r1'])
      })

      .act({ b: 1 }, function (err, out) {
        log.push('r2')
        expect(err).equal(null)
        expect(out.x).equal(2)
        expect(log).equal(['s1', 'a', 'r1', 'b', 's2', 'r2'])
      })

      .add('c:1', function (msg, reply, meta) {
        log.push('c')
        reply({ x: 3 })
      })

      // Can do both together
      .sub({ c: 1, in$: true, out$: true }, function (msg, out, meta) {
        log.push('s3-' + (msg.in$ ? 'in' : msg.out$ ? 'out' : ''))
        if (msg.in$) {
          expect(msg.out$).not.exists()
        } else if (msg.out$) {
          expect(out).equal({ x: 3 })
          expect(msg.in$).not.exists()
        } else {
          throw new Error('should never happen')
        }

        expect(meta.pattern).equals('c:1')
        expect(msg.c).equal(1)
      })

      .act({ c: 1 }, function (err, out) {
        log.push('r3')
        expect(err).equal(null)
        expect(out.x).equal(3)
        expect(log).equal([
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
        expect(msg.in$).true()
        expect(msg.out$).not.exists()
        expect(out).not.exists()
        expect(meta.pattern).equals('d:1')
        expect(msg.d).equal(1)
      })

      .sub({ d: 1, out$: true }, function (msg, out, meta) {
        log.push('s5')
        // Outwards alone forces inwards false, unless explicit
        expect(msg.out$).true()
        expect(msg.in$).not.exists()
        expect(out).equal({ x: 4 })
        expect(meta.pattern).equals('d:1')
        expect(msg.d).equal(1)
      })

      .act({ d: 1 }, function (err, out) {
        log.push('r4')
        expect(err).equal(null)
        expect(out.x).equal(4)
        expect(log).equal([
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

  it('specific-sub', function (fin) {
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
        expect(log).equal(['sa', 'a', 'ca'])
        expect(out).equal({ x: 1 })
      })
      .act({ a: 1, b: 1 }, function (err, out) {
        log.push('cb')
        // Both sub(a:1) and sub(a:1,b:1) match.
        expect(log).equal(['sa', 'a', 'ca', 'sa', 'sb', 'a', 'cb'])
        expect(out).equal({ x: 1 })

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
            expect(log).equal([
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
            expect(out).equal({ x: 2 })
          })
          .act({ a: 1 }, function (err, out) {
            log.push('ca')

            // Only sub(a:1) matches.
            expect(log).equal([
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
            expect(out).equal({ x: 1 })
          })
          .act({ a: 1, b: 1 }, function (err, out) {
            log.push('CB')

            // Now all of sub(a:1), sub(a:1,b:1), sub(b:1) match.
            // This is why you have to match partials.
            expect(log).equal([
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
            expect(out).equal({ x: 1 })
            fin()
          })
      })
  })

  // TODO: fix and test sub errors
  it('error-sub', function (fin) {
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
        expect(err.code).equal('sub_inward_action_failed')
        fin()
      })
  })

  it('mixed-sub', function (fin) {
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
      expect(err).not.exists()
      expect(1).equal(out.b)
      expect(1).equal(tmp.a)
      expect(0).equal(tmp.as1)
      expect(0).equal(tmp.as2)

      si.sub({ a: 1 }, function (args) {
        expect(1).equal(args.a)
        expect(true).equal(args.in$)
        tmp.as1 = tmp.as1 + 1
      })

      si.sub({ a: 1, in$: true }, function (args) {
        expect(1).equal(args.a)
        expect(true).equal(args.in$)
        tmp.as1_in = tmp.as1_in + 1
      })

      si.sub({ a: 1, out$: true }, function (args, result) {
        expect(1).equal(args.a)
        expect(1).equal(result.y)
        expect(true).equal(args.out$)
        tmp.as1_out = tmp.as1_out + 1
      })

      si.act({ a: 1 }, function (err, out) {
        expect(err).not.exists()
        expect(1).equal(out.b)
        expect(2).equal(tmp.a)
        expect(1).equal(tmp.as1)

        expect(1).equal(tmp.as1_in)
        expect(1).equal(tmp.as1_out)
        expect(0).equal(tmp.as2)

        si.sub({ a: 1 }, function () {
          tmp.as2 = tmp.as2 + 1
        })

        si.act({ a: 1, x: 1 }, function (err, out) {
          expect(err).not.exists()
          expect(1).equal(out.b)
          expect(3).equal(tmp.a)
          expect(2).equal(tmp.as1)
          expect(1).equal(tmp.as2)
          expect(tmp.all).above(0)
          fin()
        })
      })
    })
  })

  it('sub-prior', function (fin) {
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
        expect(log).equal(['a:1', 'b:1'])
        //console.log(log)
        fin()
      })
  })

  it('sub-close', function (fin) {
    var tmp = {}
    Seneca()
      .test(fin)
      .sub('role:seneca,cmd:close', function () {
        tmp.sc = 1
      })
      .close(function () {
        expect(1).to.equal(tmp.sc)
        fin()
      })
  })

  it('sub-fix', function (fin) {
    var log = []
    var si = Seneca()
      .test(fin)

      .add('a:1,b:1', function (msg, reply, meta) {
        log.push('a')
        expect(meta.pattern).equals('a:1,b:1')
        reply({ x: 1 })
      })

    var sifix = si
      .fix('a:1')

      .sub('b:1', function (msg, out, meta) {
        log.push('s1')
        // Default case is inwards, in$:true
        expect(msg.in$).true()
        expect(out).not.exists()
        expect(meta.pattern).equals('a:1,b:1')
        expect(msg.a).equal(1)
        expect(msg.b).equal(1)
      })

    si.act({ a: 1, b: 1 }, function (err, out) {
      log.push('r1')
      expect(err).equal(null)
      expect(out.x).equal(1)
      expect(log).equal(['s1', 'a', 'r1'])

      fin()
    })
  })

  it('sub-once', function (fin) {
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
        expect(log).equal(['s2'])
        fin()
      })
  })
})
