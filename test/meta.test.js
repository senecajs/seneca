/* Copyright (c) 2017-202 Richard Rodger, MIT License */
'use strict'

var tmx = parseInt(process.env.TIMEOUT_MULTIPLIER || 1, 10)

const assert = require('node:assert/strict')

const { describe, it } = require('node:test')

var Seneca = require('..')

// TODO: test priors

describe('meta', function () {
  it('custom-parents', function (_t, fin) {
    Seneca()
      .test(fin)
      .add('a:1', function (msg, reply, meta) {
        assert.equal(meta.custom.foo, msg.t)
        reply({ x: 1, t: msg.t })
      })

      // tests calls: b -> a
      .add('b:1', function (msg, reply, meta) {
        assert.equal(meta.custom.foo, msg.t)
        this.act('a:1', { t: msg.t }, reply)
      })

      // test calls: c -> b -> a
      .add('c:1', function (msg, reply, meta) {
        assert.equal(meta.custom.foo, msg.t)
        this.act('b:1,t:' + msg.t, reply)
      })

      .add('d:1', function (msg, reply, meta) {
        this.act('a:1,t:' + msg.t, { meta$: { custom: { foo: 11 } } }, reply)
      })

      .act(
        'a:1,t:0',
        { meta$: { custom: { foo: 0 } } },
        function (ignore, out, meta) {
          assert.equal(meta.custom.foo, 0)

          this.act(
            { b: 1, t: 1, meta$: { custom: { foo: 1 } } },
            function (ignore, out, meta) {
              assert.equal(meta.custom.foo, 1)

              this.act(
                { c: 1, t: 2, meta$: { custom: { foo: 2 } } },
                function (ignore, out, meta) {
                  assert.equal(meta.custom.foo, 2)

                  this.act(
                    { d: 1, t: 11, meta$: { custom: { foo: 0 } } },
                    function (ignore, out, meta) {
                      // d:1 changed custom.foo
                      assert.equal(meta.custom.foo, 11)

                      fin()
                    },
                  )
                },
              )
            },
          )
        },
      )
  })

  function make_custom_meta_prior(opts) {
    return function custom_meta_prior_test(_t, fin) {
      Seneca(opts)
        .test(fin)
        .add('a:1', function p0(msg, reply, meta) {
          // console.log('META', msg, meta)
          assert.equal(meta.custom.foo, msg.t)
          reply({ x: 1, t: msg.t })
        })

        .act(
          'a:1,t:0',
          { meta$: { custom: { foo: 0 } } },
          function (ignore, out, meta) {
            assert.equal(meta.custom.foo, 0)

            // tests prior: p1 -> p0
            this.add('a:1', function p1(msg, reply, meta) {
              assert.equal(meta.custom.foo, msg.t)
              this.prior(msg, reply)
            }).act(
              { a: 1, t: 1, meta$: { custom: { foo: 1 } } },
              function (ignore, out, meta) {
                assert.equal(meta.custom.foo, 1)

                // test prior: p2 -> p1 -> p0
                this.add('a:1', function p2(msg, reply, meta) {
                  assert.equal(meta.custom.foo, msg.t)
                  this.prior(msg, reply)
                }).act(
                  { a: 1, t: 2, meta$: { custom: { foo: 2 } } },
                  function (ignore, out, meta) {
                    assert.equal(meta.custom.foo, 2)

                    this.add('a:1', function p3(msg, reply, meta) {
                      this.prior(msg, { meta$: { custom: { foo: 11 } } }, reply)
                    }).act(
                      { a: 1, t: 11, meta$: { custom: { foo: 0 } } },
                      function (ignore, out, meta) {
                        // changed custom.foo
                        assert.equal(meta.custom.foo, 11)

                        fin()
                      },
                    )
                  },
                )
              },
            )
          },
        )
    }
  }

  it('custom-meta-prior', make_custom_meta_prior({}))
  it(
    'custom-meta-prior-direct',
    make_custom_meta_prior({ prior: { direct: true } }),
  )

  it('custom-fixed', function (t, fin) {
    var si = Seneca()
      .test(fin)

      .add('a:1', function (msg, reply, meta) {
        reply({ x: 1, bar: meta.custom.bar })
      })

      .add('b:1', function (msg, reply, meta) {
        this.act('a:1', reply)
      })

    var d0 = si.delegate(null, { custom: { bar: 1 } })

    d0.act('a:1', function (ignore, out, meta) {
      assert.equal(meta.custom.bar, 1)
      assert.equal(out.bar, 1)

      d0.act(
        'a:1',
        { meta$: { custom: { bar: 2 } } },
        function (ignore, out, meta) {
          assert.equal(meta.custom.bar, 1)
          assert.equal(out.bar, 1)

          d0.act('b:1', function (ignore, out, meta) {
            assert.equal(meta.custom.bar, 1)
            assert.equal(out.bar, 1)

            fin()
          })
        },
      )
    })
  })
})
