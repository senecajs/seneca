/* Copyright © 2013-2018 Richard Rodger and other contributors, MIT License. */
'use strict'

var _ = require('lodash')
var Code = require('code')
var Lab = require('@hapi/lab')

var lab = (exports.lab = Lab.script())
var describe = lab.describe
var expect = Code.expect

var Shared = require('./shared')
var it = Shared.make_it(lab)

var Seneca = require('..')

describe('plugin', function() {
  // Validates that @seneca/ prefix can be dropped.
  it('standard-test-plugin', function(fin) {
    Seneca()
      .test(fin)
      .use('test-plugin')
      .ready(function() {
        this.act('role:test,cmd:foo,size:3', function(err, out) {
          expect(out.foo).equal(6)
          fin()
        })
      })
  })

  it('standard-test-plugin-full-ignore', function(fin) {
    Seneca()
      .test(fin)
      .ignore_plugin('@seneca/test-plugin')
      .use('@seneca/test-plugin')
      .ready(function() {
        expect(this.has_plugin('@seneca/test-plugin')).false()
        this.ignore_plugin('@seneca/test-plugin', false)
          .use('@seneca/test-plugin')
          .ready(function() {
            this.act('role:test,cmd:foo,size:3', function(err, out) {
              expect(out.foo).equal(6)
              fin()
            })
          })
      })
  })

  it('plugin-ignore-via-options', function(fin) {
    Seneca({ plugins: { foo: false } })
      .test(fin)
      .use(function foo() {})
      .ready(function() {
        expect(this.has_plugin('foo')).false()
        fin()
      })
  })

  it('plugin-delegate-init', function(fin) {
    Seneca()
      .test(fin)
      .use(
        function p0(opts) {
          var z

          this.add('a:1', function(msg, reply) {
            reply({ x: msg.x, y: opts.y, z: z })
          })

          this.init(function(done) {
            z = 4
            done()
          })
        },
        { y: 3 }
      )
      .ready(function() {
        this.act('a:1,x:2', function(err, out) {
          expect(out).equal({ x: 2, y: 3, z: 4 })
          fin()
        })
      })
  })

  it('load-defaults', function(fin) {
    Seneca()
      .test(fin)

      // NOTE: the assertions are in the plugin
      .use('./stubs/bar-plugin', {
        b: 2
      })
      .ready(fin)
  })

  it('load-relative-to-root', function(fin) {
    var subfolder = require('./stubs/plugin/subfolder')
    subfolder(function(out) {
      expect(out).equal('relative-to-root')
      fin()
    })
  })

  it('good-default-options', function(fin) {
    var init_p1 = function(opts) {
      expect(opts).equal({ c: 1, d: 2 })
    }
    init_p1.defaults = {
      c: 1
    }

    Seneca()
      .test(fin)

      .use(
        {
          name: 'p0',
          init: function(opts) {
            expect(opts).equal({ a: 1, b: 2 })
          },
          defaults: { a: 1 }
        },
        {
          b: 2
        }
      )

      .use(
        {
          name: 'p1',
          init: init_p1
        },
        {
          d: 2
        }
      )

      .ready(fin)
  })

  it('bad-default-options', function(fin) {
    Seneca({ debug: { undead: true } })
      .test(function(err) {
        expect(err.code).equals('invalid_plugin_option')
        fin()
      })
      .quiet()
      .use(
        {
          name: 'p0',
          init: function() {
            Code.fail()
          },
          defaults: {
            a: Seneca.util.Joi.string()
          }
        },
        {
          a: 1,
          b: 2
        }
      )
  })

  // REMOVE in 4.x
  it('legacy-options', function(fin) {
    var si = Seneca({ log: 'silent' })

    si.use('options', { a: 1 })
    expect(si.export('options').a).equal(1)

    si.use('options', require('./stubs/plugin/options.file.js'))
    expect(si.export('options').b).equal(2)

    fin()
  })

  it('should return "no errors created." when passing test false', function(fin) {
    Seneca({ tag: 's0', log: 'silent' })
      .use('./stubs/plugin-error/tmp.js')
      .listen({ type: 'tcp', port: '30010', pin: 'role:tmp' })
      .ready(function() {
        var s0 = this

        var seneca = Seneca({ tag: 'c0' }).test(fin)
        seneca.use('./stubs/plugin-error/tmpApi')
        seneca.client({ type: 'tcp', port: '30010', pin: 'role:tmp' })

        seneca.act({ role: 'api', cmd: 'tmpQuery', test: 'false' }, function(
          err,
          res
        ) {
          expect(err).to.not.exist()
          expect(res.message).to.contain('no errors created.')
          s0.close(seneca.close.bind(seneca, fin))
        })
      })
  })

  it('should return "error caught!" when passing test true', function(fin) {
    Seneca({ tag: 's0', log: 'silent' })
      .use('./stubs/plugin-error/tmp.js')
      .listen({ type: 'tcp', port: '30010', pin: 'role:tmp' })
      .ready(function() {
        var s0 = this
        var seneca = Seneca({ tag: 'c1', log: 'silent' })
        seneca.use('./stubs/plugin-error/tmpApi')
        seneca.client({ type: 'tcp', port: '30010', pin: 'role:tmp' })

        seneca.act({ role: 'api', cmd: 'tmpQuery', test: 'true' }, function(
          err,
          res
        ) {
          expect(err).to.not.exist()
          expect(res.message).to.contain('error caught!')
          s0.close(seneca.close.bind(seneca, fin))
        })
      })
  })

  it('works with exportmap', function(fin) {
    var seneca = Seneca.test(fin)

    seneca.options({
      debug: {
        undead: true
      }
    })

    seneca.use(function() {
      return {
        name: 'foo',
        exportmap: {
          bar: function(num) {
            expect(num).to.equal(42)
            fin()
          }
        }
      }
    })

    seneca.ready(function() {
      expect(typeof seneca.export('foo/bar')).to.equal('function')
      seneca.export('foo/bar')(42)
    })
  })

  it('bad', function(fin) {
    var si = Seneca({
      // this lets you change undead per test
      debug: {
        undead: true
      },
      log: 'silent'
    })

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

  it('plugin-error-def', function(fin) {
    var si = Seneca({
      debug: {
        undead: true
      },
      log: 'silent',
      errhandler: function(err) {
        expect('plugin_define').equal(err.code)
        expect(err.details.message).contains('plugin-def')
        fin()
      }
    })

    si.use(function() {
      throw new Error('plugin-def')
    })
  })

  it('plugin-error-deprecated', function(fin) {
    var si = Seneca({
      debug: {
        undead: true
      },
      log: 'silent',
      errhandler: function(err) {
        expect('unsupported_legacy_plugin').to.equal(err.code)
        fin()
      }
    })

    si.use(function(options, register) {
      return { name: 'OldPlugin' }
    })
  })

  it('plugin-error-add', function(fin) {
    Seneca({ log: 'silent', debug: { undead: true } })
      .error(function(err) {
        expect('invalid_arguments').to.equal(err.orig.code)
        fin()
      })
      .use(function foo() {
        this.add(new Error())
      })
  })

  it('plugin-error-act', function(fin) {
    var si = Seneca({
      debug: {
        undead: true
      },
      log: 'silent',
      errhandler: function(err) {
        expect('seneca: Action foo:1 failed: act-cb.').to.equal(err.message)
        fin()
      }
    })

    si.add('foo:1', function(args, cb) {
      cb(new Error('act-cb'))
    })

    si.use(function() {
      this.act('foo:1')
    })
  })

  it('depends', function(fin) {
    var si = Seneca({
      // this lets you change undead per test
      debug: {
        undead: true
      },
      log: 'silent'
    })

    si.use(function() {
      return { name: 'aaa' }
    })

    si.use(function() {
      this.depends('bbb', ['aaa'])
      return { name: 'bbb' }
    })

    si.options({
      errhandler: function(err) {
        expect('plugin_required').to.equal(err.code)
      }
    })

    si.use(function() {
      this.depends('ccc', ['zzz'])
      return { name: 'ccc' }
    })

    si.use(function() {
      return { name: 'ddd' }
    })

    si.use(function() {
      this.depends('eee', 'aaa')
      return { name: 'eee' }
    })

    si.use(function() {
      this.depends('fff', ['aaa', 'ddd'])
      return { name: 'fff' }
    })

    si.use(function() {
      this.depends('ggg', 'aaa', 'ddd')
      return { name: 'ggg' }
    })

    si.use(function() {
      this.depends('hhh', 'aaa', 'zzz')
      return { name: 'hhh' }
    })
    fin()
  })

  it('plugin-fix', function(fin) {
    var si = Seneca.test(fin)

    function echo(args, cb) {
      cb(null, _.extend({ t: Date.now() }, args))
    }

    var plugin_aaa = function aaa() {
      this.add({ a: 1 }, function(args, cb) {
        this.act('z:1', function(err, out) {
          expect(err).to.not.exist()
          cb(null, _.extend({ a: 1 }, out))
        })
      })
    }

    si.add({ z: 1 }, echo)
    si.use(plugin_aaa)

    expect(si.hasact({ z: 1 })).true()

    si.act({ a: 1 }, function(err, out) {
      expect(err).to.not.exist()
      expect(1).to.equal(out.a)
      expect(1).to.equal(out.z)
      expect(out.t).to.exist()
      expect(si.hasact({ a: 1 })).true()

      si.fix({ q: 1 }).use(function bbb() {
        this.add({ a: 1 }, function(args, fin) {
          this.act('z:1', function(err, out) {
            expect(err).to.not.exist()
            fin(null, _.extend({ a: 1, w: 1 }, out))
          })
        })
      })

      expect(si.hasact({ a: 1 })).true()
      expect(si.hasact({ a: 1, q: 1 })).true()

      si.act({ a: 1 }, function(err, out) {
        expect(err).to.not.exist()
        expect(1).to.equal(out.a)
        expect(1).to.equal(out.z)
        expect(out.t).to.exist()

        si.act({ a: 1, q: 1 }, function(err, out) {
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

  it('export', function(fin) {
    var si = Seneca({
      // this lets you change undead per test
      debug: {
        undead: true
      },
      strict: {
        exports: true
      },
      log: 'silent'
    })

    si.use(function badexport() {})

    si.options({
      errhandler: function(err) {
        expect('export_not_found').to.equal(err.code)
        fin()
      }
    })

    si.export('not-an-export')
  })

  it('handles plugin with action that timesout', function(fin) {
    Seneca({ log: 'silent', timeout: 10, debug: { undead: true } })
      .use(function foo() {
        this.add({ role: 'plugin', cmd: 'timeout' }, function() {})
      })
      .act({ role: 'plugin', cmd: 'timeout' }, function(err) {
        expect(err).to.exist()
        this.close(fin)
      })
  })

  it('handles plugin action that throws an error', function(fin) {
    var seneca = Seneca({ log: 'silent' })

    seneca.use(function foo() {
      this.add({ role: 'plugin', cmd: 'throw' }, function() {
        throw new Error()
      })
    })

    seneca.act({ role: 'plugin', cmd: 'throw' }, function(err) {
      expect(err).to.exist()
      seneca.close(fin)
    })
  })

  it('calling act from init actor is deprecated', function(fin) {
    var seneca = Seneca.test(fin)

    seneca.add({ role: 'metrics', subscriptions: 'create' }, function(
      data,
      callback
    ) {
      callback()
    })

    seneca.add({ init: 'msgstats-metrics' }, function() {
      seneca.act({ role: 'metrics', subscriptions: 'create' }, function(err) {
        expect(err).to.not.exist()
        fin()
      })
    })

    seneca.act({ init: 'msgstats-metrics' })
  })

  it('plugin actions receive errors in callback function', function(fin) {
    var seneca = Seneca({ log: 'silent' })
    seneca.fixedargs['fatal$'] = false

    seneca.use(function service() {
      this.add({ role: 'plugin', cmd: 'throw' }, function(args, next) {
        expect(args.blah).to.equal('blah')
        next(new Error('from action'))
      })
    })
    seneca.use(function client() {
      var self = this

      this.ready(function() {
        self.act({ role: 'plugin', cmd: 'throw', blah: 'blah' }, function(err) {
          expect(err).to.exist()
          expect(err.msg).to.contain('from action')
          fin()
        })
      })
    })
  })

  it('dynamic-load-sequence', function(fin) {
    var a = []
    var seneca = Seneca.test(fin)

    seneca.options({ debug: { undead: true } })

    seneca
      .use(function first() {
        this.add('init:first', function(m, d) {
          a.push(1)
          d()
        })
      })
      .ready(function() {
        this.use(function second() {
          this.add('init:second', function(m, d) {
            a.push(2)
            d()
          })
        }).ready(function() {
          this.use(function third() {
            this.add('init:third', function(m, d) {
              a.push(3)
              d()
            })
          }).ready(function() {
            expect(a).to.equal([1, 2, 3])
            fin()
          })
        })
      })
  })

  it('serial-load-sequence', function(fin) {
    var log = []

    Seneca.test(fin, 'silent')
      .use(function foo() {
        log.push('a')
        this.add('init:foo', function(msg, reply) {
          log.push('b')
          reply()
        })
      })
      .use(function bar() {
        log.push('c')
        this.add('init:bar', function(msg, reply) {
          log.push('d')
          reply()
        })
      })
      .ready(function() {
        expect(log.join('')).to.equal('abcd')
        fin()
      })
  })

  it('plugin options can be modified by plugins during load sequence', function(fin) {
    var seneca = Seneca({
      log: 'test',
      plugin: {
        foo: {
          x: 1
        },
        bar: {
          x: 2
        }
      }
    })

    seneca
      .use(function foo(opts) {
        expect(opts.x).to.equal(1)
        this.add('init:foo', function(msg, reply) {
          this.options({ plugin: { bar: { y: 3 } } })
          reply()
        })
      })
      .use(function bar(opts) {
        expect(opts.x).to.equal(2)
        expect(opts.y).to.equal(3)
        this.add('init:bar', function(msg, reply) {
          reply()
        })
      })
      .ready(function() {
        expect(seneca.options().plugin.foo).to.equal({ x: 1 })
        expect(seneca.options().plugin.bar).to.equal({ x: 2, y: 3 })
        fin()
      })
  })

  it('plugin options can be modified by plugins during init sequence', function(fin) {
    var seneca = Seneca({
      log: 'silent',
      plugin: {
        foo: {
          x: 1
        },
        bar: {
          x: 2
        },
        foobar: {}
      }
    })

    seneca
      .use(function foo(options) {
        expect(options.x).to.equal(1)
        this.add('init:foo', function(msg, cb) {
          this.options({ plugin: { foo: { y: 3 } } })
          cb()
        })
      })
      .use(function bar() {
        this.add('init:bar', function(msg, cb) {
          expect(seneca.options().plugin.foo).to.equal({ x: 1, y: 3 })
          this.options({ plugin: { bar: { y: 4 } } })
          cb()
        })
      })
      .use(function foobar() {
        this.add('init:foobar', function(msg, cb) {
          this.options({
            plugin: {
              foobar: {
                foo: seneca.options().plugin.foo,
                bar: seneca.options().plugin.bar
              }
            }
          })
          cb()
        })
      })
      .ready(function() {
        expect(seneca.options().plugin.foo).to.equal({ x: 1, y: 3 })
        expect(seneca.options().plugin.bar).to.equal({ x: 2, y: 4 })
        expect(seneca.options().plugin.foobar).to.equal({
          foo: { x: 1, y: 3 },
          bar: { x: 2, y: 4 }
        })
        fin()
      })
  })

  it('plugin init can add actions for future init actions to call', function(fin) {
    var seneca = Seneca.test(fin, 'silent')

    seneca
      .use(function foo() {
        this.add('init:foo', function(msg, cb) {
          this.add({ role: 'test', cmd: 'foo' }, function(args, cb) {
            cb(null, { success: true })
          })
          cb()
        })
      })
      .use(function bar() {
        this.add('init:bar', function(msg, cb) {
          this.act({ role: 'test', cmd: 'foo' }, function(err, result) {
            expect(err).to.not.exist()
            expect(result.success).true()
            seneca.success = true
            cb()
          })
        })
      })
      .ready(function() {
        expect(seneca.success).true()
        fin()
      })
  })

  it('plugin-init-error', function(fin) {
    var si = Seneca({ debug: { undead: true } })
      .error(function(err) {
        fin()
      })
      .use(function foo() {
        this.add('init:foo', function(config, reply) {
          reply(new Error('foo'))
        })
      })
  })

  it('plugin-extend-action-modifier', function(fin) {
    var si = Seneca({ log: 'silent' })
      .use(function foo() {
        return {
          extend: {
            action_modifier: function(actdef) {
              actdef.validate = function(msg, reply) {
                if (!msg.x) reply(new Error('no x!'))
                else reply(null, actdef)
              }
            }
          }
        }
      })
      .ready(function() {
        this.add('a:1', function(msg, reply) {
          reply({ x: msg.x })
        }).act('a:1,x:1', function(err, out) {
          expect(err).not.exist()
          expect(out.x).equal(1)

          this.act('a:1,y:1', function(err, out) {
            expect(out).not.exist()
            expect(err).exist()
            expect(err.code).equal('act_invalid_msg')
            fin()
          })
        })
      })
  })

  it('plugin-extend-logger', function(fin) {
    var si = Seneca({ log: 'silent' })
      .use(function foo() {
        return {
          extend: {
            logger: function(seneca, data) {
              console.log(data)
            }
          }
        }
      })
      .act('role:seneca,cmd:stats')
      .ready(fin)
  })

  it('plugins-from-options', function(fin) {
    var si = Seneca({
      log: 'silent',
      legacy: { transport: false },
      plugins: {
        foo: function() {},
        bar: { name: 'bar', init: function() {} }
      }
    }).ready(function() {
      expect(Object.keys(this.plugins()).length).equal(2)
      fin()
    })
  })

  it('plugins-options-precedence', function(fin) {
    var si = Seneca({
      log: 'silent',
      legacy: { transport: false },
      plugin: {
        foo: { a: 2, c: 2 },
        bar: { a: 2, c: 1 }
      }
    })

    function bar(opts) {
      expect(opts).equal({ a: 3, b: 1, c: 1, d: 1 })
    }
    bar.defaults = { a: 1, b: 1 }

    si.use(
      {
        name: 'foo',
        defaults: { a: 1, b: 1 },
        init: function(opts) {
          expect(opts).equal({ a: 2, b: 2, c: 3, d: 1 })
        }
      },
      { b: 2, c: 3, d: 1 }
    )
      .use(bar, { a: 3, d: 1 })

      .ready(function() {
        expect(this.options().plugin).equal({
          bar: { a: 3, c: 1, d: 1, b: 1 },
          foo: { a: 2, c: 3, b: 2, d: 1 }
        })
        fin()
      })
  })

  it('error-plugin-define', function(fin) {
    var s0 = Seneca({ log: 'silent', debug: { undead: true } })
    s0.error(function(err) {
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
      e0: 'a is <%=a%>'
    }

    s0.use(p0)
  })

  it('error-plugin-init', function(fin) {
    var s0 = Seneca({ log: 'silent', debug: { undead: true } })
    s0.error(function(err) {
      try {
        expect(err.code).equal('e0')
        expect(err.message).contains('a is 1')
        fin()
      } catch (e) {
        fin(e)
      }
    })

    var p0 = function p0() {
      this.init(function() {
        this.fail('e0', { a: 1 })
      })
    }
    p0.errors = {
      e0: 'a is <%=a%>'
    }

    s0.use(p0)
  })

  it('error-plugin-action', function(fin) {
    var s0 = Seneca({ log: 'silent', debug: { undead: true } })

    var p0 = function p0() {
      this.add('a:1', function(msg, reply) {
        this.fail('e0', { a: 1 })
      })
    }
    p0.errors = {
      e0: 'a is <%=a%>'
    }

    s0.use(p0).act('a:1', function(err) {
      try {
        expect(err.code).equal('e0')
        expect(err.message).contains('a is 1')
        fin()
      } catch (e) {
        fin(e)
      }
    })
  })

  it('no-name', function(fin) {
    var s0 = Seneca({ legacy: { transport: false } }).test(fin)
    s0.use(function() {})
    s0.use('./stubs/plugin/no-name.js')
    s0.use(__dirname + '/stubs/plugin/no-name.js')
    s0.ready(function() {
      expect(Object.keys(s0.list_plugins()).length).equal(3)
      fin()
    })
  })

  it('seneca-prefix-wins', function(fin) {
    var s0 = Seneca({ legacy: { transport: false } }).test(fin)
    s0.use('joi')
    s0.ready(function() {
      expect(Object.keys(s0.list_plugins())[0]).equal('joi')
      fin()
    })
  })
})
