/* Copyright (c) 2010-2015 Richard Rodger, MIT License */
'use strict'

var Assert = require('assert')
var Util = require('util')
var Async = require('async')
var Code = require('code')
var Gex = require('gex')
var _ = require('lodash')
var Joi = require('joi')
var Lab = require('lab')
var Package = require('../package.json')
var Seneca = require('..')

var lab = exports.lab = Lab.script()
var describe = lab.describe
var it = lab.it
var expect = Code.expect
var assert = Assert

var testopts = { log: 'silent' }

describe('seneca', function () {
  lab.beforeEach(function (done) {
    process.removeAllListeners('SIGHUP')
    process.removeAllListeners('SIGTERM')
    process.removeAllListeners('SIGINT')
    process.removeAllListeners('SIGBREAK')
    done()
  })
  it('version', function (done) {
    var start = Date.now()
    var si = Seneca(testopts)
    expect(si.version).to.equal(Package.version)
    var end = Date.now()

    // ensure startup time does not degenerate
    expect(end - start).to.be.below(333)

    expect(si).to.equal(si.seneca())
    done()
  })

  it('quick', function (done) {
    var si = Seneca(testopts)
    si.use(function quickplugin (opts) {
      si.add({ a: 1 }, function (args, cb) {
        cb(null, { b: 2 })
      })
    })
    si.ready(function () {
      si.act({ a: 1 }, function (err, out) {
        assert.ok(!err)
        assert.equal(out.b, 2)

        si.act('a:1', function (err, out) {
          assert.ok(!err)
          assert.equal(out.b, 2)
          done()
        })
      })
    })
  })

  it('doesn\'t require ready event when simple add act', function (done) {
    var si = Seneca(testopts)
    si.add({ a: 1 }, function (args, cb) {
      cb(null, { b: 2 })
    })
    si.act({ a: 1 }, function (err, out) {
      assert.ok(!err)
      assert.equal(out.b, 2)

      si.act('a:1', function (err, out) {
        assert.ok(!err)
        assert.equal(out.b, 2)
        done()
      })
    })
  })

  it('require-use-safetynet', function (done) {
    require('..')(testopts)
      .use('echo')
      .act('role:echo,foo:1', function (err, out) {
        assert.ok(!err)
        assert.equal(1, out.foo)
        done()
      })
  })

  it('ready-complex', function (done) {
    var mark = { ec: 0 }

    setTimeout(function () {
      assert.ok(mark.r0, 'r0')
      assert.ok(mark.r1, 'r1')
      assert.ok(mark.p1, 'p1')
      assert.ok(mark.p2, 'p2')
      assert.equal(mark.ec, 1, 'ec')

      done()
    }, 100)

    var si = Seneca(testopts)

    si.use(function p1 (opts) {
      si.add({ init: 'p1' }, function (args, cb) {
        setTimeout(function () {
          mark.p1 = true
          cb()
        }, 10)
      })
    })

    si.on('ready', function () {
      mark.r0 = true
      mark.ec++
    })

    si.use(function p2 (opts) {
      si.add({ init: 'p2' }, function (args, cb) {
        setTimeout(function () {
          mark.p2 = true
          cb()
        }, 10)
      })
    })

    si.ready(function () {
      mark.r1 = true
    })
  })

  it('ready-func', function (done) {
    var si = Seneca(testopts)

    si.ready(function () {
      done()
    })
  })

  it('ready-event', function (done) {
    var si = Seneca(testopts)

    si.on('ready', function () {
      done()
    })
  })

  it('ready-both', function (done) {
    var si = Seneca(testopts)
    var tmp = {}

    si.on('ready', function () {
      tmp.a = 1
      complete()
    })
    si.ready(function () {
      tmp.b = 1
      complete()
    })

    function complete () {
      if (tmp.a && tmp.b) {
        done()
      }
    }
  })

  it('happy-error', function (done) {
    Seneca({log: 'silent'})
      .add('happy_error:1', function (args, done) { done(new Error('happy-error')) })
      .act('happy_error:1', function (err) {
        assert.ok(err)
        assert.equal('seneca: Action happy_error:1 failed: happy-error.', err.message)
        done()
      })
  })

  it('errhandler', function (done) {
    var tmp = {}

    function grab_all (err) {
      tmp.grab = err
      return true
    }

    function pass_on (err) {
      tmp.pass = err
    }

    var si = Seneca({log: 'silent'})
    si.add('cmd:grab', function (args, done) {
      done(new Error('grab'))
    })
    si.add('cmd:pass', function (args, done) {
      done(new Error('pass'))
    })

    si.options({errhandler: grab_all})

    si.act('cmd:grab', function () {
      assert.fail()
    })

    setTimeout(function () {
      assert.ok(tmp.grab)

      si.options({errhandler: pass_on})

      si.act('cmd:pass', function (err) {
        assert.ok(err)
        assert.ok(tmp.pass)
        done()
      })
    }, 100)
  })

  it('register', function (done) {
    var si = Seneca(testopts)

    var initfn = function () {}
    var emptycb = function () {}

    try {
      si.register()
    }
    catch (e) {
      assert.equal('no_input$', e.parambulator.code)
    }

    try {
      si.register({})
    }
    catch (e) {
      assert.equal('name', e.parambulator.property)
      assert.equal('required$', e.parambulator.code)
    }

    try {
      si.register({name: 1, init: initfn}, emptycb)
    }
    catch (e) {
      assert.equal('name', e.parambulator.property)
      assert.equal('string$', e.parambulator.code)
    }

    try {
      si.register({name: 'a', init: 'b'}, emptycb)
    }
    catch (e) {
      assert.equal('init', e.parambulator.property)
      assert.equal('function$', e.parambulator.code)
    }
    done()
  })

  it('seneca-cluster plugin can be disabled', function (done) {
    var si = Seneca({ log: 'silent', default_plugins: { cluster: false } }).error(done)
    si.options({debug: {fragile: true}})

    var a1 = 0

    si.add({op: 'foo'}, function (args, cb) {
      a1 = args.a1
      cb(null, {s: '+' + a1})
    })

    si.act({op: 'foo', a1: 100}, function (err, out) {
      assert.equal(err, null)
      assert.equal('+100', out.s)
      assert.equal(100, a1)

      done()
    })
  })

  it('seneca-mem-store plugin can be disabled', function (done) {
    var options = { log: 'silent', default_plugins: { } }
    options.default_plugins['mem-store'] = false
    var si = Seneca(options).error(done)
    si.options({debug: {fragile: true}})

    var a1 = 0

    si.add({op: 'foo'}, function (args, cb) {
      a1 = args.a1
      cb(null, {s: '+' + a1})
    })

    si.act({op: 'foo', a1: 100}, function (err, out) {
      assert.equal(err, null)
      assert.equal('+100', out.s)
      assert.equal(100, a1)

      done()
    })
  })

  it('seneca-repl plugin can be disabled', function (done) {
    var si = Seneca({ log: 'silent', default_plugins: { repl: false } }).error(done)
    si.options({debug: {fragile: true}})

    var a1 = 0

    si.add({op: 'foo'}, function (args, cb) {
      a1 = args.a1
      cb(null, {s: '+' + a1})
    })

    si.act({op: 'foo', a1: 100}, function (err, out) {
      assert.equal(err, null)
      assert.equal('+100', out.s)
      assert.equal(100, a1)

      done()
    })
  })

  it('seneca-transport plugin can be disabled', function (done) {
    var si = Seneca({ log: 'silent', default_plugins: { transport: false } }).error(done)
    si.options({debug: {fragile: true}})

    var a1 = 0

    si.add({op: 'foo'}, function (args, cb) {
      a1 = args.a1
      cb(null, {s: '+' + a1})
    })

    si.act({op: 'foo', a1: 100}, function (err, out) {
      assert.equal(err, null)
      assert.equal('+100', out.s)
      assert.equal(100, a1)

      done()
    })
  })

  it('seneca-web plugin can be disabled', function (done) {
    var si = Seneca({ log: 'silent', default_plugins: { web: false } }).error(done)
    si.options({debug: {fragile: true}})

    var a1 = 0

    si.add({op: 'foo'}, function (args, cb) {
      a1 = args.a1
      cb(null, {s: '+' + a1})
    })

    si.act({op: 'foo', a1: 100}, function (err, out) {
      assert.equal(err, null)
      assert.equal('+100', out.s)
      assert.equal(100, a1)

      done()
    })
  })

  it('use() can be invoked without seneca instance', function (done) {
    var si = Seneca.use('transport')
    expect(si).to.exist()
    expect(si instanceof Error).to.be.false()
    done()
  })

  it('action-basic', function (done) {
    var si = Seneca(testopts).error(done)
    si.options({debug: {fragile: true}})

    var a1 = 0

    si.add({op: 'foo'}, function (args, cb) {
      a1 = args.a1
      cb(null, {s: '+' + a1})
    })

    si.act({op: 'foo', a1: 100}, function (err, out) {
      assert.equal(err, null)
      assert.equal('+100', out.s)
      assert.equal(100, a1)

      si.act({op: 'foo', a1: 200}, function (err, out) {
        assert.equal(err, null)
        assert.equal('+200', out.s)
        assert.equal(200, a1)

        done()
      })
    })
  })

  it('passes seneca instance on callback function property', function (done) {
    var si = Seneca({ log: 'silent' }).error(done)
    si.add({ cmd: 'foo' }, function (args, reply) {
      reply(null, { did: reply.seneca.did })
    })
    si.act({ cmd: 'foo' }, function (err, result) {
      expect(err).to.not.exist()
      expect(result.did).to.equal(this.did)
      done()
    })
  })

  it('action-act-invalid-args', function (done) {
    var si = Seneca(testopts).error(done)
    si.options({debug: {fragile: true}})

    si.ready(function () {
      try {
        si.act({op: 'bad', a1: 100}, function () {
          assert.fail()
        })
        assert.fail()
      }
      catch (e) {
        assert.equal(e.code, 'act_not_found')

        try {
        // default is not an object
          si.act({op: 'bad', a1: 100, default$: 'qaz'}, function () {
            assert.fail()
          })
          assert.fail()
        }
        catch (e) {
          assert.equal(e.code, 'act_default_bad')
          try {
            si.act()
            assert.fail()
          }
          catch (e) {
            assert.equal(e.code, 'act_not_found')
            try {
              si.act(function () {
                assert.fail()
              })
              assert.fail()
            }
            catch (e) {
              assert.equal(e.code, 'act_not_found')
              done()
            }
          }
        }
      }
    })
  })

  it('action-default', function (done) {
    var si = Seneca(testopts).error(done)

    si.act({op: 'bad', a1: 100, default$: {a: 1}}, function (err, out) {
      assert.equal(err, null)
      assert.deepEqual({a: 1}, out)

      si.add('a:0', function (m, r) {
        this.prior(m, r)
      })

      si.act('a:0,default$:{y:2}', function (e, o) {
        assert.equal(null, e)
        assert.deepEqual({y: 2}, o)

        si.add('a:0', function (m, r) {
          this.prior(m, r)
        })

        si.act('a:0,default$:{y:3}', function (e, o) {
          assert.equal(null, e)
          assert.deepEqual({y: 3}, o)

          done()
        })
      })
    })
  })

  it('action-override', function (done) {
    var si = Seneca(testopts).error(done)

    function foo (args, done) {
      done(null, { a: args.a, s: this.toString(), foo: args.meta$ })
    }

    function bar (args, done) {
      var pargs = { a: args.a, s: args.s }
      this.prior(pargs, function (e, o) {
        o.b = 2
        o.bar = args.meta$
        done(e, o)
      })
    }

    function zed (args, done) {
      args.z = 3
      this.prior(args, function (e, o) {
        o.z = 3
        o.zed = args.meta$
        done(e, o)
      })
    }

    si.ready(function () {
      si.add({op: 'foo'}, foo)
      si.act('op:foo,a:1', function (e, o) {
        assert.ok(Gex('1~Seneca/*' + '/*').on('' + o.a + '~' + o.s))
        assert.ok(o.foo.entry)

        si.add({op: 'foo'}, bar)
        si.act('op:foo,a:1', function (e, o) {
          assert.ok(Gex('1~2~Seneca/*' + '/*').on('' + o.a + '~' + o.b + '~' + o.s))
          assert.ok(o.bar.entry)
          assert.ok(!o.foo.entry)

          si.add({op: 'foo'}, zed)
          si.act('op:foo,a:1', function (e, o) {
            assert.ok(Gex('1~2~3~Seneca/*' + '/*').on(
              '' + o.a + '~' + o.b + '~' + o.z + '~' + o.s))
            assert.ok(o.zed.entry)
            assert.ok(!o.bar.entry)
            assert.ok(!o.foo.entry)

            done()
          })
        })
      })
    })
  })

  it('action-extend', function (done) {
    var si = Seneca(testopts).error(done)

    si.options({strict: {add: false}})

    function foo (args, next) {
      next(null, { a: args.a, s: this.toString(), foo: args.meta$ })
    }

    function bar (args, next) {
      var pargs = { a: args.a, s: args.s }
      this.prior(pargs, function (e, o) {
        o.b = 2
        o.bar = args.meta$
        next(e, o)
      })
    }

    function zed (args, next) {
      args.z = 3
      this.prior(args, function (e, o) {
        o.z = 3
        o.zed = args.meta$
        next(e, o)
      })
    }

    si.ready(function () {
      si.add({op: 'foo'}, foo)
      si.add({op: 'foo', a: 1}, bar)
      si.add({op: 'foo', a: 1, b: 2}, zed)

      si.act('op:foo,a:1', function (err, o) {
        assert.ok(!err)
        assert.ok(Gex('1~Seneca/*' + '/*').on('' + o.a + '~' + o.s))
        assert.ok(!o.foo.entry)
        assert.ok(o.bar.entry)

        si.act('op:foo,a:1,b:2', function (err, o) {
          assert.ok(!err)
          assert.ok(Gex('1~2~Seneca/*' + '/*').on('' + o.a + '~' + o.b + '~' + o.s))
          assert.ok(!o.foo.entry)
          assert.ok(!o.bar.entry)
          assert.ok(o.zed.entry)
          done()
        })
      })
    })
  })

  it('gating', function (done) {
    var si = Seneca({log: 'silent', errhandler: done})
    var count = 0
    var called = ''

    si.add('foo:a', function (args, done) {
      count++
      count += args.x
      done(null, {count: count})
    })

    si
      .gate()
      .act('foo:a,x:10', function (err, out) {
        assert.equal(err, null)
        assert.equal(11, count)
        called += 'A'
      })
      .act('foo:a,x:100', function (err, out) {
        assert.equal(err, null)
        assert.equal(112, count)
        called += 'B'
      })
      .act('foo:a,x:1000', function (err, out) {
        assert.equal(err, null)
        assert.equal(1113, count)
        called += 'C'
      })
      .ready(function () {
        setTimeout(function () {
          assert.equal('ABC', called)
          assert.equal(1113, count)
          done()
        }, 50)
      })
  })

  it('act_if', function (done) {
    var si = Seneca({log: 'silent'})

    si.add({op: 'foo'}, function (args, next) {
      next(null, 'foo' + args.bar)
    })

    si.act_if(true, {op: 'foo', bar: '1'}, function (err, out) {
      assert.equal(err, null)
      assert.equal('foo1', out)
    })

    si.act_if(false, {op: 'foo', bar: '2'}, function () {
      assert.fail()
    })

    si.act_if(true, 'op:foo,bar:3', function (err, out) {
      assert.equal(err, null)
      assert.equal('foo3', out)
    })

    try {
      si.act_if({op: 'foo', bar: '2'}, function () {
        assert.fail()
      })
    }
    catch (e) {
      assert.ok(e.message.match(/norma:/))
    }

    si = Seneca(testopts)
      .add('a:1', function (args) { this.good({b: args.a + 1}) })
      .add('a:2', function (args) { this.good({b: args.a + 2}) })

    si.act_if(true, 'a:1', function (err, out) {
      assert.ok(!err)
      assert.equal(2, out.b)

      si.act_if(false, 'a:2', function () {
        assert.fail()
      })

      process.nextTick(done)
    })
  })

  it('plugins', function (done) {
    var si = Seneca({plugins: ['echo'], log: 'silent'})

    si.act({role: 'echo', baz: 'bax'}, function (err, out) {
      assert.equal(err, null)
      assert.equal('' + {baz: 'bax'}, '' + out)
    })

    si = Seneca({plugins: ['basic'], log: 'silent'})

    si.act({role: 'util', cmd: 'quickcode'}, function (err, code) {
      assert.equal(err, null)
      assert.equal(8, code.length)
      assert.equal(/[ABCDEFGHIJKLMNOPQRSTUVWXYZ]/.exec(code), null)
    })

    function Mock1 () {
      var self = this
      self.name = 'mock1'
      self.plugin = function () {
        return self
      }
      self.init = function (options) {
        this.add({ role: self.name, cmd: 'foo' }, function (args, cb) {
          cb(null, 'foo:' + args.foo)
        })
      }
    }

    si = Seneca(testopts)
    si.register(new Mock1(), function (err) {
      assert.equal(err, null)

      si.act({role: 'mock1', cmd: 'foo', foo: 1}, function (err, out) {
        assert.equal(err, null)
        assert.equal('foo:1', out)
      })
    })

    si = Seneca(testopts)
    var mock1a = new Mock1()
    mock1a.name = 'mock1a'
    si.register(mock1a, function (err) {
      assert.equal(err, null)

      si.act({role: 'mock1a', cmd: 'foo', foo: 1}, function (err, out) {
        assert.equal(err, null)
        assert.equal('foo:1', out)
      })
    })

    function Mock2 () {
      var self = this
      self.name = 'mock2'
      self.plugin = function () {
        return self
      }
      self.init = function (options) {
        this.add({role: 'mock1', cmd: 'foo'}, function (args, cb) {
          this.prior(args, function (err, out) {
            assert.equal(err, null)
            cb(null, 'bar:' + out)
          })
        })
      }
    }

    si = Seneca(testopts)
    si.register(new Mock1(), function (err) {
      assert.equal(err, null)

      si.register(new Mock2(), function (err) {
        assert.equal(err, null)

        si.act({role: 'mock1', cmd: 'foo', foo: 2}, function (err, out) {
          assert.equal(err, null)
          assert.equal('bar:foo:2', out)
        })
      })
    })

    si = Seneca({log: 'silent'})
    si.use('echo')
    si.act({role: 'echo', cmd: 'foo', bar: 1}, function (err, out) {
      assert.equal(err, null)
      assert.ok(out.cmd === 'foo')
      assert.ok(out.bar === 1)
      done()
    })
  })

  it('pin', function (done) {
    var si = Seneca({log: 'silent'})

    var log = []

    si.add({p1: 'v1', p2: 'v2a'}, function (args, cb) {
      log.push('a' + args.p3)
      cb(null, {p3: args.p3})
    })

    si.add({p1: 'v1', p2: 'v2b'}, function (args, cb) {
      log.push('b' + args.p3)
      cb(null, {p3: args.p3})
    })

    var api = si.pin({p1: 'v1', p2: '*'})

    api.v2a({p3: 'A'}, function (err, r) {
      assert.equal(err, null)
      assert.equal(r.p3, 'A')
    })
    api.v2b({p3: 'B'}, function (err, r) {
      assert.equal(err, null)
      assert.equal(r.p3, 'B')
    })

    var acts = si.pinact({p1: 'v1', p2: '*'})
    assert.equal("[ { p1: 'v1', p2: 'v2a' }, { p1: 'v1', p2: 'v2b' } ]",
      Util.inspect(acts))

    done()
  })

  it('pin-star', function (done) {
    var si = Seneca(testopts)

    si.add('a:1,b:x', function () {})
    si.add('a:1,c:y', function () {})

    var pin_b = si.pin('a:1,b:*')
    assert.ok(_.isFunction(pin_b.x))
    assert.equal(pin_b.y, null)

    var pin_c = si.pin('a:1,c:*')
    assert.ok(_.isFunction(pin_c.y))
    assert.equal(pin_c.x, null)

    assert.deepEqual([ { a: '1', b: 'x' }, { a: '1', c: 'y' } ],
      si.findpins('a:1'))

    assert.deepEqual([ { a: '1', b: 'x' } ],
      si.findpins('a:1,b:*'))

    assert.deepEqual([ { a: '1', c: 'y' } ],
      si.findpins('a:1,c:*'))

    done()
  })

  it('fire-and-forget', function (done) {
    var si = Seneca({log: 'silent'})
    si.add({a: 1}, function (args, cb) { cb(null, args.a + 1) })
    si.add({a: 1, b: 2}, function (args, cb) { cb(null, args.a + args.b) })

    si.act({a: 1})
    si.act({a: 1, b: 2})
    si.act('a:1')
    si.act('a:1, b:2')
    si.act('a:1', {b: 2})
    si.act('b:2', {a: 1})
    si.act('', {a: 1})
    si.act('', {a: 1, b: 2})
    done()
  })

  it('strargs', function (done) {
    var si = Seneca({ log: 'silent', strict: { result: false } })
    si.add({a: 1, b: 2}, function (args, cb) {
      cb(null, (args.c || -1) + parseInt(args.b, 10) + parseInt(args.a, 10))
    })

    Async.series([
      function (next) {
        si.act({a: 1, b: 2, c: 3}, function (err, out) {
          assert.ok(!err)
          assert.equal(6, out)
          next()
        })
      },
      function (next) {
        si.act('a:1,b:2,c:3', function (err, out) {
          assert.ok(!err)
          assert.equal(6, out)
          next()
        })
      },
      function (next) {
        si.act('a:1,b:2', function (err, out) {
          assert.ok(!err)
          assert.equal(2, out)
          next()
        })
      },
      function (next) {
        try {
          si.add('a:,b:2', function (args, cb) {
            cb()
          })
        }
        catch (e) {
          assert.equal(e.code, 'add_string_pattern_syntax')
          next()
        }
      },
      function (next) {
        try {
          si.act('a:,b:2', {c: 3}, function () {
            assert.fail()
          })
        }
        catch (e) {
          assert.equal(e.code, 'add_string_pattern_syntax')
          next()
        }
      },
      function (next) {
        try {
          si.add('a:1,b:2', 'bad-arg', function (args, cb) {
            cb()
          })
        }
        catch (e) {
          assert.ok(e.message.match(/norma:/))
          next()
        }
      },
      function (next) {
        try {
          si.add(123, function (args, cb) { cb() })
        }
        catch (e) {
          assert.ok(e.message.match(/norma:/))
          next()
        }
      }
    ], done)
  })

  it('moreobjargs', function (done) {
    var p0 = {c: 6}

    Seneca({log: 'silent', errhandler: done})

      .add({a: 1}, {b: 2},
        function (args, done) { done(null, {c: args.c}) })

      .add({A: 1}, {B: {integer$: true}},
        function (args, done) { done(null, {C: args.C}) })

      .add('x:1', {x: 2, y: 3}, {x: 4, y: 5, z: 6},
        function (args, done) { done(null, {k: args.k}) })

      .gate()

      .act('a:1,b:2,c:3', function (err, out) {
        assert.equal(err, null)
        assert.equal(3, out.c)
      })

      .act({a: 1, b: 2}, {c: 4}, function (err, out) {
        assert.equal(err, null)
        assert.equal(4, out.c)
      })

      .act('a:1', {b: 2}, {c: 5}, function (err, out) {
        assert.equal(err, null)
        assert.equal(5, out.c)
      })

      .act({a: 1, b: 2}, p0, function (err, out) {
        assert.equal(err, null)
        assert.equal(6, out.c)
        assert.equal('{ c: 6 }', Util.inspect(p0))
      })

      .act('A:1,B:2,C:33', function (err, out) {
        assert.equal(err, null)
        assert.equal(33, out.C)
      })

      .act('x:1,y:3,z:6,k:7', function (err, out) {
        assert.equal(err, null)
        assert.equal(7, out.k)
      })

      .ready(function () {
        // using root as ready seneca is fatal$
        this.root.options({errhandler: function (err) {
          if (err.code !== 'act_invalid_args') {
            return done(err)
          }
          done()
        }})

        this.root.act('A:1,B:true,C:44')
      })
  })

  it('string-add', function (done) {
    var addFunction = function (args, done) {
      done(null, {v: (args.c || -1) + parseInt(args.b, 10) + parseInt(args.a, 10)})
    }

    var checkFunction = function (err, out) {
      assert.equal(err, null)
      assert.equal(6, out.v)
    }

    Seneca(testopts)
      .error(done)

      .start()

      .add('i:0,a:1,b:2', addFunction)
      .act('i:0,a:1,b:2,c:3', checkFunction)

      .add('i:1,a:1', {b: 2}, addFunction)
      .act('i:1,a:1,b:2,c:3', checkFunction)

      .add('i:2,a:1', {b: 2, c: {required$: true}}, addFunction)
      .act('i:2,a:1,b:2,c:3', checkFunction)

      .end(done)
  })

  it('fix', function (done) {
    var si = Seneca(testopts)

    function ab (args, cb) {
      cb(null, {r: '' + args.a + (args.b || '-') + (args.c || '-') + args.z})
    }

    si
      .fix('a:1')
      .add('b:2', ab)
      .add('c:3', ab)
      .act('b:2,z:8',
        function (err, out) { assert.equal(err, null); assert.equal('12-8', out.r) })
      .act('c:3,z:9',
        function (err, out) { assert.equal(err, null); assert.equal('1-39', out.r) })

    si
      .act('a:1,b:2,z:8',
        function (err, out) { assert.equal(err, null); assert.equal('12-8', out.r) })
      .act('a:1,c:3,z:9',
        function (err, out) { assert.equal(err, null); assert.equal('1-39', out.r) })

    done()
  })

  it('parambulator', function (done) {
    var si = Seneca({log: 'silent'})

    si.add({a: 1, b: 'q', c: {required$: true, string$: true}},
      function (args, cb) { cb(null, {}) })

    function foo (args, cb) { cb(null, {}) }
    foo.validate = {
      b: { required$: true }
    }
    si.add('a:2', foo)

    si.act({a: 1, b: 'q', c: 'c'}, function (err) { err && done(err) })
    si.act({a: 2, b: 'q'}, function (err) { err && done(err) })

    si.act({a: 1, b: 'q', c: 1}, function (err) {
      assert.equal('act_invalid_args', err.code)

      si.act({a: 1, b: 'q'}, function (err) {
        assert.equal('act_invalid_args', err.code)

        si.act({a: 2}, function (err) {
          assert.equal('act_invalid_args', err.code)

          done()
        })
      })
    })
  })

  it('joi', function (done) {
    var si = Seneca({ log: 'silent' })

    var schema = Joi.object().keys({
      cmd: Joi.string(),
      c: Joi.object().required()
    })

    si.add({ cmd: 'joi' }, function (args, cb) {
      cb(null, {})
    }, { parambulator: schema })

    si.act({ cmd: 'joi', c: 'c' }, function (err) {
      assert(err.code === 'act_invalid_args')
    })

    si.act({ cmd: 'joi' }, function (err) {
      assert(err.code === 'act_invalid_args')
    })

    si.act({ cmd: 'joi', c: { test: true } }, function (err) {
      assert(!err)
      done()
    })
  })

  it('act-param', function (done) {
    Seneca({log: 'silent'})

      .add({a: 1, b: {integer$: true}}, function (args, cb) {
        if (!_.isNumber(args.b)) return assert.fail()
        cb(null, {a: 1 + args.b})
      })

      .act({a: 1, b: 1}, function (err, out) {
        try {
          assert.ok(!err)
          assert.equal(2, out.a)
        }
        catch (e) {
          return done(e)
        }

        this.act({a: 1, b: 'b'}, function (err, out) {
          try {
            assert.equal('act_invalid_args', err.code)
            assert.equal('seneca: Action a:1 has invalid arguments; ' +
              "The property 'b', with current value: 'b', " +
              'must be a integer (parent: top level).; arguments ' +
              "were: { a: 1, b: 'b' }.", err.message)
          }
          catch (e) {
            return done(e)
          }

          try {
            this.add({a: 1, b: {notatypeatallatall$: true}}, function (args, cb) {
              assert.fail()
            })
          }
          catch (e) {
            try {
              assert.ok(e.message.match(/Parambulator: Unknown rule/))
            }
            catch (e) {
              return done(e)
            }

            done()
          }
        })
      })
  })

  it('sub', function (done) {
    var si = Seneca(testopts, { errhandler: done })

    var tmp = {a: 0, as1: 0, as2: 0, as1_in: 0, as1_out: 0, all: 0}

    si.sub({}, function (args) {
      tmp.all++
    })

    si.add({a: 1}, function (args, done) {
      tmp.a = tmp.a + 1
      done(null, {b: 1, y: 1})
    })

    si.act({a: 1}, function (err, out) {
      assert.ok(!err)
      assert.equal(1, out.b)
      assert.equal(1, tmp.a)
      assert.equal(0, tmp.as1)
      assert.equal(0, tmp.as2)

      si.sub({a: 1}, function (args) {
        assert.equal(1, args.a)
        assert.equal(true, args.in$)
        tmp.as1 = tmp.as1 + 1
      })

      si.sub({a: 1, in$: true}, function (args) {
        assert.equal(1, args.a)
        assert.equal(true, args.in$)
        tmp.as1_in = tmp.as1_in + 1
      })

      si.sub({a: 1, out$: true}, function (args, result) {
        assert.equal(1, args.a)
        assert.equal(1, result.y)
        assert.equal(true, args.out$)
        tmp.as1_out = tmp.as1_out + 1
      })

      si.act({a: 1}, function (err, out) {
        assert.ok(!err)
        assert.equal(1, out.b)
        assert.equal(2, tmp.a)
        assert.equal(1, tmp.as1)
        assert.equal(1, tmp.as1_in)
        assert.equal(1, tmp.as1_out)
        assert.equal(0, tmp.as2)

        si.sub({a: 1}, function (args) {
          tmp.as2 = tmp.as2 + 1
        })

        si.act({a: 1, x: 1}, function (err, out) {
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
    si.sub({fail: 1}, function () {
      throw Error('Sub failed')
    })

    si.act({fail: 1}, function () {
      done()
    })
  })

  it('act-cache', function (done) {
    var si = Seneca(testopts)
    si.options({errhandler: done})

    var x = 0

    si.add({a: 1}, function (args, cb) {
      x++
      this.good({x: x})
    })

    si.ready(function () {
      si.act({a: 1}, function (err, out) {
        assert.ok(!err)
        assert.equal(1, out.x)
      })

      si.act({id$: 'a/B', a: 1}, function (err, out) {
        assert.ok(!err)
        assert.equal(2, out.x)

        si.act({a: 1}, function (err, out) {
          assert.ok(!err)
          assert.equal(3, out.x)

          si.act({id$: 'a/B', a: 1}, function (err, out) {
            assert.ok(!err)
            assert.equal(2, out.x)

            si.act('role:seneca,stats:true', function (err, stats) {
              assert.ok(!err)
              // --seneca.log.all and count INs
              // ... | grep act | grep IN | wc -l
              // sensitive to changes in plugin init and internal action calls
              assert.equal('{ calls: 9, done: 9, fails: 0, cache: 1 }',
                Util.inspect(stats.act))
              done()
            })
          })
        })
      })
    })
  })

  it('zig', function (done) {
    var si = Seneca(testopts)
    si.options({ errhandler: done })

    si
      .add('a:1', function (a, d) { d(0, {aa: a.aa}) })
      .act('a:1,aa:1', function (e, o) {
        assert.equal(1, o.aa)
        do_zig0()
      })

    function do_zig0 () {
      si
        .start()
        .wait('a:1,aa:1')
        .end(function (err, out) {
          assert.ok(!err)
          assert.equal(1, out.aa)
          do_zig1()
        })
    }

    function do_zig1 () {
      si.options({ xzig: { trace: true } })
      si
        .start()
        .run('a:1,aa:1')
        .run('a:1,aa:2')
        .wait(function (r, cb) {
          assert.deepEqual([{aa: 1}, {aa: 2}], r)
          cb()
        })
        .end(function (err, o) {
          assert.ok(!err)
          do_zig2()
        })
    }

    function do_zig2 () {
      si.options({ xzig: { trace: true } })
      var tmp = {}

      si
        .start()
        .wait('a:1,aa:1')
        .step(function A (r, cb) {
          return (tmp.aaa = r)
        })

        .if(function (cb) { return !!tmp.aaa })
        .step(function B (r, cb) {
          return (tmp.aaaa = 2)
        })
        .endif()

        .if(function (cb) { return !!tmp.aaa })
        .if(false)
        .step(function C (r, cb) {
          return (tmp.aaaa = 3)
        })
        .endif()
        .endif()

        .end(function (err, out) {
          assert.ok(!err)
          assert.equal(2, tmp.aaaa)
          do_zig3()
        })
    }

    function do_zig3 () {
      si.options({ xzig: { trace: true } })

      var tmp = {bb: []}

      si
        .add('b:1', function (a, cb) {
          tmp.bb.push(a.bb)
          cb()
        })

      si
        .start()
        .fire('b:1,bb:1')
        .fire('b:1,bb:2')
        .end(function () {
          setTimeout(function () {
            assert.deepEqual({ bb: [ 1, 2 ] }, tmp)
            do_zig4()
          }, 10)
        })
    }

    function do_zig4 () {
      si.options({xzig: {trace: true}})

      si
        .add('b:1', function (a, cb) {
          cb(0, { c: a.c })
        })

      si
        .start()
        .wait('b:1,c:2')
        .step(function (d) {
          d.d = d.c
          return d
        })
        .wait('b:1,c:$.d')
        .end(function (err, o) {
          assert.equal(2, o.c)
          done(err)
        })
    }
  })

  it('wrap', function (done) {
    var si = Seneca(testopts)
    si.options({ errhandler: done })

    si.add('a:1', function (args, cb) { cb(null, {aa: args.aa}) })
    si.add('b:2', function (args, cb) { cb(null, {bb: args.bb}) })
    si.add('a:1,c:3', function (args, cb) { cb(null, {cc: args.cc}) })
    si.add('a:1,d:4', function (args, cb) { cb(null, {dd: args.dd}) })

    si.wrap('a:1', function first (args, cb) {
      this.prior(args, function (err, out) {
        out.X = 1
        cb(err, out)
      })
    })

    function assertMetaName (name, pattern) {
      var meta = si.find(pattern)
      assert.equal(name, meta.func.name)
    }

    assertMetaName('first', 'a:1')

    // existence predicate!! d must exist
    si.wrap('a:1,d:*', function second (args, cb) {
      this.prior(args, function (err, out) {
        out.DD = 44
        cb(err, out)
      })
    })

    assertMetaName('second', 'a:1,d:4')

    si
      .start()

      .wait('a:1,aa:1')
      .step(function (out) {
        assert.deepEqual({ aa: 1, X: 1 }, out)
      })

      .wait('a:1,c:3,cc:3')
      .step(function (out) {
        assert.deepEqual({ cc: 1, X: 1 }, out)
      })

      .wait('a:1,d:4,dd:4')
      .step(function (out) {
        assert.deepEqual({ dd: 4, X: 1, DD: 44 }, out)
      })

      .wait('b:2,bb:2')
      .step(function (out) {
        assert.deepEqual({ bb: 2 }, out)
      })

      .step(function () {
        si.wrap('', function (args, cb) {
          this.prior(args, function (err, out) {
            out.ALL = 2
            cb(err, out)
          })
        })
      })

      .wait('a:1,aa:1')
      .step(function (out) {
        assert.deepEqual({ aa: 1, X: 1, ALL: 2 }, out)
      })

      .wait('a:1,c:3,cc:3')
      .step(function (out) {
        assert.deepEqual({ cc: 1, X: 1, ALL: 2 }, out)
      })

      .wait('a:1,d:4,dd:4')
      .step(function (out) {
        assert.deepEqual({ dd: 4, X: 1, DD: 44, ALL: 2 }, out)
      })

      .wait('b:2,bb:2')
      .step(function (out) {
        assert.deepEqual({ bb: 2, ALL: 2 }, out)
      })

      .end(done)
  })

  it('meta', function (done) {
    var si = Seneca(testopts)
    si.options({ errhandler: done })

    var meta = {}

    si.add('a:1', function (args, cb) {
      meta.a = args.meta$
      cb(null, { aa: args.aa })
    })

    si.add('b:2', function (args, cb) {
      meta.b = args.meta$
      cb(null, { bb: args.bb })
    })

    si.start()
      .wait('a:1')
      .wait('b:2')
      .end(function (err) {
        assert.ok(!err)
        assert.equal('a:1', meta.a.pattern)
        assert.equal('b:2', meta.b.pattern)
        done()
      })
  })

  it('strict', function (done) {
    var si = Seneca({ log: 'silent' })

    si.add('a:1', function (a, cb) {
      cb(null, 'a')
    })
    si.act('a:1', function (err, res) {
      assert.ok(err)
      assert.equal('result_not_objarr', err.code)

      si.options({ strict: { result: false } })
      si.act('a:1', function (err, res) {
        assert.ok(!err)
        assert.equal('a', res)
        done()
      })
    })
  })

  it('add-noop', function (done) {
    Seneca({log: 'silent'})
      .error(done)
      .add('a:1')

      .act('a:1', function (e, o) {
        assert.equal(null, o)

        this.act('a:1,default$:{x:1}', function (e, o) {
          assert.equal(1, o.x)
          done()
        })
      })
  })

  it('cluster errors when node version is less than 0.12.0', function (done) {
    var version = process.versions.node
    var si = Seneca(testopts)

    si.die = function (err) {
      process.versions.node = version
      assert.strictEqual(err.code, 'bad_cluster_version')
      done()
    }

    si.ready(function () {
      delete process.versions.node
      process.versions.node = '0.11.99'
      si.cluster()
    })
  })

  describe('#error', function () {
    it('isn\'t called twice on fatal errors when falta$: true', function (done) {
      var si = Seneca({ log: 'silent', debug: { undead: true } })

      var count = 0
      si.error(function () {
        assert(++count === 1)
      })

      si.add({ role: 'foo', cmd: 'bar' }, function (args, cb) {
        cb(new Error('test error'))
      })

      si.act({ role: 'foo', cmd: 'bar', fatal$: true }, function (err) {
        assert(!err)
      })

      setTimeout(function () {
        assert(count === 1)
        done()
      }, 200)
    })

    it('isn\'t called twice when fatal$: false', function (done) {
      var si = Seneca({ log: 'silent', debug: { undead: true } })

      var count = 0
      si.error(function () {
        ++count
      })

      si.add({ role: 'foo', cmd: 'bar' }, function (args, cb) {
        cb(new Error('test error'))
      })

      si.act({ role: 'foo', cmd: 'bar', fatal$: false }, function (err) {
        assert(err)
      })

      setTimeout(function () {
        assert(count === 1)
        done()
      }, 200)
    })
  })

  describe('#decorate', function () {
    it('can add a property to seneca', function (done) {
      var si = Seneca({ log: 'silent' })
      si.decorate('foo', function () {
        assert(this === si)
        return 'bar'
      })

      assert.equal(si.foo(), 'bar')
      done()
    })

    it('cannot override core property', function (done) {
      var si = Seneca({ log: 'silent' })

      var fn = function () {
        si.decorate('use', 'foo')
      }

      assert.throws(fn)
      done()
    })

    it('cannot overwrite a decorated property', function (done) {
      var si = Seneca({ log: 'silent' })
      si.decorate('foo', function () {
        return 'bar'
      })

      var fn = function () {
        si.decorate('foo', 'bar')
      }

      assert.throws(fn)
      done()
    })

    it('cannot prefix a property with an underscore', function (done) {
      var si = Seneca({ log: 'silent' })

      var fn = function () {
        si.decorate('_use', 'foo')
      }

      assert.throws(fn)
      done()
    })
  })

  it('can be closed', function (done) {
    var si = Seneca({ log: 'silent' })

    si.close(function (err) {
      assert(!err)
      done()
    })
  })

  it('supports jsonic params to has', function (done) {
    var si = Seneca({ log: 'silent' })
    si.add({ cmd: 'a' }, function (msg, done) {
      done(null, {})
    })

    assert(si.has({cmd: 'a'}))
    assert(si.has('cmd:a'))

    done()
  })

  describe('#intercept', function () {
    it('intercept', function (done) {
      var si = Seneca({ log: 'silent' }).error(done)

      var i0 = function i0 (msg, done) {
        msg.z = 1
        var f = fm[msg.b]

        f.call(this, msg, done)
      }

      var fm = {}

      i0.handle = function (a, t) {
        fm[a.b$] = t
      }

      si.add('a:1', i0)

      si.add('a:1,b$:1', function b1 (msg, done) {
        done(null, {z: msg.z, b: 1})
      })

      si.add('a:1,b$:2', function b2 (msg, done) {
        done(null, {z: msg.z, b: 2})
      })

      si.act('a:1,b:1', function (e, o) {
        assert.equal(1, o.b)

        si.act('a:1,b:2', function (e, o) {
          assert.equal(2, o.b)

          done()
        })
      })
    })
  })
})
