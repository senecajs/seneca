/* Copyright (c) 2013-2015 Richard Rodger, MIT License */
'use strict'

var _ = require('lodash')
var Code = require('code')
var Lab = require('lab')
var Seneca = require('..')

var lab = (exports.lab = Lab.script())
var describe = lab.describe
var it = lab.it
var expect = Code.expect

describe('plugin', function() {
  lab.beforeEach(function(done) {
    process.removeAllListeners('SIGHUP')
    process.removeAllListeners('SIGTERM')
    process.removeAllListeners('SIGINT')
    process.removeAllListeners('SIGBREAK')
    done()
  })

  it('works with exportmap', function(done) {
    var seneca = Seneca.test(done)

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
            done()
          }
        }
      }
    })

    seneca.ready(function() {
      expect(typeof seneca.export('foo/bar')).to.equal('function')
      seneca.export('foo/bar')(42)
    })
  })

  it('bad', function(done) {
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
    si.close(done)
  })

  it('plugin-error-def', function(done) {
    var si = Seneca({
      debug: {
        undead: true
      },
      log: 'silent',
      errhandler: function(err) {
        expect('plugin-def').to.equal(err.details.message)
        done()
      }
    })

    si.use(function() {
      throw new Error('plugin-def')
    })
  })

  it('plugin-error-deprecated', function(done) {
    /* eslint no-unused-vars: 0 */

    var si = Seneca({
      debug: {
        undead: true
      },
      log: 'silent',
      errhandler: function(err) {
        expect('unsupported_legacy_plugin').to.equal(err.code)
        done()
      }
    })

    si.use(function(options, register) {
      return { name: 'OldPlugin' }
    })
  })

  it('plugin-error-add', function(done) {
    Seneca({ log: 'silent', debug: { undead: true } })
      .error(function(err) {
        expect('invalid_arguments').to.equal(err.orig.code)
        done()
      })
      .use(function foo() {
        this.add(new Error())
      })
  })

  it('plugin-error-act', function(done) {
    var si = Seneca({
      debug: {
        undead: true
      },
      log: 'silent',
      errhandler: function(err) {
        expect('seneca: Action foo:1 failed: act-cb.').to.equal(err.message)
        done()
      }
    })

    si.add('foo:1', function(args, cb) {
      cb(new Error('act-cb'))
    })

    si.use(function() {
      this.act('foo:1')
    })
  })

  it('depends', function(done) {
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
    done()
  })

  it('plugin-fix', function(done) {
    var si = Seneca.test(done)

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

    expect(si.hasact({ z: 1 })).to.be.true()

    si.act({ a: 1 }, function(err, out) {
      expect(err).to.not.exist()
      expect(1).to.equal(out.a)
      expect(1).to.equal(out.z)
      expect(out.t).to.exist()
      expect(si.hasact({ a: 1 })).to.be.true()

      si.fix({ q: 1 }).use(function bbb() {
        this.add({ a: 1 }, function(args, done) {
          this.act('z:1', function(err, out) {
            expect(err).to.not.exist()
            done(null, _.extend({ a: 1, w: 1 }, out))
          })
        })
      })

      expect(si.hasact({ a: 1 })).to.be.true()
      expect(si.hasact({ a: 1, q: 1 })).to.be.true()

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

          si.close(done)
        })
      })
    })
  })

  it('export', function(done) {
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
        done()
      }
    })

    si.export('not-an-export')
  })

  it('hasplugin', function(done) {
    var si = Seneca.test(done)

    si.use(function foo() {})
    si.use({ init: function() {}, name: 'bar', tag: 'aaa' })

    si.ready(function() {
      expect(si.hasplugin('foo')).to.be.true()
      expect(si.hasplugin('foo', '')).to.be.true()
      expect(si.hasplugin('foo', '-')).to.be.true()

      expect(si.hasplugin('bar')).to.be.false()
      expect(si.hasplugin('bar', '')).to.be.false()
      expect(si.hasplugin('bar', '-')).to.be.false()
      expect(si.hasplugin('bar', 'bbb')).to.be.false()
      expect(si.hasplugin('bar', 'aaa')).to.be.true()

      si.close(done)
    })
  })

  it('handles plugin with action that timesout', function(done) {
    Seneca({ log: 'silent', timeout: 10, debug: { undead: true } })
      .use(function foo() {
        this.add({ role: 'plugin', cmd: 'timeout' }, function() {})
      })
      .act({ role: 'plugin', cmd: 'timeout' }, function(err) {
        expect(err).to.exist()
        this.close(done)
      })
  })

  it('handles plugin action that throws an error', function(done) {
    var seneca = Seneca({ log: 'silent' })

    seneca.use(function foo() {
      this.add({ role: 'plugin', cmd: 'throw' }, function() {
        throw new Error()
      })
    })

    seneca.act({ role: 'plugin', cmd: 'throw' }, function(err) {
      expect(err).to.exist()
      seneca.close(done)
    })
  })

  it('calling act from init actor is deprecated', function(done) {
    var seneca = Seneca.test(done)

    seneca.add({ role: 'metrics', subscriptions: 'create' }, function(
      data,
      callback
    ) {
      callback()
    })

    seneca.add({ init: 'msgstats-metrics' }, function() {
      seneca.act({ role: 'metrics', subscriptions: 'create' }, function(err) {
        expect(err).to.not.exist()
        done()
      })
    })

    seneca.act({ init: 'msgstats-metrics' })
  })

  it('plugin actions receive errors in callback function', function(done) {
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
          done()
        })
      })
    })
  })

  it('dynamic-load-sequence', function(done) {
    var a = []
    var seneca = Seneca.test(done)

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
            done()
          })
        })
      })
  })

  it('serial-load-sequence', function(done) {
    var log = []

    Seneca.test(done, 'silent')
      .use(function foo() {
        log.push('a')
        this.add('init:foo', function(msg, done) {
          log.push('b')
          done()
        })
      })
      .use(function bar() {
        log.push('c')
        this.add('init:bar', function(msg, done) {
          log.push('d')
          done()
        })
      })
      .ready(function() {
        expect(log.join('')).to.equal('abcd')
        done()
      })
  })

  it('plugin options can be modified by plugins during load sequence', function(
    done
  ) {
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
        this.add('init:foo', function(msg, done) {
          this.options({ plugin: { bar: { y: 3 } } })
          done()
        })
      })
      .use(function bar(opts) {
        expect(opts.x).to.equal(2)
        expect(opts.y).to.equal(3)
        this.add('init:bar', function(msg, done) {
          done()
        })
      })
      .ready(function() {
        expect(seneca.options().plugin.foo).to.equal({ x: 1 })
        expect(seneca.options().plugin.bar).to.equal({ x: 2, y: 3 })
        done()
      })
  })

  it('plugin options can be modified by plugins during init sequence', function(
    done
  ) {
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
        done()
      })
  })

  it('plugin init can add actions for future init actions to call', function(
    done
  ) {
    var seneca = Seneca.test(done, 'silent')

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
            expect(result.success).to.be.true()
            seneca.success = true
            cb()
          })
        })
      })
      .ready(function() {
        expect(seneca.success).to.be.true()
        done()
      })
  })

  it('plugin-init-error', function(fin) {
    var si = Seneca({ debug: { undead: true } })
      .error(function(err) {
        fin()
      })
      .use(function foo() {
        this.add('init:foo', function(config, done) {
          done(new Error('foo'))
        })
      })
  })

  it('plugin-extend-action-modifier', function(fin) {
    var si = Seneca({ log: 'silent' })
      .use(function foo() {
        return {
          extend: {
            action_modifier: function(actdef) {
              actdef.validate = function(msg, done) {
                if (!msg.x) done(new Error('no x!'))
                else done(null, actdef)
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
})
