/* Copyright (c) 2013-2015 Richard Rodger, MIT License */
'use strict'

var assert = require('assert')

var _ = require('lodash')
var Lab = require('lab')

var seneca = require('..')

var lab = exports.lab = Lab.script()
var describe = lab.describe
var it = lab.it

describe('plugin', function () {
  it('bad', function (done) {
    var si = seneca({
      // this lets you change undead per test
      debug: {
        undead: true
      },
      log: 'silent'
    })

    try { si.use({foo: 1}) } catch (e) {
      assert.ok(e.seneca)
      assert.equal('plugin_no_name', e.code)
    }

    try { si.use('not-a-plugin-at-all-at-all') } catch (e) {
      assert.ok(e.seneca)
      assert.equal('plugin_not_found', e.code)
    }
    done()
  })

  it('plugin-error-def', function (done) {
    var si = seneca({
      debug: {
        undead: true
      },
      log: 'silent',
      errhandler: function (err) {
        assert.equal('plugin-def', err.message)
        done()
      }
    })

    si.use(function () {
      throw new Error('plugin-def')
    })
  })

  it('plugin-error-add', function (done) {
    var si = seneca({
      debug: {
        undead: true
      },
      log: 'silent',
      errhandler: function (err) {
        assert.equal('invalid_arguments', err.code)
        done()
      }
    })

    si.use(function () {
      this.add(new Error())
    })
  })

  it('plugin-error-act', function (done) {
    var cc = 0

    var si = seneca({
      debug: {
        undead: true
      },
      log: 'silent',
      errhandler: function (err) {
        assert.equal('seneca: Action foo:1 failed: act-cb.', err.message)
        cc++ && done()
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
    var si = seneca({
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
      assert.equal('plugin_required', err.code)
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
    var si = seneca({log: 'silent', errhandler: done})

    function echo (args, cb) {
      cb(null, _.extend({ t: Date.now() }, args))
    }

    var plugin_aaa = function (opts) {
      this.add({a: 1}, function (args, cb) {
        this.act('z:1', function (err, out) {
          assert.equal(err, null)
          cb(null, _.extend({a: 1}, out))
        })
      })
      return 'aaa'
    }

    si.add({z: 1}, echo)
    si.use(plugin_aaa)

    assert.ok(si.hasact({z: 1}))

    si.act({a: 1}, function (err, out) {
      assert.equal(err, null)
      assert.equal(1, out.a)
      assert.equal(1, out.z)
      assert.ok(out.t)
      assert.ok(si.hasact({a: 1}))

      si
        .fix({q: 1})
        .use(function (opts) {
          this.add({a: 1}, function (args, done) {
            this.act('z:1', function (err, out) {
              assert.equal(err, null)
              done(null, _.extend({a: 1, w: 1}, out))
            })
          })
          return 'bbb'
        })

      assert.ok(si.hasact({a: 1}))
      assert.ok(si.hasact({a: 1, q: 1}))

      si.act({a: 1}, function (err, out) {
        assert.equal(err, null)
        assert.equal(1, out.a)
        assert.equal(1, out.z)
        assert.ok(out.t)

        si.act({a: 1, q: 1}, function (err, out) {
          assert.equal(err, null)
          assert.equal(1, out.a)
          assert.equal(1, out.z)
          assert.equal(1, out.w)
          assert.ok(out.t)

          done()
        })
      })
    })
  })

  it('export', function (done) {
    var si = seneca({
      // this lets you change undead per test
      debug: {
        undead: true
      },
      log: 'silent'
    })

    si.use(function badexport () {})

    si.options({ errhandler: function (err) {
      assert.equal('export_not_found', err.code)
      done()
    }})

    si.export('not-an-export')
  })

  it('hasplugin', function (done) {
    var si = seneca({log: 'silent'})

    si.use(function foo () {})
    si.use({init: function () {}, name: 'bar', tag: 'aaa'})

    assert.ok(si.hasplugin('foo'))
    assert.ok(si.hasplugin('foo', ''))
    assert.ok(si.hasplugin('foo', '-'))

    assert.ok(!si.hasplugin('bar'))
    assert.ok(!si.hasplugin('bar', ''))
    assert.ok(!si.hasplugin('bar', '-'))
    assert.ok(!si.hasplugin('bar', 'bbb'))
    assert.ok(si.hasplugin('bar', 'aaa'))
    done()
  })
})
