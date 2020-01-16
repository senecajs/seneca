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

describe('sub', function() {
  it('happy-sub', function(fin) {
    var log = []
    Seneca()
      .test(fin)

      .add('a:1', function(msg, reply, meta) {
        log.push('a')
        expect(meta.pattern).equals('a:1')
        reply({ x: 1 })
      })

      // Sub actions are assumed synchronous.
      // Sub actions have own signature that includes reply (for outward case).
      .sub('a:1', function(msg, out, meta) {
        log.push('s1')
        // Default case is inwards, in$:true
        expect(msg.in$).true()
        expect(out).not.exists()
        expect(meta.pattern).equals('a:1')
        expect(msg.a).equal(1)
        expect(msg.in$).equal(true)
      })

      // Mutiple subs to same pattern are fine, called in definition order.
      .sub('a:1', function(msg, out, meta) {
        log.push('s2')
        expect(msg.in$).true()
        expect(out).not.exists()
        expect(meta.pattern).equals('a:1')
        expect(msg.a).equal(1)
        expect(msg.in$).equal(true)
      })

      // This should never match.
      .sub('a:1,x:1', function(msg) {
        fin(new Error('subs should be exact!'))
      })

      .act({ a: 1 }, function(err, out) {
        log.push('r1')
        expect(err).equal(null)
        expect(out.x).equal(1)
        expect(log).equal(['s1', 's2', 'a', 'r1'])
      })

      // Irrelevant msg props are ignored.
      .act({ a: 1, b: 1 }, function(err, out) {
        log.push('r2')
        expect(err).equal(null)
        expect(out.x).equal(1)

        // Subs are triggered in sequence, requiring completion of previous action.
        // This is the same as normal actions. The subscrition matches the call.
        expect(log).equal(['s1', 's2', 'a', 'r1', 's1', 's2', 'a', 'r2'])
        fin()
      })
  })

  it('specific-sub', function(fin) {
    var log = []
    Seneca()
      .test(fin)
      .add('a:1', function(msg, reply, meta) {
        log.push('a')
        reply({ x: 1 })
      })
      .sub('a:1', function(msg) {
        log.push('sa')
      })
      .sub('a:1,b:1', function(msg) {
        log.push('sb')
      })
      .act({ a: 1 }, function(err, out) {
        log.push('ca')
        //console.log('AAA',log)
        // Only sub(a:1) matches.
        expect(log).equal(['sa', 'a', 'ca'])
        expect(out).equal({ x: 1 })
      })
      .act({ a: 1, b: 1 }, function(err, out) {
        log.push('cb')
        //console.log('BBB',log)
        // Both sub(a:1) and sub(a:1,b:1) match.
        expect(log).equal(['sa', 'a', 'ca', 'sa', 'sb', 'a', 'cb'])
        expect(out).equal({ x: 1 })

        this.add('b:1', function(msg, reply, meta) {
          log.push('b')
          reply({ x: 2 })
        })
          .sub('b:1', function(msg) {
            log.push('sB')
          })
          .act({ b: 1 }, function(err, out) {
            log.push('cB')
            //console.log('CCC',log)

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
              'cB'
            ])
            expect(out).equal({ x: 2 })
          })
          .act({ a: 1 }, function(err, out) {
            log.push('ca')
            ///console.log('DDD',log)
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
              'ca'
            ])
            expect(out).equal({ x: 1 })
          })
          .act({ a: 1, b: 1 }, function(err, out) {
            log.push('CB')
            // console.log('EEE',log)
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
              'sB',
              'sa',
              'sb',
              'a',
              'CB'
            ])
            expect(out).equal({ x: 1 })
            fin()
          })
      })
  })

  /*

  // TODO: fix and test sub errors
  it('error-sub', function(fin) {
    Seneca()
      .test()
      .error(function(err) {
        console.log(err)
        fin()
      })
      .add('a:1', function(msg, reply, meta) {
        reply({ x: 1 })
      })
      .sub('a:1', function(msg) {
        throw new Error('a1')
      })
      .act('a:1', function(err, out) {
        // this is correct - it's a problem for the sub action
        expect(err).not.exists()
        fin()
      })
  })

  
  it('mixed-sub', function(done) {
    var si = Seneca(testopts, { log: 'silent', errhandler: done })

    var tmp = { a: 0, as1: 0, as2: 0, as1_in: 0, as1_out: 0, all: 0 }

    si.sub({}, function() {
      tmp.all++
    })

    si.add({ a: 1 }, function(args, reply) {
      tmp.a = tmp.a + 1
      reply({ b: 1, y: 1 })
    })

    si.act({ a: 1 }, function(err, out) {
      assert.ok(!err)
      assert.equal(1, out.b)
      assert.equal(1, tmp.a)
      assert.equal(0, tmp.as1)
      assert.equal(0, tmp.as2)

      si.sub({ a: 1 }, function(args) {
        assert.equal(1, args.a)
        assert.equal(true, args.in$)
        tmp.as1 = tmp.as1 + 1
      })

      si.sub({ a: 1, in$: true }, function(args) {
        assert.equal(1, args.a)
        assert.equal(true, args.in$)
        tmp.as1_in = tmp.as1_in + 1
      })

      si.sub({ a: 1, out$: true }, function(args, result) {
        assert.equal(1, args.a)
        assert.equal(1, result.y)
        assert.equal(true, args.out$)
        tmp.as1_out = tmp.as1_out + 1
      })

      si.act({ a: 1 }, function(err, out) {
        assert.ok(!err)
        assert.equal(1, out.b)
        assert.equal(2, tmp.a)
        assert.equal(1, tmp.as1)

        assert.equal(1, tmp.as1_in)
        assert.equal(1, tmp.as1_out)
        assert.equal(0, tmp.as2)

        si.sub({ a: 1 }, function() {
          tmp.as2 = tmp.as2 + 1
        })

        si.act({ a: 1, x: 1 }, function(err, out) {
          assert.ok(!err)
          assert.equal(1, out.b)
          assert.equal(3, tmp.a)
          assert.equal(2, tmp.as1)
          assert.equal(1, tmp.as2)
          assert.ok(tmp.all > 0)
        })
      })
    })

    // we should not panic when sub handler throws
    si.sub({ fail: 1 }, function() {
      throw Error('Sub failed')
    })

    si.add({ fail: 1 }, function(msg, done) {
      done()
    })
    si.act({ fail: 1 }, function() {
      done()
    })
  })

  it('sub-prior', function(fin) {
    var log = []
    var si = Seneca()
      .test(fin)
      .add('a:1')
      .add('a:1', function(msg, reply, meta) {
        this.prior(msg, reply)
      })
      .sub('a:1', function(msg, out, meta) {
        //console.log('SUBCALL',msg,meta)
        log.push(meta && meta.pattern)
      })
      .act('a:1')
      .ready(function() {
        // only entry msg of prior chain is published
        expect(log).equal(['a:1'])
        //console.log(log)
        fin()
      })
  })


  it('sub-close', function(fin) {
    var tmp = {}
    Seneca()
      .test(fin)
      .sub('role:seneca,cmd:close', function() {
        tmp.sc = 1
      })
      .close(function() {
        expect(1).to.equal(tmp.sc)
        fin()
      })
  })
*/
})
