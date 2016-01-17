/* Copyright (c) 2013-2015 Richard Rodger, MIT License */
'use strict'

var _ = require('lodash')
var Code = require('code')
var Lab = require('lab')
var Seneca = require('..')

var lab = exports.lab = Lab.script()
var describe = lab.describe
var it = lab.it
var expect = Code.expect

describe('plugin', function () {
  lab.beforeEach(function (done) {
    process.removeAllListeners('SIGHUP')
    process.removeAllListeners('SIGTERM')
    process.removeAllListeners('SIGINT')
    process.removeAllListeners('SIGBREAK')
    done()
  })

  it('bad', function (done) {
    var si = Seneca({
      // this lets you change undead per test
      debug: {
        undead: true
      },
      log: 'silent'
    })

    try {
      si.use({ foo: 1 })
    }
    catch (e) {
      expect(e.seneca).to.exist()
      expect('plugin_no_name').to.equal(e.code)
    }

    try {
      si.use({ foo: 1 })
    }
    catch (e) {
      expect(e.seneca).to.exist()
      expect('plugin_no_name').to.equal(e.code)
    }

    try {
      si.use('not-a-plugin-at-all-at-all')
    }
    catch (e) {
      expect(e.seneca).to.exist()
      expect('plugin_not_found').to.equal(e.code)
    }
    si.close(done)
  })

  it('plugin-error-def', function (done) {
    var si = Seneca({
      debug: {
        undead: true
      },
      log: 'silent',
      errhandler: function (err) {
        expect('plugin-def').to.equal(err.message)
        done()
      }
    })

    si.use(function error () {
      throw new Error('plugin-def')
    })
  })

  it('plugin-error-deprecated', function (done) {
    var si = Seneca({
      debug: {
        undead: true
      },
      log: 'silent',
      errhandler: function (err) {
        expect('unsupported_legacy_plugin').to.equal(err.code)
        done()
      }
    })

    si.use(function (options, register) {
      return { name: 'OldPlugin' }
    })
  })

  it('plugin-error-add', function (done) {
    var si = Seneca({
      debug: {
        undead: true
      },
      log: 'silent',
      errhandler: function (err) {
        expect('invalid_arguments').to.equal(err.code)
        done()
      }
    })

    si.use(function () {
      this.add(new Error())
    })
  })

  it('plugin-error-act', function (done) {
    var cc = 0

    var si = Seneca({
      debug: {
        undead: true
      },
      log: 'silent',
      errhandler: function (err) {
        expect('seneca: Action foo:1 failed: act-cb.').to.equal(err.message)
        cc++
        done()
      }
    })

    si.add('foo:1', function (args, cb) {
      cb(new Error('act-cb'))
    })

    si.use(function () {
      this.act('foo:1')
    })
  })

  it('depends', function (done) {
    var si = Seneca({
      // this lets you change undead per test
      debug: {
        undead: true
      },
      log: 'silent'
    })

    si.use(function () {
      return { name: 'aaa' }
    })

    si.use(function () {
      this.depends('bbb', ['aaa'])
      return { name: 'bbb' }
    })

    si.options({ errhandler: function (err) {
      expect('plugin_required').to.equal(err.code)
    }})

    si.use(function (opts) {
      this.depends('ccc', ['zzz'])
      return { name: 'ccc' }
    })

    si.use(function (opts) {
      return { name: 'ddd' }
    })

    si.use(function (opts) {
      this.depends('eee', 'aaa')
      return { name: 'eee' }
    })

    si.use(function (opts) {
      this.depends('fff', ['aaa', 'ddd'])
      return { name: 'fff' }
    })

    si.use(function (opts) {
      this.depends('ggg', 'aaa', 'ddd')
      return { name: 'ggg' }
    })

    si.use(function (opts) {
      this.depends('hhh', 'aaa', 'zzz')
      return { name: 'hhh' }
    })
    done()
  })

  it('fix', function (done) {
    var si = Seneca({log: 'silent', errhandler: done})

    function echo (args, cb) {
      cb(null, _.extend({ t: Date.now() }, args))
    }

    var plugin_aaa = function (opts) {
      this.add({a: 1}, function (args, cb) {
        this.act('z:1', function (err, out) {
          expect(err).to.not.exist()
          cb(null, _.extend({ a: 1 }, out))
        })
      })
      return 'aaa'
    }

    si.add({z: 1}, echo)
    si.use(plugin_aaa)

    expect(si.hasact({ z: 1 })).to.be.true()

    si.ready(function () {
      si.act({a: 1}, function (err, out) {
        expect(err).to.not.exist()
        expect(1).to.equal(out.a)
        expect(1).to.equal(out.z)
        expect(out.t).to.exist()
        expect(si.hasact({ a: 1 })).to.be.true()

        si
          .fix({q: 1})
          .use(function (opts) {
            this.add({a: 1}, function (args, done) {
              this.act('z:1', function (err, out) {
                expect(err).to.not.exist()
                done(null, _.extend({a: 1, w: 1}, out))
              })
            })
            return 'bbb'
          })

        expect(si.hasact({ a: 1 })).to.be.true()
        expect(si.hasact({ a: 1, q: 1 })).to.be.true()

        si.act({a: 1}, function (err, out) {
          expect(err).to.not.exist()
          expect(1).to.equal(out.a)
          expect(1).to.equal(out.z)
          expect(out.t).to.exist()

          si.act({a: 1, q: 1}, function (err, out) {
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
  })

  it('export', function (done) {
    var si = Seneca({
      // this lets you change undead per test
      debug: {
        undead: true
      },
      log: 'silent'
    })

    si.use(function badexport () {})

    si.options({ errhandler: function (err) {
      expect('export_not_found').to.equal(err.code)
      done()
    }})

    si.export('not-an-export')
  })

  it('hasplugin', function (done) {
    var si = Seneca({log: 'silent'})

    si.use(function foo () {})
    si.use({init: function () {}, name: 'bar', tag: 'aaa'})

    si.ready(function () {
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

  it('handles plugin with action that timesout', function (done) {
    var seneca = Seneca({ log: 'silent', timeout: 10 })

    seneca.use(function foo () {
      this.add({ role: 'plugin', cmd: 'timeout' }, function () { })
    })

    seneca.act({ role: 'plugin', cmd: 'timeout' }, function (err) {
      expect(err).to.exist()
      seneca.close(done)
    })
  })

  it('handles plugin action that throws an error', function (done) {
    var seneca = Seneca({ log: 'silent' })

    seneca.use(function foo () {
      this.add({ role: 'plugin', cmd: 'throw' }, function () {
        throw new Error()
      })
    })

    seneca.act({ role: 'plugin', cmd: 'throw' }, function (err) {
      expect(err).to.exist()
      seneca.close(done)
    })
  })

  it('calling act from init actor is deprecated', function (done) {
    var seneca = Seneca({ log: 'silent' })

    seneca.add({ role: 'metrics', subscriptions: 'create' }, function (data, callback) {
      callback()
    })

    seneca.add({ init: 'msgstats-metrics' }, function (msg, callback) {
      seneca.act({ role: 'metrics', subscriptions: 'create' }, function (err) {
        expect(err).to.not.exist()
        done()
      })
    })

    seneca.act({ init: 'msgstats-metrics' })
  })

  it('plugin actions receive errors in callback function', function (done) {
    var seneca = Seneca({ log: 'silent' })
    seneca.fixedargs['fatal$'] = false

    seneca.use(function service () {
      this.add({ role: 'plugin', cmd: 'throw' }, function (args, next) {
        expect(args.blah).to.equal('blah')
        next(new Error('from action'))
      })
    })
    seneca.use(function client () {
      var self = this

      this.ready(function () {
        self.act({ role: 'plugin', cmd: 'throw', blah: 'blah' }, function (err, result) {
          expect(err).to.exist()
          expect(err.msg).to.contain('from action')
          done()
        })
      })
    })
  })

  it('plugin options can be modified by plugins during init sequence', function (done) {
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

    seneca.use(function foo (options) {
      expect(options.x).to.equal(1)
      this.add('init:foo', function (msg, cb) {
        this.options({ plugin: { foo: { y: 3 } } })
        cb()
      })
    })
    .use(function bar (options) {
      this.add('init:bar', function (msg, cb) {
        expect(seneca.options().plugin.foo).to.deep.equal({ x: 1, y: 3 })
        this.options({ plugin: { bar: { y: 4 } } })
        cb()
      })
    })
    .use(function foobar (options) {
      this.add('init:foobar', function (msg, cb) {
        this.options({ plugin: { foobar: { foo: seneca.options().plugin.foo, bar: seneca.options().plugin.bar } } })
        cb()
      })
    })
    .ready(function () {
      expect(seneca.options().plugin.foo).to.deep.equal({ x: 1, y: 3 })
      expect(seneca.options().plugin.bar).to.deep.equal({ x: 2, y: 4 })
      expect(seneca.options().plugin.foobar).to.deep.equal({ foo: { x: 1, y: 3 }, bar: { x: 2, y: 4 } })
      done()
    })
  })

  it('plugin init can add actions for future init actions to call', function (done) {
    var seneca = Seneca({ log: 'silent' })

    seneca.use(function foo (options) {
      this.add('init:foo', function (msg, cb) {
        this.add({ role: 'test', cmd: 'foo' }, function (args, cb) {
          cb(null, { success: true })
        })
        cb()
      })
    })
    .use(function bar (options) {
      this.add('init:bar', function (msg, cb) {
        this.act({ role: 'test', cmd: 'foo' }, function (err, result) {
          expect(err).to.not.exist()
          expect(result.success).to.be.true()
          seneca.success = true
          cb()
        })
      })
    })
    .ready(function () {
      expect(seneca.success).to.be.true()
      done()
    })
  })

  it('plugin options can be modified by plugins during load sequence', function (done) {
    var seneca = Seneca({
      log: 'silent',
      plugin: {
        foo: {
          x: 1
        },
        bar: {
          x: 2
        }
      }
    })


    seneca.use(function foo (opts) {
      expect(opts.x).to.equal(1)
      this.add('init:foo', function (msg, cb) {
        this.options({ plugin: {bar: {y: 3}} })
        cb()
      })
    })
    .use(function bar (opts) {
      expect(opts.x).to.equal(2)
      expect(opts.y).to.equal(3)
      this.add('init:bar', function (msg, cb) {
        cb()
      })
    })
    .ready(function () {
      expect(seneca.options().plugin.foo).to.deep.equal({x: 1})
      expect(seneca.options().plugin.bar).to.deep.equal({x: 2, y: 3})
      done()
    })
  })
})
