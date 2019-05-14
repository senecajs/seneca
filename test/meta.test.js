/* Copyright (c) 2017 Richard Rodger, MIT License */
'use strict'

var tmx = parseInt(process.env.TIMEOUT_MULTIPLIER || 1, 10)

var Lab = require('@hapi/lab')
var Code = require('code')
var Hoek = require('hoek')

var lab = (exports.lab = Lab.script())
var describe = lab.describe
var expect = Code.expect

var Shared = require('./shared')
var it = Shared.make_it(lab)

var Seneca = require('..')

// TODO: test priors

describe('meta', function() {
  it('custom-parents', function(fin) {
    Seneca()
      .test(fin)
      .add('a:1', function(msg, reply, meta) {
        expect(meta.custom.foo).equal(msg.t)
        reply({ x: 1, t: msg.t })
      })

      // tests calls: b -> a
      .add('b:1', function(msg, reply, meta) {
        expect(meta.custom.foo).equal(msg.t)
        this.act('a:1', { t: msg.t }, reply)
      })

      // test calls: c -> b -> a
      .add('c:1', function(msg, reply, meta) {
        expect(meta.custom.foo).equal(msg.t)
        this.act('b:1,t:' + msg.t, reply)
      })

      .add('d:1', function(msg, reply, meta) {
        this.act('a:1,t:' + msg.t, { meta$: { custom: { foo: 11 } } }, reply)
      })

      .act('a:1,t:0', { meta$: { custom: { foo: 0 } } }, function(
        ignore,
        out,
        meta
      ) {
        expect(meta.custom.foo).equal(0)

        this.act({ b: 1, t: 1, meta$: { custom: { foo: 1 } } }, function(
          ignore,
          out,
          meta
        ) {
          expect(meta.custom.foo).equal(1)

          this.act({ c: 1, t: 2, meta$: { custom: { foo: 2 } } }, function(
            ignore,
            out,
            meta
          ) {
            expect(meta.custom.foo).equal(2)

            this.act({ d: 1, t: 11, meta$: { custom: { foo: 0 } } }, function(
              ignore,
              out,
              meta
            ) {
              // d:1 changed custom.foo
              expect(meta.custom.foo).equal(11)

              fin()
            })
          })
        })
      })
  })

  it('custom-priors', function(fin) {
    Seneca()
      .test(fin)
      .add('a:1', function p0(msg, reply, meta) {
        expect(meta.custom.foo).equal(msg.t)
        reply({ x: 1, t: msg.t })
      })

      .act('a:1,t:0', { meta$: { custom: { foo: 0 } } }, function(
        ignore,
        out,
        meta
      ) {
        expect(meta.custom.foo).equal(0)

        // tests prior: p1 -> p0
        this.add('a:1', function p1(msg, reply, meta) {
          expect(meta.custom.foo).equal(msg.t)
          this.prior(msg, reply)
        }).act({ a: 1, t: 1, meta$: { custom: { foo: 1 } } }, function(
          ignore,
          out,
          meta
        ) {
          expect(meta.custom.foo).equal(1)

          // test prior: p2 -> p1 -> p0
          this.add('a:1', function p2(msg, reply, meta) {
            expect(meta.custom.foo).equal(msg.t)
            this.prior(msg, reply)
          }).act({ a: 1, t: 2, meta$: { custom: { foo: 2 } } }, function(
            ignore,
            out,
            meta
          ) {
            expect(meta.custom.foo).equal(2)

            this.add('a:1', function p3(msg, reply, meta) {
              this.prior(msg, { meta$: { custom: { foo: 11 } } }, reply)
            }).act({ a: 1, t: 11, meta$: { custom: { foo: 0 } } }, function(
              ignore,
              out,
              meta
            ) {
              // changed custom.foo
              expect(meta.custom.foo).equal(11)

              fin()
            })
          })
        })
      })
  })

  it('custom-fixed', function(fin) {
    var si = Seneca()
      .test(fin)

      .add('a:1', function(msg, reply, meta) {
        reply({ x: 1, bar: meta.custom.bar })
      })

      .add('b:1', function(msg, reply, meta) {
        this.act('a:1', reply)
      })

    var d0 = si.delegate(null, { custom: { bar: 1 } })

    d0.act('a:1', function(ignore, out, meta) {
      expect(meta.custom.bar).equal(1)
      expect(out.bar).equal(1)

      d0.act('a:1', { meta$: { custom: { bar: 2 } } }, function(
        ignore,
        out,
        meta
      ) {
        expect(meta.custom.bar).equal(1)
        expect(out.bar).equal(1)

        d0.act('b:1', function(ignore, out, meta) {
          expect(meta.custom.bar).equal(1)
          expect(out.bar).equal(1)

          fin()
        })
      })
    })
  })
})
