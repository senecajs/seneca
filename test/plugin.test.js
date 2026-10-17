/* Copyright © 2013-2020 Richard Rodger and other contributors, MIT License. */
'use strict'

const assert = require('node:assert/strict')
const { describe, it } = require('node:test')

var Seneca = require('..')
var { Plugin } = require('../lib/plugin')

describe('plugin', function () {
  // TODO: move to seneca-joi
  /*
  it('use.intern', (fin) => {
    assert.ok(null != Plugin.intern)

    var Joi = Seneca.util.Joi

    var spec = {
      a: null,
      b: void 0,
      c: {}, // Joi.object(),
      d: 1,
      e: 'a',
      f: {},
      g: { h: 2 },
      i: { j: { k: 3 } },

      // NOTE: a simple array check is as good as it gets
      // Use explicit Joi.array construction for detailed validation

      l: [],
      m: [4],
      n: [[5]],
      o: { p: [6] },
      q: { u: [{ v: [{ w: 7 }] }] },
    }

    var out = Plugin.intern.prepare_spec(Joi, spec, { allow_unknown: false })
    // console.dir(out.describe(),{depth:null})
    assert.ifError(out.validate(spec).error)

    out = Plugin.intern.prepare_spec(Joi, spec, { allow_unknown: true })
    //console.dir(out.describe(),{depth:null})

    //console.dir(out.validate({}),{depth:null})
    assert.deepEqual(out.validate({}).value, {
      a: null,
      d: 1,
      e: 'a',
      f: {},
      g: { h: 2 },
      i: { j: { k: 3 } },
      l: [],
      m: [4],
      n: [[5]],
      o: { p: [6] },
      q: {
        u: [{ v: [{ w: 7 }] }],
      },
    })

    spec.z = 1
    assert.ifError(out.validate(spec).error)

    fin()
  })
  */

  it('plugin-edges', (t, fin) => {
    var s = Seneca({ debug: { undead: true } }).test(fin)

    try {
      s.use()
      assert.fail('empty-use-should-throw')
    } catch (e) {
      assert.ok(e.message.includes('seneca.use'))
      fin()
    }
  })

  it('plugin-internal-ordu', (_t, fin) => {
    var s = Seneca().test(fin)

    var sin = s.internal()

    var ordu_use = sin.ordu.use
    assert.deepEqual(
      ordu_use.tasks().map((t) => t.name),
      [
        'args',
        'load',
        'normalize',
        'pre_options',
        'preload',
        'pre_meta',
        'pre_legacy_extend',
        'delegate',
        'call_define',
        'options',
        'define',
        'post_meta',
        'post_legacy_extend',
        'call_prepare',
        'complete',
      ],
    )
    assert.deepEqual(Object.keys(ordu_use.operators()), [
      'next',
      'skip',
      'stop',
      'merge',
      'seneca_plugin',
      'seneca_export',
      'seneca_options',
      'seneca_complete',
    ])

    fin()
  })

  // Validates that @seneca/ prefix can be dropped.
  it('standard-test-plugin', function (t, fin) {
    Seneca()
      .test(fin)
      .quiet()
      .use('test-plugin')
      .ready(function () {
        this.act('role:test,cmd:foo,size:3', function (err, out) {
          assert.equal(out.foo, 6)
          fin()
        })
      })
  })

  it('standard-test-plugin-full-ignore', function (t, fin) {
    Seneca()
      .test(fin)
      .quiet()
      .ignore_plugin('@seneca/test-plugin')
      .use('@seneca/test-plugin')
      .ready(function () {
        assert.equal(this.has_plugin('@seneca/test-plugin'), false)
        this.ignore_plugin('@seneca/test-plugin', false)
          .use('@seneca/test-plugin')
          .ready(function () {
            this.act('role:test,cmd:foo,size:3', function (err, out) {
              assert.equal(out.foo, 6)
              fin()
            })
          })
      })
  })

  it('plugin-ignore-via-options', function (t, fin) {
    Seneca({ plugins: { foo: false } })
      .test(fin)
      .quiet()
      .use(function foo() {})
      .ready(function () {
        assert.equal(this.has_plugin('foo'), false)
        fin()
      })
  })

  it('plugin-ignore-null', function (t, fin) {
    Seneca({ plugins: null })
      .test(fin)
      .quiet()
      .use(function foo() {})
      .ready(function () {
        fin()
      })
  })

  it('plugin-delegate-init', function (t, fin) {
    Seneca()
      .test(fin)
      .quiet()
      .use(
        function p0(opts) {
          var z

          this.add('a:1', function (msg, reply) {
            reply({ x: msg.x, y: opts.y, z: z })
          })

          this.init(function (done) {
            z = 4
            done()
          })
        },
        { y: 3 },
      )
      .ready(function () {
        this.act('a:1,x:2', function (err, out) {
          assert.deepEqual(out, { x: 2, y: 3, z: 4 })
          fin()
        })
      })
  })

  it('load-defaults', function (t, fin) {
    let s0 = Seneca().test(fin)

    s0.use(
      {
        define: function (options) {
          assert.deepEqual(options, { a: 1, b: 1 })
        },
        defaults: {
          a: 1,
          b: Number,
        },
      },
      { b: 1 },
    )

    s0.quiet()

      // NOTE: the assertions are in the plugin
      .use('./stubs/bar-plugin', {
        b: 2,
      })
      .ready(fin)
  })

  it('load-relative-to-root', function (t, fin) {
    var subfolder = require('./stubs/plugin/subfolder')
    subfolder(function (out) {
      assert.equal(out, 'relative-to-root')
      fin()
    })
  })

  it('good-default-options', function (t, fin) {
    var init_p1 = function (opts) {
      assert.deepEqual(opts, { b: 0, c: 1, d: 2 })
    }
    init_p1.defaults = {
      c: 1,
      b: 0,
      d: 0,
    }

    Seneca()
      .test(fin)
      .quiet()

      .use(
        {
          name: 'p0',
          init: function (opts) {
            assert.deepEqual(opts, { a: 1, b: 2 })
          },
          defaults: { a: 1, b: Number },
        },
        {
          b: 2,
        },
      )

      .use(
        {
          name: 'p1',
          init: init_p1,
        },
        {
          d: 2,
        },
      )

      .ready(fin)
  })

  it('bad-default-options', function (t, fin) {
    Seneca({ legacy: false, debug: { undead: true } })
      .test(function (err) {
        assert.equal(err.code, 'invalid_plugin_option')
        fin()
      })
      .quiet()
      .use(
        {
          name: 'p0',
          init: function () {
            assert.fail()
          },
          defaults: {
            a: String,
          },
        },
        {
          a: 1,
          b: 2,
        },
      )
  })

  // A plugin that bundles gubu builds nodes carrying gubu's marker, which
  // shape does not accept. The load fails with a clear error instead.
  it('gubu-default-options', function (t, fin) {
    const gubu_node = { $: { gubu$: true, v$: '9.0.0' }, t: 'string' }
    Seneca({ legacy: false, debug: { undead: true } })
      .test(function (err) {
        assert.equal(err.code, 'plugin_gubu_shape')
        assert.match(
          err.message,
          /Plugin p0: its option defaults were built with gubu \(at a\.b\)/,
        )
        fin()
      })
      .quiet()
      .use({
        name: 'p0',
        define: function () {
          assert.fail()
        },
        defaults: { a: { b: gubu_node } },
      })
  })

  it('gubu-default-shape', function (t, fin) {
    // A prepared gubu shape is a function with a gubu property.
    const gubu_shape = Object.assign(function gubu_shape() {}, { gubu: {} })
    Seneca({ legacy: false, debug: { undead: true } })
      .test(function (err) {
        assert.equal(err.code, 'plugin_gubu_shape')
        assert.match(err.message, /\(at \(root\)\)/)
        fin()
      })
      .quiet()
      .use({
        name: 'p1',
        define: function () {
          assert.fail()
        },
        defaults: gubu_shape,
      })
  })

  // TODO: move to transport
  /*
  it('should return "no errors created." when passing test false', function (fin) {
    Seneca({ tag: 's0' })
      .test(fin)
      .use('./stubs/plugin-error/tmp.js')
      .listen({ type: 'tcp', port: '30010', pin: 'role:tmp' })
      .ready(function () {
        var s0 = this

        var seneca = Seneca({ tag: 'c0' }).test(fin)
        seneca.use('./stubs/plugin-error/tmpApi')
        seneca.client({ type: 'tcp', port: '30010', pin: 'role:tmp' })

        seneca.act(
          { role: 'api', cmd: 'tmpQuery', test: 'false' },
          function (err, res) {
            assert.ifError(err)
            assert.ok(res.message.includes('no errors created.'))
            s0.close(seneca.close.bind(seneca, fin))
          },
        )
      })
  })

  it('should return "error caught!" when passing test true', function (fin) {
    Seneca({ tag: 's0' })
      .test('fin')
      .use('./stubs/plugin-error/tmp.js')
      .listen({ type: 'tcp', port: '30010', pin: 'role:tmp' })
      .ready(function () {
        var s0 = this
        var seneca = Seneca({ tag: 'c1', log: 'silent' })
        seneca.use('./stubs/plugin-error/tmpApi')
        seneca.client({ type: 'tcp', port: '30010', pin: 'role:tmp' })

        seneca.act(
          { role: 'api', cmd: 'tmpQuery', test: 'true' },
          function (err, res) {
            assert.ifError(err)
            assert.ok(res.message.includes('error caught!'))
            s0.close(seneca.close.bind(seneca, fin))
          },
        )
      })
  })
  */

  it('works with exportmap', function (t, fin) {
    var seneca = Seneca.test(fin).quiet()

    seneca.options({
      debug: {
        undead: true,
      },
    })

    seneca.use(function () {
      return {
        name: 'foo',
        exportmap: {
          bar: function (num) {
            assert.equal(num, 42)
            fin()
          },
        },
      }
    })

    seneca.ready(function () {
      assert.equal(typeof seneca.export('foo/bar'), 'function')
      seneca.export('foo/bar')(42)
    })
  })

  it('bad', function (t, fin) {
    var si = Seneca({
      // this lets you change undead per test
      debug: {
        undead: true,
      },
      log: 'silent',
    }).quiet()

    try {
      si.use({ foo: 1 })
    } catch (e) {
      assert.ok(null != e.seneca)
      assert.equal('plugin_no_name', e.code)
    }

    try {
      si.use({ foo: 1 })
    } catch (e) {
      assert.ok(null != e.seneca)
      assert.equal('plugin_no_name', e.code)
    }

    try {
      si.use('not-a-plugin-at-all-at-all')
    } catch (e) {
      assert.ok(null != e.seneca)
      assert.equal('plugin_not_found', e.code)
    }
    si.close(fin)
  })

  it('plugin-error-def', function (t, fin) {
    var si = Seneca({
      debug: {
        undead: true,
      },
      log: 'silent',
      errhandler: function (err) {
        //console.log('AAA', err && err.details, err && err.seneca)
        assert.equal('plugin_define_failed', err.code)
        //console.log('AAA1')
        assert.ok(err.details.fullname.includes('bad_plugin_def'))
        //console.log('AAA2')
        assert.ok(err.details.message.includes('plugin-def'))
        //console.log('AAA3')
        fin()
      },
    }).quiet()

    si.use(function bad_plugin_def() {
      throw new Error('plugin-def')
    })
  })

  it('plugin-error-deprecated', function (t, fin) {
    var si = Seneca({
      debug: {
        undead: true,
      },
      log: 'silent',
      errhandler: function (err) {
        assert.equal('unsupported_legacy_plugin', err.code)
        fin()
      },
    })

    si.use(function (options, register) {
      return { name: 'OldPlugin' }
    })
  })

  it('plugin-error-define-throws-non-error', function (t, fin) {
    var si = Seneca({
      debug: {
        undead: true,
      },
      log: 'silent',
      errhandler: function (err) {
        assert.equal('plugin_define_failed', err.code)
        assert.ok(err.details.fullname.includes('bad_plugin_def_string'))
        assert.ok(err.details.message.includes('plugin-def-string'))
        fin()
      },
    }).quiet()

    si.use(function bad_plugin_def_string() {
      throw 'plugin-def-string'
    })
  })

  it('plugin-error-add', function (t, fin) {
    Seneca({
      debug: { undead: true },
    })
      .quiet()
      .error(function (err) {
        assert.equal('plugin_define_failed', err.code)
        assert.equal('shape', err.orig.code)
        fin()
      })
      .use(function foo() {
        this.add('a', 'b')
      })
  })

  it('plugin-error-act', function (t, fin) {
    var si = Seneca({
      debug: {
        undead: true,
      },
      log: 'silent',
      errhandler: function (err) {
        // assert.equal('seneca: Action foo:1 failed: act-cb.', err.message)
        assert.equal('act-cb', err.message)
        fin()
      },
    })

    si.add('foo:1', function (args, cb) {
      cb(new Error('act-cb'))
    })

    si.use(function () {
      this.act('foo:1')
    })
  })

  it('depends', function (t, fin) {
    var si = Seneca({
      // this lets you change undead per test
      debug: {
        undead: true,
      },
      log: 'silent',
    })

    si.use(function () {
      return { name: 'aaa' }
    })

    si.use(function () {
      this.depends('bbb', ['aaa'])
      return { name: 'bbb' }
    })

    si.options({
      errhandler: function (err) {
        assert.equal('plugin_required', err.code)
      },
    })

    si.use(function () {
      this.depends('ccc', ['zzz'])
      return { name: 'ccc' }
    })

    si.use(function () {
      return { name: 'ddd' }
    })

    si.use(function () {
      this.depends('eee', 'aaa')
      return { name: 'eee' }
    })

    si.use(function () {
      this.depends('fff', ['aaa', 'ddd'])
      return { name: 'fff' }
    })

    si.use(function () {
      this.depends('ggg', 'aaa', 'ddd')
      return { name: 'ggg' }
    })

    si.use(function () {
      this.depends('hhh', 'aaa', 'zzz')
      return { name: 'hhh' }
    })

    var si1 = Seneca({ legacy: false }).test(fin)

    si1.use(function () {
      this.depends('iii')
      return { name: 'iii' }
    })

    si1.ready(function () {
      fin()
    })
  })

  it('plugin-fix', function (_t, fin) {
    var si = Seneca.test(fin)

    function echo(args, cb) {
      cb(null, Object.assign({ t: Date.now() }, args))
    }

    var plugin_aaa = function aaa() {
      this.add({ a: 1 }, function (args, cb) {
        this.act('z:1', function (err, out) {
          assert.ifError(err)
          cb(null, Object.assign({ a: 1 }, out))
        })
      })
    }

    si.add({ z: 1 }, echo)
    si.use(plugin_aaa)

    assert.equal(si.hasact({ z: 1 }), true)

    si.act({ a: 1 }, function (err, out) {
      assert.ifError(err)
      assert.equal(1, out.a)
      assert.equal(1, out.z)
      assert.ok(null != out.t)
      assert.equal(si.hasact({ a: 1 }), true)

      si.fix({ q: 1 }).use(function bbb() {
        this.add({ a: 1 }, function (args, fin) {
          this.act('z:1', function (err, out) {
            assert.ifError(err)
            fin(null, Object.assign({ a: 1, w: 1 }, out))
          })
        })
      })

      assert.equal(si.hasact({ a: 1 }), true)
      assert.equal(si.hasact({ a: 1, q: 1 }), true)

      si.act({ a: 1 }, function (err, out) {
        assert.ifError(err)
        assert.equal(1, out.a)
        assert.equal(1, out.z)
        assert.ok(null != out.t)

        si.act({ a: 1, q: 1 }, function (err, out) {
          assert.ifError(err)
          assert.equal(1, out.a)
          assert.equal(1, out.z)
          assert.equal(1, out.w)
          assert.ok(null != out.t)

          si.close(fin)
        })
      })
    })
  })

  it('export', function (t, fin) {
    var si = Seneca({
      // this lets you change undead per test
      debug: {
        undead: true,
      },
      strict: {
        exports: true,
      },
      log: 'silent',
    })

    si.use(function badexport() {})

    si.options({
      errhandler: function (err) {
        assert.equal('export_not_found', err.code)
        fin()
      },
    })

    si.export('not-an-export')
  })

  it('handles plugin with action that timesout', function (t, fin) {
    Seneca({ log: 'silent', timeout: 10, debug: { undead: true } })
      .use(function foo() {
        this.add({ role: 'plugin', cmd: 'timeout' }, function () {})
      })
      .act({ role: 'plugin', cmd: 'timeout' }, function (err) {
        assert.ok(null != err)
        this.close(fin)
      })
  })

  it('handles plugin action that throws an error', function (t, fin) {
    var seneca = Seneca({ log: 'silent' })

    seneca.use(function foo() {
      this.add({ role: 'plugin', cmd: 'throw' }, function () {
        throw new Error()
      })
    })

    seneca.act({ role: 'plugin', cmd: 'throw' }, function (err) {
      assert.ok(null != err)
      seneca.close(fin)
    })
  })

  // it('calling act from init actor is deprecated', function (fin) {
  //   var seneca = Seneca.test(fin)

  //   seneca.add(
  //     { role: 'metrics', subscriptions: 'create' },
  //     function (data, callback) {
  //       callback()
  //     }
  //   )

  //   seneca.add({ init: 'msgstats-metrics' }, function () {
  //     seneca.act({ role: 'metrics', subscriptions: 'create' }, function (err) {
  //       assert.ifError(err)
  //       fin()
  //     })
  //   })

  //   seneca.act({ init: 'msgstats-metrics' })
  // })

  it('plugin actions receive errors in callback function', function (t, fin) {
    var seneca = Seneca().test().quiet()

    seneca.fixedargs['fatal$'] = false

    seneca.use(function service() {
      this.add({ role: 'plugin', cmd: 'throw' }, function (args, next) {
        assert.equal(args.blah, 'blah')
        next(new Error('from action'))
      })
    })
    seneca.use(function client() {
      var self = this

      this.ready(function () {
        self.act(
          { role: 'plugin', cmd: 'throw', blah: 'blah' },
          function (err) {
            assert.ok(null != err)
            assert.ok(err.message.includes('from action'))
            fin()
          },
        )
      })
    })
  })

  it('dynamic-load-sequence', function (t, fin) {
    var a = []
    var seneca = Seneca.test(fin)

    seneca.options({ debug: { undead: true } })

    seneca
      .use(function first() {
        this.add('init:first', function (m, d) {
          a.push(1)
          d()
        })
      })
      .ready(function () {
        this.use(function second() {
          this.add('init:second', function (m, d) {
            a.push(2)
            d()
          })
        }).ready(function () {
          this.use(function third() {
            this.add('init:third', function (m, d) {
              a.push(3)
              d()
            })
          }).ready(function () {
            assert.deepEqual(a, [1, 2, 3])
            fin()
          })
        })
      })
  })

  it('serial-load-sequence', function (t, fin) {
    var log = []

    Seneca.test(fin, 'silent')
      .use(function foo() {
        log.push('a')
        this.add('init:foo', function (msg, reply) {
          log.push('b')
          reply()
        })
      })
      .use(function bar() {
        log.push('c')
        this.add('init:bar', function (msg, reply) {
          log.push('d')
          reply()
        })
      })
      .ready(function () {
        assert.equal(log.join(''), 'abcd')
        fin()
      })
  })

  it('define-load-sequence', function (t, fin) {
    var log = []

    Seneca.test(fin, 'silent')
      .add('a:1', function (msg, reply) {
        log.push('A')
        reply({ x: msg.x })
      })
      .act('a:1,x:4', function (err, out) {
        log.push('B')
        assert.ifError(err)
        assert.equal(out.x, 4)
      })
      .use(function foo() {
        log.push('C')
        this.add('foo:1', function (msg, reply) {
          log.push('I')
          reply({ y: msg.y })
        })
        this.act('a:1,x:2', function (err, out) {
          log.push('D')
          assert.ifError(err)
          assert.equal(out.x, 2)
        })
        this.add('init:foo', function (msg, reply) {
          log.push('E')
          reply()
        })
      })
      .use(function bar() {
        log.push('F')
        this.add('init:bar', function (msg, reply) {
          log.push('G')
          this.act('foo:1,y:3', function (err, out) {
            log.push('H')
            assert.ifError(err)
            assert.equal(out.y, 3)
            reply()
          })
        })
      })
      .act('a:1,x:5', function (err, out) {
        log.push('J')
        assert.ifError(err)
        assert.equal(out.x, 5)
      })
      .ready(function () {
        log.push('K')
        assert.equal(log.join(''), 'AB CADE FGIH AJ K'.replace(/ /g, ''))
        fin()
      })
  })

  it('plugin options can be modified by plugins during load sequence', function (t, fin) {
    var seneca = Seneca({
      log: 'test',
      plugin: {
        foo: {
          x: 1,
        },
        bar: {
          x: 2,
        },
      },
    })

    seneca
      .use(function foo(opts) {
        assert.equal(opts.x, 1)
        this.add('init:foo', function (msg, reply) {
          this.options({ plugin: { bar: { y: 3 } } })
          reply()
        })
      })
      .use(function bar(opts) {
        assert.equal(opts.x, 2)
        assert.equal(opts.y, 3)
        this.add('init:bar', function (msg, reply) {
          reply()
        })
      })
      .ready(function () {
        assert.deepEqual(seneca.options().plugin.foo, { x: 1 })
        assert.deepEqual(seneca.options().plugin.bar, { x: 2, y: 3 })
        fin()
      })
  })

  it('plugin options can be modified by plugins during init sequence', function (t, fin) {
    var seneca = Seneca({
      log: 'silent',
      plugin: {
        foo: {
          x: 1,
        },
        bar: {
          x: 2,
        },
        foobar: {},
      },
    })

    seneca
      .use(function foo(options) {
        assert.equal(options.x, 1)
        this.add('init:foo', function (msg, cb) {
          this.options({ plugin: { foo: { y: 3 } } })
          cb()
        })
      })
      .use(function bar() {
        this.add('init:bar', function (msg, cb) {
          assert.deepEqual(seneca.options().plugin.foo, { x: 1, y: 3 })
          this.options({ plugin: { bar: { y: 4 } } })
          cb()
        })
      })
      .use(function foobar() {
        this.add('init:foobar', function (msg, cb) {
          this.options({
            plugin: {
              foobar: {
                foo: seneca.options().plugin.foo,
                bar: seneca.options().plugin.bar,
              },
            },
          })
          cb()
        })
      })
      .ready(function () {
        assert.deepEqual(seneca.options().plugin.foo, { x: 1, y: 3 })
        assert.deepEqual(seneca.options().plugin.bar, { x: 2, y: 4 })
        assert.deepEqual(seneca.options().plugin.foobar, {
          foo: { x: 1, y: 3 },
          bar: { x: 2, y: 4 },
        })
        fin()
      })
  })

  it('plugin init can add actions for future init actions to call', function (t, fin) {
    var seneca = Seneca.test(fin, 'silent')

    seneca
      .use(function foo() {
        this.add('init:foo', function (msg, cb) {
          this.add({ role: 'test', cmd: 'foo' }, function (args, cb) {
            cb(null, { success: true })
          })
          cb()
        })
      })
      .use(function bar() {
        this.add('init:bar', function (msg, cb) {
          this.act({ role: 'test', cmd: 'foo' }, function (err, result) {
            assert.ifError(err)
            assert.equal(result.success, true)
            seneca.success = true
            cb()
          })
        })
      })
      .ready(function () {
        assert.equal(seneca.success, true)
        fin()
      })
  })

  it('plugin-init-error', function (t, fin) {
    var si = Seneca({ log: 'silent', debug: { undead: true } })
      .error(function (err) {
        fin()
      })
      .use(function foo() {
        this.add('init:foo', function (config, reply) {
          reply(new Error('foo'))
        })
      })
  })

  it('plugin-extend-action-modifier', function (t, fin) {
    var si = Seneca({ legacy: false, log: 'silent' })
      .test()
      .use(function foo() {
        return {
          extend: {
            action_modifier: function (actdef) {
              actdef.validate = function (msg, reply) {
                if (!msg.x) reply(new Error('no x!'))
                else reply(null, actdef)
              }
            },
          },
        }
      })
      .ready(function () {
        this.add('a:1', function (msg, reply) {
          reply({ x: msg.x })
        }).act('a:1,x:1', function (err, out) {
          assert.ifError(err)
          assert.equal(out.x, 1)

          this.act('a:1,y:1', function (err, out) {
            assert.ok(null == out)
            assert.ok(null != err)
            assert.equal(err.code, 'act_invalid_msg')
            fin()
          })
        })
      })
  })

  it('plugin-extend-logger', function (t, fin) {
    var si = Seneca({ log: 'silent' })
      .use(function foo() {
        return {
          extend: {
            logger: function (seneca, data) {
              console.log(data)
            },
          },
        }
      })
      .act('sys:seneca,cmd:stats')
      .ready(fin)
  })

  it('plugins-from-options', function (t, fin) {
    var tmp = {}
    var si = Seneca({
      log: 'silent',
      debug: { undead: true },
      plugins: {
        foo: function () {
          tmp.foo = 1
        },
        bar: {
          name: 'bar',
          define: function () {
            tmp.bar = 1
          },
        },
        zed: {
          name: 'zed',
          init: function () {
            tmp.zed = 1
          },
        },
      },
    })
      .test(fin)
      .quiet()
      .ready(function () {
        assert.equal(Object.keys(this.plugins()).length, 4)
        assert.deepEqual(tmp, { foo: 1, bar: 1, zed: 1 })
        fin()
      })
  })

  it('plugins-from-bad-options', function (t, fin) {
    var si = Seneca({
      debug: { undead: true },
    })
      .test(function (err) {
        // TODO: updated use-plugin should give error explaining that
        // no `define` function exists in plugin spec
        assert.ok(null != err)
        fin()
      })
      .quiet()
      .use({
        name: 'bad',
      })
  })

  it('plugins-options-precedence', function (t, fin) {
    var si = Seneca({
      legacy: false,
      debug: { undead: true },
      plugin: {
        foo: { a: 2, c: 2 },
        bar: { a: 2, c: 1 },
      },
    }).test(fin)

    function bar(opts) {
      assert.deepEqual(opts, { a: 3, b: 1, c: 1, d: 1 })
    }
    bar.defaults = { a: 1, b: 1, c: 1, d: 1 }

    si.use(
      {
        name: 'foo',
        defaults: { a: 1, b: 1, c: 1, d: 1 },
        init: function (opts) {
          assert.deepEqual(opts, { a: 2, b: 2, c: 3, d: 1 })
        },
      },
      { b: 2, c: 3, d: 1 },
    )
      .use(bar, { a: 3, d: 1 })

      .ready(function () {
        assert.deepEqual(this.options().plugin, {
          bar: { a: 3, c: 1, d: 1, b: 1 },
          foo: { a: 2, c: 3, b: 2, d: 1 },
        })
        fin()
      })
  })

  it('error-plugin-define', function (t, fin) {
    var s0 = Seneca({ legacy: false, log: 'silent', debug: { undead: true } })
    s0.error(function (err) {
      try {
        assert.equal(err.code, 'e0')
        assert.ok(err.message.includes('a is 1'))
        fin()
      } catch (e) {
        fin(e)
      }
    })

    var p0 = function p0() {
      this.fail('e0', { a: 1 })
    }
    p0.errors = {
      e0: 'a is <%=a%>',
    }

    s0.use(p0)
  })

  it('error-plugin-init', function (t, fin) {
    var s0 = Seneca({ log: 'silent', debug: { undead: true } })
    s0.error(function (err) {
      try {
        assert.equal(err.code, 'e0')
        assert.ok(err.message.includes('a is 1'))
        fin()
      } catch (e) {
        fin(e)
      }
    })

    var p0 = function p0() {
      this.init(function () {
        this.fail('e0', { a: 1 })
      })
    }
    p0.errors = {
      e0: 'a is <%=a%>',
    }

    s0.use(p0)
  })

  it('error-plugin-action', function (t, fin) {
    var s0 = Seneca({ log: 'silent', debug: { undead: true } })

    var p0 = function p0() {
      this.add('a:1', function (msg, reply) {
        this.fail('e0', { a: 1 })
      })
    }
    p0.errors = {
      e0: 'a is <%=a%>',
    }

    s0.use(p0).act('a:1', function (err) {
      try {
        assert.equal(err.code, 'e0')
        assert.ok(err.message.includes('a is 1'))
        fin()
      } catch (e) {
        fin(e)
      }
    })
  })

  it('no-name', function (t, fin) {
    var s0 = Seneca().test(fin)
    s0.use(function () {})
    s0.use('./stubs/plugin/no-name.js')
    s0.use(__dirname + '/stubs/plugin/no-name.js')
    s0.ready(function () {
      assert.equal(Object.keys(s0.list_plugins()).length, 4)
      fin()
    })
  })

  it('plugin-order-task-args', function (t, fin) {
    var s0 = Seneca({ legacy: false }).test(fin)

    var args_task = s0.order.plugin.task.args
    assert.equal(args_task.name, 'args')

    var out = args_task.exec({ ctx: { args: [] } })
    assert.deepEqual(out, { op: 'merge', out: { plugin: { args: [] } } })

    out = args_task.exec({ ctx: { args: ['foo'] } })
    assert.deepEqual(out, { op: 'merge', out: { plugin: { args: ['foo'] } } })

    function a() {}
    out = args_task.exec({ ctx: { args: [a] } })
    assert.deepEqual(out, { op: 'merge', out: { plugin: { args: [a] } } })

    var b = {}
    out = args_task.exec({ ctx: { args: [b] } })
    assert.deepEqual(out, {
      op: 'merge',
      out: { plugin: { args: [{ init: void 0 }] } },
    })

    var b = { define: a }
    out = args_task.exec({ ctx: { args: [b] } })
    assert.deepEqual(out, {
      op: 'merge',
      out: { plugin: { args: [{ init: a, define: a }] } },
    })

    fin()
  })

  it('plugin-defaults-function', function (t, fin) {
    var s0 = Seneca().test(fin)

    s0.use(
      {
        defaults: (opts) => {
          return {
            x: Number,
            y: 'Y',
          }
        },
        define: function p0(options) {
          assert.deepEqual(options, { x: 1, y: 'Y' })
        },
      },
      { x: 1 },
    )

    s0.ready(function () {
      assert.deepEqual(s0.options().plugin.p0, { x: 1, y: 'Y' })
      fin()
    })
  })

  it('plugin-defaults-valid-plain', function (t, fin) {
    var s0 = Seneca({ legacy: false }).test(fin)

    s0.use(
      {
        defaults: {
          x: Number,
          y: 'Y',
        },
        define: function p0(options) {
          assert.deepEqual(options, { x: 1, y: 'Y' })
        },
      },
      { x: 1 },
    )

    s0.ready(function () {
      assert.deepEqual(s0.options().plugin.p0, { x: 1, y: 'Y' })
      fin()
    })
  })

  it('plugin-defaults-valid-prepared', function (t, fin) {
    var s0 = Seneca({ legacy: false }).test(fin)

    s0.use(
      {
        defaults: Seneca.valid({
          x: Number,
          y: 'Y',
        }),
        define: function p0(options) {
          assert.deepEqual(options, { x: 1, y: 'Y' })
        },
      },
      { x: 1 },
    )

    s0.ready(function () {
      assert.deepEqual(s0.options().plugin.p0, { x: 1, y: 'Y' })
      fin()
    })
  })

  it('delegate-plugin-access', function (t, fin) {
    function p1(opts) {
      assert.equal(opts.foo, 1)
      assert.ok(null == opts.ned)
      assert.equal(this.plugin.name, 'p1')
      assert.equal(this.context.qaz, 3)
      this.shared.bar = 2

      this.add('a:1', function a1(msg, reply) {
        assert.equal(this.shared.bar, 2)
        assert.ok(null == this.shared.bob)
        assert.equal(this.plugin.name, 'p1')
        assert.equal(this.plugin.options.foo, 1)
        assert.ok(null == this.plugin.options.ned)
        assert.equal(this.context.qaz, 3)
        return reply({ x: 1 + msg.x })
      })

      this.add('b:1', function b1(msg, reply) {
        assert.equal(this.shared.bar, 2)
        assert.equal(this.plugin.name, 'p1')
        assert.equal(this.plugin.options.foo, 1)
        assert.ok(null == this.plugin.options.ned)
        assert.equal(this.context.qaz, 3)
        this.act('a:1', { x: msg.x }, function (err, out) {
          return reply({ x: 2 * out.x })
        })
      })

      this.add('c:1', function c1(msg, reply) {
        assert.equal(this.shared.bar, 2)
        assert.equal(this.plugin.name, 'p1')
        assert.equal(this.plugin.options.foo, 1)
        assert.ok(null == this.plugin.options.ned)
        assert.equal(this.context.qaz, 3)
        return reply({ x: 2 * msg.x })
      })

      this.add('c:1', function c1p(msg, reply) {
        assert.equal(this.shared.bar, 2)
        assert.equal(this.plugin.name, 'p1')
        assert.equal(this.plugin.options.foo, 1)
        assert.ok(null == this.plugin.options.ned)
        assert.equal(this.context.qaz, 3)
        this.prior(msg, function (err, out) {
          return reply({ x: 5 * out.x })
        })
      })
    }

    // Should not overlap with p1
    function p2(opts) {
      assert.ok(null == opts.foo)
      assert.equal(opts.ned, 4)
      assert.equal(this.plugin.name, 'p2')
      assert.equal(this.context.qaz, 3)
      this.shared.bob = 5

      this.add('d:1', function d1(msg, reply) {
        assert.equal(this.shared.bob, 5)
        assert.ok(null == this.shared.bar)
        assert.equal(this.plugin.name, 'p2')
        assert.equal(this.plugin.options.ned, 4)
        assert.ok(null == this.plugin.options.foo)
        assert.equal(this.context.qaz, 3)
        return reply({ x: 3 * msg.x })
      })

      // Calls other plugin
      this.add('e:1', function e1(msg, reply) {
        assert.equal(this.shared.bob, 5)
        assert.ok(null == this.shared.bar)
        assert.equal(this.plugin.name, 'p2')
        assert.equal(this.plugin.options.ned, 4)
        assert.ok(null == this.plugin.options.foo)
        assert.equal(this.context.qaz, 3)

        this.act('a:1', { x: msg.x }, function (err, out) {
          // Back to p1 context
          assert.equal(this.shared.bar, 2)
          assert.ok(null == this.shared.bob)
          assert.equal(this.plugin.name, 'p1')
          assert.equal(this.plugin.options.foo, 1)
          assert.ok(null == this.plugin.options.ned)
          assert.equal(this.context.qaz, 3)

          reply({ x: 0.5 + out.x })
        })
      })
    }

    const s0 = Seneca({ legacy: false }).test(fin)
    s0.context.qaz = 3
    s0.use(p1, { foo: 1 })
    s0.use(p2, { ned: 4 })

    s0.add('q:1', function q1(msg, reply) {
      assert.equal(this.context.qaz, 3)
      assert.equal(this.plugin.name, 'root$')
      assert.ok(null == this.plugin.options.foo)
      assert.ok(null == this.plugin.options.ned)
      assert.ok(null == this.shared.bob)
      assert.ok(null == this.shared.bar)

      reply({ x: 0.1 + msg.x })
    })

    s0.add('w:1', function w1(msg, reply) {
      assert.equal(this.context.qaz, 3)
      assert.equal(this.plugin.name, 'root$')
      assert.ok(null == this.plugin.options.foo)
      assert.ok(null == this.plugin.options.ned)
      assert.ok(null == this.shared.bob)
      assert.ok(null == this.shared.bar)

      this.act('e:1', { x: msg.x }, function (err, out) {
        reply({ x: 0.2 + out.x })
      })
    })

    p1_test()

    function p1_test() {
      s0.act({ a: 1, x: 2 }, function (err, out) {
        assert.deepEqual(out, { x: 3 })

        // Callback has plugin action context
        assert.equal(this.shared.bar, 2)
        assert.equal(this.plugin.name, 'p1')
        assert.equal(this.plugin.options.foo, 1)
        assert.equal(this.context.qaz, 3)

        s0.act({ b: 1, x: 2 }, function (err, out) {
          assert.deepEqual(out, { x: 6 })

          assert.equal(this.shared.bar, 2)
          assert.equal(this.plugin.name, 'p1')
          assert.equal(this.plugin.options.foo, 1)
          assert.equal(this.context.qaz, 3)

          s0.act({ c: 1, x: 2 }, function (err, out) {
            assert.deepEqual(out, { x: 20 })

            // Callback has plugin action context
            assert.equal(this.shared.bar, 2)
            assert.equal(this.plugin.name, 'p1')
            assert.equal(this.plugin.options.foo, 1)
            assert.equal(this.context.qaz, 3)

            p2_test()
          })
        })
      })
    }

    function p2_test() {
      s0.act({ d: 1, x: 2 }, function (err, out) {
        assert.deepEqual(out, { x: 6 })

        assert.equal(this.shared.bob, 5)
        assert.ok(null == this.shared.bar)
        assert.equal(this.plugin.name, 'p2')
        assert.equal(this.plugin.options.ned, 4)
        assert.ok(null == this.plugin.options.foo)
        assert.equal(this.context.qaz, 3)

        s0.act({ e: 1, x: 2 }, function (err, out) {
          assert.deepEqual(out, { x: 3.5 })

          // p2 context!!!
          assert.equal(this.shared.bob, 5)
          assert.ok(null == this.shared.bar)
          assert.equal(this.plugin.name, 'p2')
          assert.equal(this.plugin.options.ned, 4)
          assert.ok(null == this.plugin.options.foo)
          assert.equal(this.context.qaz, 3)

          root$_test()
        })
      })
    }

    function root$_test() {
      s0.act('q:1,x:2', function (err, out) {
        assert.equal(out.x, 2.1)

        assert.equal(this.context.qaz, 3)
        assert.equal(this.plugin.name, 'root$')
        assert.ok(null == this.plugin.options.foo)
        assert.ok(null == this.plugin.options.ned)
        assert.ok(null == this.shared.bob)
        assert.ok(null == this.shared.bar)

        s0.act('w:1,x:2', function (err, out) {
          assert.equal(out.x, 3.7)

          assert.equal(this.context.qaz, 3)
          assert.equal(this.plugin.name, 'root$')
          assert.ok(null == this.plugin.options.foo)
          assert.ok(null == this.plugin.options.ned)
          assert.ok(null == this.shared.bob)
          assert.ok(null == this.shared.bar)

          fin()
        })
      })
    }
  })

  it('plugin-options-no-defaults', function (t, fin) {
    const tmp = {}
    const p0 = (opts) => {
      Object.assign(tmp, opts)
    }
    Seneca({ legacy: false })
      .test()
      .use(p0, { x: 1 })
      .ready(function () {
        assert.equal(tmp.x, 1)
        fin()
      })
  })

  it('plugin-options-valid-general-inactive', function (t, fin) {
    const tmp = {}
    const p0 = (opts) => {
      Object.assign(tmp, opts)
    }
    p0.defaults = { x: String }
    Seneca({ legacy: false, valid: { active: false } })
      .test()
      .use(p0, { x: 1 })
      .ready(function () {
        assert.equal(tmp.x, 1)
        fin()
      })
  })

  it('plugin-options-valid-plugin-inactive', function (t, fin) {
    const tmp = {}
    const p0 = (opts) => {
      Object.assign(tmp, opts)
    }
    p0.defaults = { x: String }
    Seneca({ legacy: false, valid: { plugin: false } })
      .test()
      .use(p0, { x: 1 })
      .ready(function () {
        assert.equal(tmp.x, 1)
        fin()
      })
  })

  it('plugin-options-directives-with-defaults', function (t, fin) {
    // init$ and defined$ are loading directives, not plugin options, so a
    // plugin with defaults accepts them.
    const seen = { options: null, init: 0, defined: 0 }
    const p0 = function p0(opts) {
      seen.options = opts
      this.init(function (reply) {
        seen.init++
        reply()
      })
    }
    p0.defaults = { a: 1 }

    const seneca = Seneca({ legacy: false })
      .test(fin)
      .use(p0, { a: 2, init$: false, defined$: () => seen.defined++ })

    seneca.ready(function () {
      assert.deepEqual(seen.options, { a: 2 })
      assert.equal(seen.init, 0)
      assert.equal(seen.defined, 1)
      assert.equal(seneca.options().plugin.p0.init$, false)
      fin()
    })
  })

  it('plugin-options-inited-tag-directives-with-defaults', function (t, fin) {
    let inited = 0
    const p0 = function p0(opts) {
      this.init(function (reply) {
        reply()
      })
    }
    p0.defaults = { a: 1 }

    const seneca = Seneca({ legacy: false })
      .test(fin)
      .use(p0, { tag$: 't0', inited$: () => inited++ })

    seneca.ready(function () {
      assert.equal(inited, 1)
      assert.equal(seneca.has_plugin('p0', 't0'), true)
      fin()
    })
  })
})
