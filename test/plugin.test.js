/* Copyright © 2013-2020 Richard Rodger and other contributors, MIT License. */
'use strict'

const Code = require('@hapi/code')
const Lab = require('@hapi/lab')

var lab = (exports.lab = Lab.script())
var describe = lab.describe
var expect = Code.expect

var Shared = require('./shared')
var it = Shared.make_it(lab)

var Seneca = require('..')
var { Plugin } = require('../lib/plugin')

describe('plugin', function () {
  it('use.intern', (fin) => {
    expect(Plugin.intern).exists()

    var Joi = Seneca.util.Joi

    var spec = {
      a: null,
      b: void 0,
      c: Joi.object(),
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
    expect(out.validate(spec).error).not.exists()

    out = Plugin.intern.prepare_spec(Joi, spec, { allow_unknown: true })
    //console.dir(out.describe(),{depth:null})

    //console.dir(out.validate({}),{depth:null})
    expect(out.validate({}).value).equals({
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
    expect(out.validate(spec).error).not.exists()

    fin()
  })

  it('plugin-edges', (fin) => {
    var s = Seneca({ debug: { undead: true } }).test(fin)

    try {
      s.use()
      Code.fail('empty-use-should-throw')
    } catch (e) {
      expect(e.message).includes('seneca.use')
      fin()
    }
  })

  it('plugin-internal-ordu', (fin) => {
    var s = Seneca().test(fin)

    var sin = s.internal()

    var ordu_use = sin.ordu.use
    expect(ordu_use.tasks().map((t) => t.name)).equal([
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
    ])
    expect(Object.keys(ordu_use.operators())).equal([
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
  it('standard-test-plugin', function (fin) {
    Seneca()
      .test(fin)
      .quiet()
      .use('test-plugin')
      .ready(function () {
        this.act('role:test,cmd:foo,size:3', function (err, out) {
          expect(out.foo).equal(6)
          fin()
        })
      })
  })

  it('standard-test-plugin-full-ignore', function (fin) {
    Seneca()
      .test(fin)
      .quiet()
      .ignore_plugin('@seneca/test-plugin')
      .use('@seneca/test-plugin')
      .ready(function () {
        expect(this.has_plugin('@seneca/test-plugin')).false()
        this.ignore_plugin('@seneca/test-plugin', false)
          .use('@seneca/test-plugin')
          .ready(function () {
            this.act('role:test,cmd:foo,size:3', function (err, out) {
              expect(out.foo).equal(6)
              fin()
            })
          })
      })
  })

  it('plugin-ignore-via-options', function (fin) {
    Seneca({ plugins: { foo: false } })
      .test(fin)
      .quiet()
      .use(function foo() {})
      .ready(function () {
        expect(this.has_plugin('foo')).false()
        fin()
      })
  })

  it('plugin-ignore-null', function (fin) {
    Seneca({ plugins: null })
      .test(fin)
      .quiet()
      .use(function foo() {})
      .ready(function () {
        fin()
      })
  })

  it('plugin-delegate-init', function (fin) {
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
          expect(out).equal({ x: 2, y: 3, z: 4 })
          fin()
        })
      })
  })

  it('load-defaults', function (fin) {
    Seneca()
      .test(fin)
      .quiet()

      // NOTE: the assertions are in the plugin
      .use('./stubs/bar-plugin', {
        b: 2,
      })
      .ready(fin)
  })

  it('load-relative-to-root', function (fin) {
    var subfolder = require('./stubs/plugin/subfolder')
    subfolder(function (out) {
      expect(out).equal('relative-to-root')
      fin()
    })
  })

  it('good-default-options', function (fin) {
    var init_p1 = function (opts) {
      expect(opts).equal({ c: 1, d: 2 })
    }
    init_p1.defaults = {
      c: 1,
    }

    Seneca()
      .test(fin)
      .quiet()

      .use(
        {
          name: 'p0',
          init: function (opts) {
            expect(opts).equal({ a: 1, b: 2 })
          },
          defaults: { a: 1 },
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

  it('bad-default-options', function (fin) {
    Seneca({ debug: { undead: true } })
      .test(function (err) {
        expect(err.code).equals('invalid_plugin_option')
        fin()
      })
      .quiet()
      .use(
        {
          name: 'p0',
          init: function () {
            Code.fail()
          },
          defaults: {
            a: Seneca.util.Joi.string(),
          },
        },
        {
          a: 1,
          b: 2,
        },
      )
  })

  // REMOVE in 4.x
  it('legacy-options', function (fin) {
    var si = Seneca({ log: 'silent' }).quiet()

    si.use('options', { a: 1 })
    expect(si.export('options').a).equal(1)

    si.use('options', require('./stubs/plugin/options.file.js'))
    expect(si.export('options').b).equal(2)

    fin()
  })

  it('should return "no errors created." when passing test false', function (fin) {
    Seneca({ tag: 's0', log: 'silent' })
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
            expect(err).to.not.exist()
            expect(res.message).to.contain('no errors created.')
            s0.close(seneca.close.bind(seneca, fin))
          },
        )
      })
  })

  it('should return "error caught!" when passing test true', function (fin) {
    Seneca({ tag: 's0', log: 'silent' })
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
            expect(err).to.not.exist()
            expect(res.message).to.contain('error caught!')
            s0.close(seneca.close.bind(seneca, fin))
          },
        )
      })
  })

  it('works with exportmap', function (fin) {
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
            expect(num).to.equal(42)
            fin()
          },
        },
      }
    })

    seneca.ready(function () {
      expect(typeof seneca.export('foo/bar')).to.equal('function')
      seneca.export('foo/bar')(42)
    })
  })

  it('bad', function (fin) {
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
      expect(e.seneca).to.exist()
      expect('plugin_no_name').to.equal(e.code)
    }

    try {
      si.use({ foo: 1 })
    } catch (e) {
      expect(e.seneca).to.exist()
      expect('plugin_no_name').to.equal(e.code)
    }

    try {
      si.use('not-a-plugin-at-all-at-all')
    } catch (e) {
      expect(e.seneca).to.exist()
      expect('plugin_not_found').to.equal(e.code)
    }
    si.close(fin)
  })

  it('plugin-error-def', function (fin) {
    var si = Seneca({
      debug: {
        undead: true,
      },
      log: 'silent',
      errhandler: function (err) {
        //console.log('AAA', err && err.details, err && err.seneca)
        expect('plugin_define_failed').equal(err.code)
        //console.log('AAA1')
        expect(err.details.fullname).contains('bad_plugin_def')
        //console.log('AAA2')
        expect(err.details.message).contains('plugin-def')
        //console.log('AAA3')
        fin()
      },
    }).quiet()

    si.use(function bad_plugin_def() {
      throw new Error('plugin-def')
    })
  })

  it('plugin-error-deprecated', function (fin) {
    var si = Seneca({
      debug: {
        undead: true,
      },
      log: 'silent',
      errhandler: function (err) {
        expect('unsupported_legacy_plugin').to.equal(err.code)
        fin()
      },
    })

    si.use(function (options, register) {
      return { name: 'OldPlugin' }
    })
  })

  it('plugin-error-add', function (fin) {
    Seneca({
      debug: { undead: true },
      legacy: { transport: false },
    })
      .quiet()
      .error(function (err) {
        expect('plugin_define_failed').to.equal(err.code)
        expect('shape').to.equal(err.orig.code)
        fin()
      })
      .use(function foo() {
        this.add('a', 'b')
      })
  })

  it('plugin-error-act', function (fin) {
    var si = Seneca({
      debug: {
        undead: true,
      },
      log: 'silent',
      errhandler: function (err) {
        expect('seneca: Action foo:1 failed: act-cb.').to.equal(err.message)
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

  it('depends', function (fin) {
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
        expect('plugin_required').to.equal(err.code)
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

  it('plugin-fix', function (fin) {
    var si = Seneca.test(fin)

    function echo(args, cb) {
      cb(null, Object.assign({ t: Date.now() }, args))
    }

    var plugin_aaa = function aaa() {
      this.add({ a: 1 }, function (args, cb) {
        this.act('z:1', function (err, out) {
          expect(err).to.not.exist()
          cb(null, Object.assign({ a: 1 }, out))
        })
      })
    }

    si.add({ z: 1 }, echo)
    si.use(plugin_aaa)

    expect(si.hasact({ z: 1 })).true()

    si.act({ a: 1 }, function (err, out) {
      expect(err).to.not.exist()
      expect(1).to.equal(out.a)
      expect(1).to.equal(out.z)
      expect(out.t).to.exist()
      expect(si.hasact({ a: 1 })).true()

      si.fix({ q: 1 }).use(function bbb() {
        this.add({ a: 1 }, function (args, fin) {
          this.act('z:1', function (err, out) {
            expect(err).to.not.exist()
            fin(null, Object.assign({ a: 1, w: 1 }, out))
          })
        })
      })

      expect(si.hasact({ a: 1 })).true()
      expect(si.hasact({ a: 1, q: 1 })).true()

      si.act({ a: 1 }, function (err, out) {
        expect(err).to.not.exist()
        expect(1).to.equal(out.a)
        expect(1).to.equal(out.z)
        expect(out.t).to.exist()

        si.act({ a: 1, q: 1 }, function (err, out) {
          expect(err).to.not.exist()
          expect(1).to.equal(out.a)
          expect(1).to.equal(out.z)
          expect(1).to.equal(out.w)
          expect(out.t).to.exist()

          si.close(fin)
        })
      })
    })
  })

  it('export', function (fin) {
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
        expect('export_not_found').to.equal(err.code)
        fin()
      },
    })

    si.export('not-an-export')
  })

  it('handles plugin with action that timesout', function (fin) {
    Seneca({ log: 'silent', timeout: 10, debug: { undead: true } })
      .use(function foo() {
        this.add({ role: 'plugin', cmd: 'timeout' }, function () {})
      })
      .act({ role: 'plugin', cmd: 'timeout' }, function (err) {
        expect(err).to.exist()
        this.close(fin)
      })
  })

  it('handles plugin action that throws an error', function (fin) {
    var seneca = Seneca({ log: 'silent' })

    seneca.use(function foo() {
      this.add({ role: 'plugin', cmd: 'throw' }, function () {
        throw new Error()
      })
    })

    seneca.act({ role: 'plugin', cmd: 'throw' }, function (err) {
      expect(err).to.exist()
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
  //       expect(err).to.not.exist()
  //       fin()
  //     })
  //   })

  //   seneca.act({ init: 'msgstats-metrics' })
  // })

  it('plugin actions receive errors in callback function', function (fin) {
    var seneca = Seneca({ log: 'silent' })
    seneca.fixedargs['fatal$'] = false

    seneca.use(function service() {
      this.add({ role: 'plugin', cmd: 'throw' }, function (args, next) {
        expect(args.blah).to.equal('blah')
        next(new Error('from action'))
      })
    })
    seneca.use(function client() {
      var self = this

      this.ready(function () {
        self.act(
          { role: 'plugin', cmd: 'throw', blah: 'blah' },
          function (err) {
            expect(err).to.exist()
            expect(err.msg).to.contain('from action')
            fin()
          },
        )
      })
    })
  })

  it('dynamic-load-sequence', function (fin) {
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
            expect(a).to.equal([1, 2, 3])
            fin()
          })
        })
      })
  })

  it('serial-load-sequence', function (fin) {
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
        expect(log.join('')).to.equal('abcd')
        fin()
      })
  })

  it('define-load-sequence', function (fin) {
    var log = []

    Seneca.test(fin, 'silent')
      .add('a:1', function (msg, reply) {
        log.push('A')
        reply({ x: msg.x })
      })
      .act('a:1,x:4', function (err, out) {
        log.push('B')
        expect(err).not.exist()
        expect(out.x).equals(4)
      })
      .use(function foo() {
        log.push('C')
        this.add('foo:1', function (msg, reply) {
          log.push('I')
          reply({ y: msg.y })
        })
        this.act('a:1,x:2', function (err, out) {
          log.push('D')
          expect(err).not.exist()
          expect(out.x).equals(2)
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
            expect(err).not.exist()
            expect(out.y).equals(3)
            reply()
          })
        })
      })
      .act('a:1,x:5', function (err, out) {
        log.push('J')
        expect(err).not.exist()
        expect(out.x).equals(5)
      })
      .ready(function () {
        log.push('K')
        expect(log.join('')).to.equal('AB CADE FGIH AJ K'.replace(/ /g, ''))
        fin()
      })
  })

  it('plugin options can be modified by plugins during load sequence', function (fin) {
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
        expect(opts.x).to.equal(1)
        this.add('init:foo', function (msg, reply) {
          this.options({ plugin: { bar: { y: 3 } } })
          reply()
        })
      })
      .use(function bar(opts) {
        expect(opts.x).to.equal(2)
        expect(opts.y).to.equal(3)
        this.add('init:bar', function (msg, reply) {
          reply()
        })
      })
      .ready(function () {
        expect(seneca.options().plugin.foo).to.equal({ x: 1 })
        expect(seneca.options().plugin.bar).to.equal({ x: 2, y: 3 })
        fin()
      })
  })

  it('plugin options can be modified by plugins during init sequence', function (fin) {
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
        expect(options.x).to.equal(1)
        this.add('init:foo', function (msg, cb) {
          this.options({ plugin: { foo: { y: 3 } } })
          cb()
        })
      })
      .use(function bar() {
        this.add('init:bar', function (msg, cb) {
          expect(seneca.options().plugin.foo).to.equal({ x: 1, y: 3 })
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
        expect(seneca.options().plugin.foo).to.equal({ x: 1, y: 3 })
        expect(seneca.options().plugin.bar).to.equal({ x: 2, y: 4 })
        expect(seneca.options().plugin.foobar).to.equal({
          foo: { x: 1, y: 3 },
          bar: { x: 2, y: 4 },
        })
        fin()
      })
  })

  it('plugin init can add actions for future init actions to call', function (fin) {
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
            expect(err).to.not.exist()
            expect(result.success).true()
            seneca.success = true
            cb()
          })
        })
      })
      .ready(function () {
        expect(seneca.success).true()
        fin()
      })
  })

  it('plugin-init-error', function (fin) {
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

  it('plugin-extend-action-modifier', function (fin) {
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
          expect(err).not.exist()
          expect(out.x).equal(1)

          this.act('a:1,y:1', function (err, out) {
            expect(out).not.exist()
            expect(err).exist()
            expect(err.code).equal('act_invalid_msg')
            fin()
          })
        })
      })
  })

  it('plugin-extend-logger', function (fin) {
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
      .act('role:seneca,cmd:stats')
      .ready(fin)
  })

  it('plugins-from-options', function (fin) {
    var tmp = {}
    var si = Seneca({
      log: 'silent',
      debug: { undead: true },
      legacy: { transport: false },
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
        expect(Object.keys(this.plugins()).length).equal(4)
        expect(tmp).equal({ foo: 1, bar: 1, zed: 1 })
        fin()
      })
  })

  it('plugins-from-bad-options', function (fin) {
    var si = Seneca({
      debug: { undead: true },
      legacy: { transport: false },
    })
      .test(function (err) {
        // TODO: updated use-plugin should give error explaining that
        // no `define` function exists in plugin spec
        expect(err).exist()
        fin()
      })
      .quiet()
      .use({
        name: 'bad',
      })
  })

  it('plugins-options-precedence', function (fin) {
    var si = Seneca({
      legacy: false,
      debug: { undead: true },
      plugin: {
        foo: { a: 2, c: 2 },
        bar: { a: 2, c: 1 },
      },
    }).test(fin)

    function bar(opts) {
      expect(opts).equal({ a: 3, b: 1, c: 1, d: 1 })
    }
    bar.defaults = { a: 1, b: 1, c: 1, d: 1 }

    si.use(
      {
        name: 'foo',
        defaults: { a: 1, b: 1, c: 1, d: 1 },
        init: function (opts) {
          expect(opts).equal({ a: 2, b: 2, c: 3, d: 1 })
        },
      },
      { b: 2, c: 3, d: 1 },
    )
      .use(bar, { a: 3, d: 1 })

      .ready(function () {
        expect(this.options().plugin).equal({
          bar: { a: 3, c: 1, d: 1, b: 1, init$: true },
          foo: { a: 2, c: 3, b: 2, d: 1, init$: true },
        })
        fin()
      })
  })

  it('error-plugin-define', function (fin) {
    var s0 = Seneca({ legacy: false, log: 'silent', debug: { undead: true } })
    s0.error(function (err) {
      try {
        expect(err.code).equal('e0')
        expect(err.message).contains('a is 1')
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

  it('error-plugin-init', function (fin) {
    var s0 = Seneca({ log: 'silent', debug: { undead: true } })
    s0.error(function (err) {
      try {
        expect(err.code).equal('e0')
        expect(err.message).contains('a is 1')
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

  it('error-plugin-action', function (fin) {
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
        expect(err.code).equal('e0')
        expect(err.message).contains('a is 1')
        fin()
      } catch (e) {
        fin(e)
      }
    })
  })

  it('no-name', function (fin) {
    var s0 = Seneca({ legacy: { transport: false } }).test(fin)
    s0.use(function () {})
    s0.use('./stubs/plugin/no-name.js')
    s0.use(__dirname + '/stubs/plugin/no-name.js')
    s0.ready(function () {
      expect(Object.keys(s0.list_plugins()).length).equal(4)
      fin()
    })
  })

  it('seneca-prefix-wins', function (fin) {
    var s0 = Seneca({ legacy: { transport: false } }).test(fin)
    s0.use('joi')
    s0.ready(function () {
      expect(Object.keys(s0.list_plugins())[1]).equal('joi')
      fin()
    })
  })

  /*
  it('plugin-defaults-top-level-joi', function (fin) {
    var s0 = Seneca().test(fin)
    var Joi = s0.util.Joi

    // no Joi
    var p0 = {
      defaults: {
        a: 1,
      },
      define: function (options) {
        expect(options).equal({
          a: 1,
        })
      },
    }

    s0.use(Object.assign(p0, { name: 'p0n0' }))

    // top Joi
    var p1 = {
      defaults: Joi.object({
        a: Joi.number().default(2),
      }).default(),
      define: function (options) {
        expect(options).equal({
          a: 2,
        })
      },
    }

    // console.log('test p1n0', Joi.isSchema(p1.defaults))

    s0.use(Object.assign(p1, { name: 'p1n0' }))

    s0.ready(function () {
      var po = this.options().plugin

      expect(po.p0n0).equal({
        a: 1,
      })

      expect(po.p1n0).equal({
        a: 2,
      })

      fin()
    })
  })
  */

  it('plugin-order-task-args', function (fin) {
    var s0 = Seneca({ legacy: false }).test(fin)

    var args_task = s0.order.plugin.task.args
    expect(args_task.name).equals('args')

    var out = args_task.exec({ ctx: { args: [] } })
    expect(out).equal({ op: 'merge', out: { plugin: { args: [] } } })

    out = args_task.exec({ ctx: { args: ['foo'] } })
    expect(out).equal({ op: 'merge', out: { plugin: { args: ['foo'] } } })

    function a() {}
    out = args_task.exec({ ctx: { args: [a] } })
    expect(out).equal({ op: 'merge', out: { plugin: { args: [a] } } })

    var b = {}
    out = args_task.exec({ ctx: { args: [b] } })
    expect(out).equal({
      op: 'merge',
      out: { plugin: { args: [{ init: void 0 }] } },
    })

    var b = { define: a }
    out = args_task.exec({ ctx: { args: [b] } })
    expect(out).equal({
      op: 'merge',
      out: { plugin: { args: [{ init: a, define: a }] } },
    })

    fin()
  })

  it('plugin-defaults-function', function (fin) {
    var s0 = Seneca().test(fin)

    s0.use(
      {
        defaults: (opts) => {
          return {
            x: opts.Joi.number(),
            y: opts.Joi.string().default('Y'),
          }
        },
        define: function p0(options) {
          expect(options).equal({ x: 1, y: 'Y' })
        },
      },
      { x: 1 },
    )

    s0.ready(function () {
      expect(s0.options().plugin.p0).equal({ x: 1, y: 'Y' })
      fin()
    })
  })

  it('plugin-defaults-valid-plain', function (fin) {
    var s0 = Seneca({ legacy: false }).test(fin)

    s0.use(
      {
        defaults: {
          x: Number,
          y: 'Y',
        },
        define: function p0(options) {
          expect(options).equal({ x: 1, y: 'Y' })
        },
      },
      { x: 1 },
    )

    s0.ready(function () {
      expect(s0.options().plugin.p0).equal({ x: 1, y: 'Y', init$: true })
      fin()
    })
  })

  it('plugin-defaults-valid-prepared', function (fin) {
    var s0 = Seneca({ legacy: false }).test(fin)

    s0.use(
      {
        defaults: Seneca.valid({
          x: Number,
          y: 'Y',
        }),
        define: function p0(options) {
          expect(options).equal({ x: 1, y: 'Y' })
        },
      },
      { x: 1 },
    )

    s0.ready(function () {
      expect(s0.options().plugin.p0).equal({ x: 1, y: 'Y' })
      fin()
    })
  })

  it('delegate-plugin-access', function (fin) {
    function p1(opts) {
      expect(opts.foo).equal(1)
      expect(opts.ned).not.exist()
      expect(this.plugin.name).equal('p1')
      expect(this.context.qaz).equal(3)
      this.shared.bar = 2

      this.add('a:1', function a1(msg, reply) {
        expect(this.shared.bar).equal(2)
        expect(this.shared.bob).not.exist()
        expect(this.plugin.name).equal('p1')
        expect(this.plugin.options.foo).equal(1)
        expect(this.plugin.options.ned).not.exist()
        expect(this.context.qaz).equal(3)
        return reply({ x: 1 + msg.x })
      })

      this.add('b:1', function b1(msg, reply) {
        expect(this.shared.bar).equal(2)
        expect(this.plugin.name).equal('p1')
        expect(this.plugin.options.foo).equal(1)
        expect(this.plugin.options.ned).not.exist()
        expect(this.context.qaz).equal(3)
        this.act('a:1', { x: msg.x }, function (err, out) {
          return reply({ x: 2 * out.x })
        })
      })

      this.add('c:1', function c1(msg, reply) {
        expect(this.shared.bar).equal(2)
        expect(this.plugin.name).equal('p1')
        expect(this.plugin.options.foo).equal(1)
        expect(this.plugin.options.ned).not.exist()
        expect(this.context.qaz).equal(3)
        return reply({ x: 2 * msg.x })
      })

      this.add('c:1', function c1p(msg, reply) {
        expect(this.shared.bar).equal(2)
        expect(this.plugin.name).equal('p1')
        expect(this.plugin.options.foo).equal(1)
        expect(this.plugin.options.ned).not.exist()
        expect(this.context.qaz).equal(3)
        this.prior(msg, function (err, out) {
          return reply({ x: 5 * out.x })
        })
      })
    }

    // Should not overlap with p1
    function p2(opts) {
      expect(opts.foo).not.exist()
      expect(opts.ned).equal(4)
      expect(this.plugin.name).equal('p2')
      expect(this.context.qaz).equal(3)
      this.shared.bob = 5

      this.add('d:1', function d1(msg, reply) {
        expect(this.shared.bob).equal(5)
        expect(this.shared.bar).not.exist()
        expect(this.plugin.name).equal('p2')
        expect(this.plugin.options.ned).equal(4)
        expect(this.plugin.options.foo).not.exist()
        expect(this.context.qaz).equal(3)
        return reply({ x: 3 * msg.x })
      })

      // Calls other plugin
      this.add('e:1', function e1(msg, reply) {
        expect(this.shared.bob).equal(5)
        expect(this.shared.bar).not.exist()
        expect(this.plugin.name).equal('p2')
        expect(this.plugin.options.ned).equal(4)
        expect(this.plugin.options.foo).not.exist()
        expect(this.context.qaz).equal(3)

        this.act('a:1', { x: msg.x }, function (err, out) {
          // Back to p1 context
          expect(this.shared.bar).equal(2)
          expect(this.shared.bob).not.exist()
          expect(this.plugin.name).equal('p1')
          expect(this.plugin.options.foo).equal(1)
          expect(this.plugin.options.ned).not.exist()
          expect(this.context.qaz).equal(3)

          reply({ x: 0.5 + out.x })
        })
      })
    }

    const s0 = Seneca({ legacy: false }).test(fin)
    s0.context.qaz = 3
    s0.use(p1, { foo: 1 })
    s0.use(p2, { ned: 4 })

    s0.add('q:1', function q1(msg, reply) {
      expect(this.context.qaz).equal(3)
      expect(this.plugin.name).equal('root$')
      expect(this.plugin.options.foo).not.exist()
      expect(this.plugin.options.ned).not.exist()
      expect(this.shared.bob).not.exist()
      expect(this.shared.bar).not.exist()

      reply({ x: 0.1 + msg.x })
    })

    s0.add('w:1', function w1(msg, reply) {
      expect(this.context.qaz).equal(3)
      expect(this.plugin.name).equal('root$')
      expect(this.plugin.options.foo).not.exist()
      expect(this.plugin.options.ned).not.exist()
      expect(this.shared.bob).not.exist()
      expect(this.shared.bar).not.exist()

      this.act('e:1', { x: msg.x }, function (err, out) {
        reply({ x: 0.2 + out.x })
      })
    })

    p1_test()

    function p1_test() {
      s0.act({ a: 1, x: 2 }, function (err, out) {
        expect(out).equal({ x: 3 })

        // Callback has plugin action context
        expect(this.shared.bar).equal(2)
        expect(this.plugin.name).equal('p1')
        expect(this.plugin.options.foo).equal(1)
        expect(this.context.qaz).equal(3)

        s0.act({ b: 1, x: 2 }, function (err, out) {
          expect(out).equal({ x: 6 })

          expect(this.shared.bar).equal(2)
          expect(this.plugin.name).equal('p1')
          expect(this.plugin.options.foo).equal(1)
          expect(this.context.qaz).equal(3)

          s0.act({ c: 1, x: 2 }, function (err, out) {
            expect(out).equal({ x: 20 })

            // Callback has plugin action context
            expect(this.shared.bar).equal(2)
            expect(this.plugin.name).equal('p1')
            expect(this.plugin.options.foo).equal(1)
            expect(this.context.qaz).equal(3)

            p2_test()
          })
        })
      })
    }

    function p2_test() {
      s0.act({ d: 1, x: 2 }, function (err, out) {
        expect(out).equal({ x: 6 })

        expect(this.shared.bob).equal(5)
        expect(this.shared.bar).not.exist()
        expect(this.plugin.name).equal('p2')
        expect(this.plugin.options.ned).equal(4)
        expect(this.plugin.options.foo).not.exist()
        expect(this.context.qaz).equal(3)

        s0.act({ e: 1, x: 2 }, function (err, out) {
          expect(out).equal({ x: 3.5 })

          // p2 context!!!
          expect(this.shared.bob).equal(5)
          expect(this.shared.bar).not.exist()
          expect(this.plugin.name).equal('p2')
          expect(this.plugin.options.ned).equal(4)
          expect(this.plugin.options.foo).not.exist()
          expect(this.context.qaz).equal(3)

          root$_test()
        })
      })
    }

    function root$_test() {
      s0.act('q:1,x:2', function (err, out) {
        expect(out.x).equal(2.1)

        expect(this.context.qaz).equal(3)
        expect(this.plugin.name).equal('root$')
        expect(this.plugin.options.foo).not.exist()
        expect(this.plugin.options.ned).not.exist()
        expect(this.shared.bob).not.exist()
        expect(this.shared.bar).not.exist()

        s0.act('w:1,x:2', function (err, out) {
          expect(out.x).equal(3.7)

          expect(this.context.qaz).equal(3)
          expect(this.plugin.name).equal('root$')
          expect(this.plugin.options.foo).not.exist()
          expect(this.plugin.options.ned).not.exist()
          expect(this.shared.bob).not.exist()
          expect(this.shared.bar).not.exist()

          fin()
        })
      })
    }
  })

  it('plugin-options-no-defaults', function (fin) {
    const tmp = {}
    const p0 = (opts) => {
      Object.assign(tmp, opts)
    }
    Seneca({ legacy: false })
      .test()
      .use(p0, { x: 1 })
      .ready(function () {
        expect(tmp.x).equals(1)
        fin()
      })
  })

  it('plugin-options-valid-general-inactive', function (fin) {
    const tmp = {}
    const p0 = (opts) => {
      Object.assign(tmp, opts)
    }
    p0.defaults = { x: String }
    Seneca({ legacy: false, valid: { active: false } })
      .test()
      .use(p0, { x: 1 })
      .ready(function () {
        expect(tmp.x).equals(1)
        fin()
      })
  })

  it('plugin-options-valid-plugin-inactive', function (fin) {
    const tmp = {}
    const p0 = (opts) => {
      Object.assign(tmp, opts)
    }
    p0.defaults = { x: String }
    Seneca({ legacy: false, valid: { plugin: false } })
      .test()
      .use(p0, { x: 1 })
      .ready(function () {
        expect(tmp.x).equals(1)
        fin()
      })
  })

  it('plugin-options-gubu-legacy-handling', (fin) => {
    let olog = []
    let elog = []
    const s0 = Seneca({
      system: { exit: function noop() {} },
    })
      .test()
      .quiet()
      .error((err) => elog.push(err))
    const { Skip } = s0.valid

    const p0 = function (opts) {
      olog.push(opts)
    }
    p0.defaults = {
      a: 1,
    }

    const p1 = function (opts) {
      olog.push(opts)
    }
    p1.defaults = {
      c: 1,
      d: Skip(4),
    }

    const p2 = function (opts) {
      olog.push(opts)
    }
    p2.defaults = {
      e: 1,
      f: String,
    }

    s0.use(p0)
    s0.use(p0, { a: 2 })
    s0.use(p0, { b: 2 })
    s0.use(p0, { a: 2, b: 3 })

    s0.use(p1)

    s0.use(p2, { f: 'F' })
    s0.use(p2, { e: 2, f: 'F' })

    s0.use(p0, { a: 'A' })

    setTimeout(() => {
      // console.dir(olog,{depth:null})
      // console.log(elog)
      expect(olog).equal([
        { a: 1 },
        { a: 2 },
        { b: 2, a: 2 },
        { a: 2, b: 3 },
        { c: 1 },
        { f: 'F', e: 1 },
        { e: 2, f: 'F' },
      ])
      expect(elog[0].msg).equal(
        'seneca: Plugin p0: option value is not valid:' +
          ' "a" must be a number in options {a:A,b:3}',
      )
      fin()
    }, 111)
  })
})
