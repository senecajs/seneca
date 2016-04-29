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
  it('bad', function (done) {
    var si = Seneca({
      log: 'silent'
    })

    try {
      si.use({ foo: 1 })
    }
    catch (e) {
      expect('no_name').to.equal(e.code)
    }

    try {
      si.use({ foo: 1 })
    }
    catch (e) {
      expect('no_name').to.equal(e.code)
    }

    try {
      si.use('not-a-plugin-at-all-at-all')
    }
    catch (e) {
      expect('not_found').to.equal(e.code)
    }
    si.close(done)
  })

  it('plugin-error-add', function (done) {
    var si = Seneca({
      log: 'silent'
    })

    si.use(function () {
      var e
      try {
        this.add(new Error())
      } catch (err) {
        e = err
      }
      expect(e).to.exists
      done()
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

  it.skip('handles plugin with action that timesout', function (done) {
    var seneca = Seneca({log: 'silent', timeout: 10, debug: {undead: true}})

    seneca.use(function foo () {
      this.add({ role: 'plugin', cmd: 'timeout' }, function () { })
    })

    seneca.act({ role: 'plugin', cmd: 'timeout' }, function (err) {
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


  it('dynamic-load-sequence', function (done) {
    var a = []
    Seneca({ log: 'test' })

      .use(function first () {
        this.add('init:first', function (m, d) {
          a.push(1)
          d()
        })
      })

      .ready(function () {
        this
          .use(function second () {
            this.add('init:second', function (m, d) {
              a.push(2)
              d()
            })
          })

          .ready(function () {
            this
              .use(function third () {
                this.add('init:third', function (m, d) {
                  a.push(3)
                  d()
                })
              })

              .ready(function () {
                expect(a).to.deep.equal([1, 2, 3])
                done()
              })
          })
      })
  })

  it('serial-load-sequence', function (done) {
    var log = []

    Seneca({ log: 'test' })
      .use(function foo () {
        log.push('a')
        this.add('init:foo', function (msg, done) {
          log.push('b')
          done()
        })
      })
      .use(function bar () {
        log.push('c')
        this.add('init:bar', function (msg, done) {
          log.push('d')
          done()
        })
      })
      .ready(function () {
        expect(log.join('')).to.equal('abcd')
        done()
      })
  })


  it('plugin options can be modified by plugins during load sequence', function (done) {
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
      .use(function foo (opts) {
        expect(opts.x).to.equal(1)
        this.add('init:foo', function (msg, done) {
          this.options({ plugin: {bar: {y: 3}} })
          done()
        })
      })
      .use(function bar (opts) {
        expect(opts.x).to.equal(2)
        expect(opts.y).to.equal(3)
        this.add('init:bar', function (msg, done) {
          done()
        })
      })
      .ready(function () {
        expect(seneca.options().plugin.foo).to.deep.equal({x: 1})
        expect(seneca.options().plugin.bar).to.deep.equal({x: 2, y: 3})
        done()
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

  it('will be able to pin with multiple plugins and local immediate setting', function (done) {
    var seneca = Seneca({ log: 'silent' })

    var pluginA = function () {
      this.add({ init: 'pluginA' }, function (msg, cb) {
        process.nextTick(cb)
      })

      this.add({ role: 'pluginA', cmd: 'msA1' }, function (msg, cb) {
        cb(null, { result: 'msA1' })
      })

      this.add({ role: 'pluginA', cmd: 'msA2' }, function (msg, cb) {
        cb(null, { result: 'msA2' })
      })

      return {
        name: 'pluginA'
      }
    }

    var pluginB = function () {
      this.add({ init: 'pluginB' }, function (msg, cb) {
        var api = this.pin({ role: 'pluginA', cmd: '*' }, { immediate: true })
        api.msA1({ msg: 'hi' }, function (err, message) {
          expect(err).to.not.exist()
          expect(message.result).to.equal('msA1')
        })
        cb()
      })

      this.add({ cmd: 'msB1' }, function (msg, cb) {
        cb(null, { result: 'msB1' })
      })

      return {
        name: 'pluginB'
      }
    }

    var pluginC = function () {
      this.add({ init: 'pluginC' }, function (msg, cb) {
        process.nextTick(cb)
      })

      this.add({ cmd: 'msC1' }, function (msg, cb) {
        cb(null, { result: 'msC1' })
      })

      return {
        name: 'pluginC'
      }
    }

    seneca.use(pluginA)
    seneca.use(pluginB)
    seneca.use(pluginC)
    seneca.ready(function () {
      done()
    })
  })

  it('will be able to pin with multiple plugins and seneca pin immediate setting', function (done) {
    var seneca = Seneca({ log: 'silent', pin: { immediate: true } })

    var pluginA = function () {
      this.add({ init: 'pluginA' }, function (msg, cb) {
        process.nextTick(cb)
      })

      this.add({ role: 'pluginA', cmd: 'msA1' }, function (msg, cb) {
        cb(null, { result: 'msA1' })
      })

      this.add({ role: 'pluginA', cmd: 'msA2' }, function (msg, cb) {
        cb(null, { result: 'msA2' })
      })

      return {
        name: 'pluginA'
      }
    }

    var pluginB = function () {
      this.add({ init: 'pluginB' }, function (msg, cb) {
        var api = this.pin({ role: 'pluginA', cmd: '*' })
        api.msA1({ msg: 'hi' }, function (err, message) {
          expect(err).to.not.exist()
          expect(message.result).to.equal('msA1')
        })
        cb()
      })

      this.add({ cmd: 'msB1' }, function (msg, cb) {
        cb(null, { result: 'msB1' })
      })

      return {
        name: 'pluginB'
      }
    }

    var pluginC = function () {
      this.add({ init: 'pluginC' }, function (msg, cb) {
        process.nextTick(cb)
      })

      this.add({ cmd: 'msC1' }, function (msg, cb) {
        cb(null, { result: 'msC1' })
      })

      return {
        name: 'pluginC'
      }
    }

    seneca.use(pluginA)
    seneca.use(pluginB)
    seneca.use(pluginC)
    seneca.ready(function () {
      done()
    })
  })

  it('pinning waits for ready by default', function (done) {
    var seneca = Seneca({ log: 'silent' })

    var pluginA = function () {
      this.add({ init: 'pluginA' }, function (msg, cb) {
        process.nextTick(cb)
      })

      this.add({ role: 'pluginA', cmd: 'msA1' }, function (msg, cb) {
        cb(null, { result: 'msA1' })
      })

      this.add({ role: 'pluginA', cmd: 'msA2' }, function (msg, cb) {
        cb(null, { result: 'msA2' })
      })

      return {
        name: 'pluginA'
      }
    }

    var pluginB = function () {
      this.add({ init: 'pluginB' }, function (msg, cb) {
        var api = this.pin({ role: 'pluginA', cmd: '*' })
        expect(api.msA1).to.not.exist()
        this.once('ping', function () {
          api = this.pin({ role: 'pluginA', cmd: '*' })
          expect(api.msA1).to.exist()
        })
        cb()
      })

      this.add({ cmd: 'msB1' }, function (msg, cb) {
        cb(null, { result: 'msB1' })
      })

      return {
        name: 'pluginB'
      }
    }

    seneca.use(pluginA)
    seneca.use(pluginB)
    seneca.ready(function () {
      done()
    })
  })
})
