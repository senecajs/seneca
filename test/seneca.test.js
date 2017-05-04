/* Copyright (c) 2010-2016 Richard Rodger, MIT License */
'use strict'

var Assert = require('assert')
var Util = require('util')
var Code = require('code')
var Gex = require('gex')
var _ = require('lodash')
var Lab = require('lab')
var Package = require('../package.json')
var Seneca = require('..')

var lab = (exports.lab = Lab.script())
var describe = lab.describe
var it = lab.it
var expect = Code.expect
var assert = Assert

// timerstub broken on node 0.11
// var timerstub = require('timerstub')
var timerstub = {
  setTimeout: setTimeout,
  setInterval: setInterval,
  Date: Date,
  wait: function(dur, fn) {
    setTimeout(fn, dur)
  }
}

var testopts = { log: 'test' }

describe('seneca', function() {
  lab.beforeEach(function(done) {
    process.removeAllListeners('SIGHUP')
    process.removeAllListeners('SIGTERM')
    process.removeAllListeners('SIGINT')
    process.removeAllListeners('SIGBREAK')
    done()
  })

  it('version', function(done) {
    var start = Date.now()
    var si = Seneca({ log: 'test', legacy: { logging: false } })
    expect(si.version).to.equal(Package.version)
    var end = Date.now()

    // ensure startup time does not degenerate
    expect(end - start).to.be.below(333)

    expect(si).to.equal(si.seneca())
    done()
  })

  it('tag', function(done) {
    var si = Seneca({ tag: 'foo' }, testopts)
    expect(si.tag).to.equal('foo')
    expect(si.id).to.endWith('/foo')
    done()
  })

  it('quick', function(done) {
    var si = Seneca({ log: 'test' }).error(done)

    si.use(function quickplugin() {
      this.add({ a: 1 }, function(args, cb) {
        cb(null, { b: 2 })
      })
    })

    si.act({ a: 1 }, function(err, out) {
      assert.ok(!err)
      assert.equal(out.b, 2)

      si.act('a:1', function(err, out) {
        assert.ok(!err)
        assert.equal(out.b, 2)
        done()
      })
    })
  })

  it('ready-complex', function(done) {
    var mark = { ec: 0 }

    timerstub.setTimeout(function() {
      assert.ok(mark.r0, 'r0')
      assert.ok(mark.r1, 'r1')
      assert.ok(mark.p1, 'p1')
      assert.ok(mark.p2, 'p2')
      assert.equal(mark.ec, 2, 'ec')

      done()
    }, 555)

    var si = Seneca(testopts)
    si.ready(function() {
      mark.r0 = true

      si.use(function p1() {
        si.add({ init: 'p1' }, function(args, done) {
          timerstub.setTimeout(function() {
            mark.p1 = true
            done()
          }, 40)
        })
      })

      si.on('ready', function() {
        mark.ec++
      })

      si.ready(function() {
        mark.r1 = true

        si.use(function p2() {
          si.add({ init: 'p2' }, function(args, done) {
            timerstub.setTimeout(function() {
              mark.p2 = true
              done()
            }, 40)
          })
        })
      })
    })
  })

  it('ready-func', function(done) {
    var si = Seneca(testopts)

    si.ready(function() {
      done()
    })
  })

  it('ready-event', function(done) {
    var si = Seneca(testopts)

    si.on('ready', function() {
      done()
    })
  })

  it('ready-both', function(done) {
    var si = Seneca(testopts)
    var tmp = {}

    si.on('ready', function() {
      tmp.a = 1
      complete()
    })

    si.ready(function() {
      tmp.b = 1
      complete()
    })

    function complete() {
      if (tmp.a && tmp.b) {
        done()
      }
    }
  })

  it('happy-error', function(done) {
    Seneca({ log: 'silent' })
      .add('happy_error:1', function(args, done) {
        done(new Error('happy-error'))
      })
      .act('happy_error:1', function(err) {
        assert.ok(err)
        assert.equal(
          'seneca: Action happy_error:1 failed: happy-error.',
          err.message
        )
        done()
      })
  })

  it('errhandler', function(done) {
    var tmp = {}

    function grab_all(err) {
      tmp.grab = err
      return true
    }

    function pass_on(err) {
      tmp.pass = err
    }

    var si = Seneca({ log: 'silent' })
    si.add('cmd:grab', function(args, done) {
      done(new Error('grab'))
    })
    si.add('cmd:pass', function(args, done) {
      done(new Error('pass'))
    })

    si.options({ errhandler: grab_all })

    si.act('cmd:grab', function() {
      assert.fail()
    })

    setTimeout(function() {
      assert.ok(tmp.grab)

      si.options({ errhandler: pass_on })

      si.act('cmd:pass', function(err) {
        assert.ok(err)
        assert.ok(tmp.pass)
        done()
      })
    }, 100)
  })

  it('action-basic', function(done) {
    var si = Seneca(testopts).error(done)
    si.options({ debug: { fragile: true } })

    var a1 = 0

    si.add({ op: 'foo' }, function(args, cb) {
      a1 = args.a1
      cb(null, { s: '+' + a1 })
    })

    si.act({ op: 'foo', a1: 100 }, function(err, out) {
      assert.equal(err, null)
      assert.equal('+100', out.s)
      assert.equal(100, a1)

      si.act({ op: 'foo', a1: 200 }, function(err, out) {
        assert.equal(err, null)
        assert.equal('+200', out.s)
        assert.equal(200, a1)

        done()
      })
    })

    it('action timeouts override the seneca instance timeout', function(done) {
      var seneca = Seneca({ log: 'silent', timeout: 2 }).error(done)
      seneca.add({ cmd: 'foo' }, function(args, cb) {
        root.setTimout(function() {
          cb({ result: 'bar' })
        }, 10)
      })

      seneca.act({ cmd: 'foo', timeout$: 20 }, function(err, message) {
        expect(err).to.not.exist()
        expect(message.result).to.equal('bar')
        done()
      })
    })
  })

  it('action-callback-instance', function(done) {
    Seneca({ log: 'silent' })
      .error(done)
      .add({ cmd: 'foo' }, function(args, reply) {
        reply(null, { did: reply.seneca.did })
      })
      .act({ cmd: 'foo' }, function(err, result) {
        expect(err).to.not.exist()
        expect(result.did).to.equal(this.did)
        done()
      })
  })

  it('action-act-invalid-args', function(done) {
    var si = Seneca(testopts, { log: 'silent' })

    si.act({ op: 'bad', a1: 100 }, function(e) {
      assert.equal(e.code, 'act_not_found')

      // default is not an object
      si.act({ op: 'bad', a1: 100, default$: 'qaz' }, function(e) {
        assert.equal(e.code, 'act_default_bad')

        si.act(null, function(e) {
          assert.equal(e.code, 'act_not_found')
          done()
        })
      })
    })
  })

  it('action-default', function(done) {
    var si = Seneca(testopts).error(done)

    si.act({ op: 'bad', a1: 100, default$: { a: 1 } }, function(err, out) {
      assert.equal(err, null)
      assert.deepEqual({ a: 1 }, out)

      si.add('a:0', function(m, r) {
        this.prior(m, r)
      })

      si.act('a:0,default$:{y:2}', function(e, o) {
        assert.equal(null, e)
        assert.deepEqual({ y: 2 }, o)

        si.add('a:0', function(m, r) {
          this.prior(m, r)
        })

        si.act('a:0,default$:{y:3}', function(e, o) {
          assert.equal(null, e)
          assert.deepEqual({ y: 3 }, o)

          done()
        })
      })
    })
  })

  it('action-override', function(done) {
    var si = Seneca(testopts).error(done)

    function foo(args, done) {
      done(null, { a: args.a, s: this.toString(), foo: args.meta$ })
    }

    function bar(args, done) {
      var pargs = { a: args.a, s: args.s }
      this.prior(pargs, function(e, o) {
        o.b = 2
        o.bar = args.meta$
        done(e, o)
      })
    }

    function zed(args, done) {
      args.z = 3
      this.prior(args, function(e, o) {
        o.z = 3
        o.zed = args.meta$
        done(e, o)
      })
    }

    si.ready(function() {
      si.add({ op: 'foo' }, foo)
      si.act('op:foo,a:1', function(e, o) {
        assert.ok(Gex('1~Seneca/*' + '/*').on('' + o.a + '~' + o.s))
        assert.ok(o.foo.prior.entry)

        si.add({ op: 'foo' }, bar)
        si.act('op:foo,a:1', function(e, o) {
          assert.ok(
            Gex('1~2~Seneca/*' + '/*').on('' + o.a + '~' + o.b + '~' + o.s)
          )
          assert.ok(o.bar.prior.entry)
          assert.ok(!o.foo.prior.entry)

          si.add({ op: 'foo' }, zed)
          si.act('op:foo,a:1', function(e, o) {
            assert.ok(
              Gex('1~2~3~Seneca/*' + '/*').on(
                '' + o.a + '~' + o.b + '~' + o.z + '~' + o.s
              )
            )
            assert.ok(o.zed.prior.entry)
            assert.ok(!o.bar.prior.entry)
            assert.ok(!o.foo.prior.entry)

            done()
          })
        })
      })
    })
  })

  it('action-callback-args', function(done) {
    var si = Seneca(testopts).error(done)

    function foo(args, next) {
      next.apply(null, args.items)
    }
    si.add({ op: 'foo' }, foo)

    var items = [null, { one: 1 }, { two: 2 }, { three: 3 }]
    si.act('op:foo', { items: items }, function() {
      assert.equal(arguments.length, items.length)
      done()
    })
  })

  it('action-extend', function(done) {
    var si = Seneca(testopts).error(done)

    si.options({ strict: { add: false } })

    function foo(args, next) {
      next(null, { a: args.a, s: this.toString(), foo: args.meta$ })
    }

    function bar(args, next) {
      var pargs = { a: args.a, s: args.s }
      this.prior(pargs, function(e, o) {
        o.b = 2
        o.bar = args.meta$
        next(e, o)
      })
    }

    function zed(args, next) {
      args.z = 3
      this.prior(args, function(e, o) {
        o.z = 3
        o.zed = args.meta$
        next(e, o)
      })
    }

    si.ready(function() {
      si.add({ op: 'foo' }, foo)
      si.add({ op: 'foo', a: 1 }, bar)
      si.add({ op: 'foo', a: 1, b: 2 }, zed)

      si.act('op:foo,a:1', function(err, o) {
        assert.ok(!err)
        assert.ok(Gex('1~Seneca/*' + '/*').on('' + o.a + '~' + o.s))
        assert.ok(!o.foo.prior.entry)
        assert.ok(o.bar.prior.entry)

        si.act('op:foo,a:1,b:2', function(err, o) {
          assert.ok(!err)
          assert.ok(
            Gex('1~2~Seneca/*' + '/*').on('' + o.a + '~' + o.b + '~' + o.s)
          )
          assert.ok(!o.foo.prior.entry)
          assert.ok(!o.bar.prior.entry)
          assert.ok(o.zed.prior.entry)
          done()
        })
      })
    })
  })

  it('prior-nocache', function(done) {
    var si = Seneca({ log: 'test', errhandler: done, trace: { act: false } })
    var count = 0
    var called = ''

    si.ready(function() {
      si.add('foo:a', function(msg, reply) {
        count++
        count += msg.x
        reply(null, { count: count })
      })

      si.add('foo:a', function(msg, reply) {
        count += msg.y
        msg.z = 1
        this.prior(msg, reply)
      })

      si
        .gate()
        .act('foo:a,x:10,y:0.1', function(err) {
          assert.equal(err, null)
          assert.equal(11.1, count)
          called += 'A'
        })
        .act('foo:a,x:100,y:0.01', function(err) {
          assert.equal(err, null)
          assert.equal(112.11, count)
          called += 'B'
        })
        .act('foo:a,x:10,y:0.1', function(err) {
          assert.equal(err, null)
          assert.equal(123.21, count)
          called += 'C'
        })
        .act('foo:a,x:100,y:0.01', function(err) {
          assert.equal(err, null)
          assert.equal(224.22, count)
          called += 'D'
        })
        .ready(function() {
          assert.equal('ABCD', called)
          assert.equal(224.22, count)

          this.add('foo:a', function(msg, reply) {
            count += msg.z
            this.prior(msg, reply)
          })
            .gate()
            .act('foo:a,x:10,y:0.1,z:1000000', function(err) {
              assert.equal(err, null)
              assert.equal(1000235.32, count)
              called += 'E'
            })
            .ready(function() {
              assert.equal('ABCDE', called)
              done()
            })
        })
    })
  })

  it('gating', function(done) {
    var si = Seneca({ log: 'silent', errhandler: done })
    var count = 0
    var called = ''

    si.add('foo:a', function(args, done) {
      count++
      count += args.x
      done(null, { count: count })
    })

    si
      .gate()
      .act('foo:a,x:10', function(err) {
        assert.equal(err, null)
        assert.equal(11, count)
        called += 'A'
      })
      .act('foo:a,x:100', function(err) {
        assert.equal(err, null)
        assert.equal(112, count)
        called += 'B'
      })
      .act('foo:a,x:1000', function(err) {
        assert.equal(err, null)
        assert.equal(1113, count)
        called += 'C'
      })
      .ready(function() {
        assert.equal('ABC', called)
        assert.equal(1113, count)
        done()
      })
  })

  it('act_if', function(done) {
    var si = Seneca({ log: 'silent' })

    si.add({ op: 'foo' }, function(args, next) {
      next(null, 'foo' + args.bar)
    })

    si.act_if(true, { op: 'foo', bar: '1' }, function(err, out) {
      assert.equal(err, null)
      assert.equal('foo1', out)
    })

    si.act_if(false, { op: 'foo', bar: '2' }, function() {
      assert.fail()
    })

    si.act_if(true, 'op:foo,bar:3', function(err, out) {
      assert.equal(err, null)
      assert.equal('foo3', out)
    })

    try {
      si.act_if({ op: 'foo', bar: '2' }, function() {
        assert.fail()
      })
    } catch (e) {
      assert.ok(e.message.match(/norma:/))
    }

    si = Seneca(testopts)
      .add('a:1', function(args) {
        this.good({ b: args.a + 1 })
      })
      .add('a:2', function(args) {
        this.good({ b: args.a + 2 })
      })

    si.act_if(true, 'a:1', function(err, out) {
      assert.ok(!err)
      assert.equal(2, out.b)

      si.act_if(false, 'a:2', function() {
        assert.fail()
      })

      process.nextTick(done)
    })
  })

  it('loading-plugins', function(done) {
    var si = Seneca({
      log: 'silent'
    })

    function Mock1() {
      var self = this
      self.name = 'mock1'
      self.plugin = function() {
        return self
      }
      self.init = function() {
        this.add({ role: self.name, cmd: 'foo' }, function(args, cb) {
          cb(null, 'foo:' + args.foo)
        })
      }
    }

    si = Seneca(testopts)
    si.register(new Mock1(), function(err) {
      assert.equal(err, null)

      si.act({ role: 'mock1', cmd: 'foo', foo: 1 }, function(err, out) {
        assert.equal(err, null)
        assert.equal('foo:1', out)
      })
    })

    si = Seneca(testopts)
    var mock1a = new Mock1()
    mock1a.name = 'mock1a'
    si.register(mock1a, function(err) {
      assert.equal(err, null)

      si.act({ role: 'mock1a', cmd: 'foo', foo: 1 }, function(err, out) {
        assert.equal(err, null)
        assert.equal('foo:1', out)
      })
    })

    function Mock2() {
      var self = this
      self.name = 'mock2'
      self.plugin = function() {
        return self
      }
      self.init = function() {
        this.add({ role: 'mock1', cmd: 'foo' }, function(args, cb) {
          this.prior(args, function(err, out) {
            assert.equal(err, null)
            cb(null, 'bar:' + out)
          })
        })
      }
    }

    si = Seneca(testopts)
    si.register(new Mock1(), function(err) {
      assert.equal(err, null)

      si.register(new Mock2(), function(err) {
        assert.equal(err, null)

        si.act({ role: 'mock1', cmd: 'foo', foo: 2 }, function(err, out) {
          assert.equal(err, null)
          assert.equal('bar:foo:2', out)
        })
      })
    })

    done()
  })

  it('fire-and-forget', function(done) {
    var si = Seneca({ log: 'silent' })
    si.add({ a: 1 }, function(args, cb) {
      cb(null, args.a + 1)
    })
    si.add({ a: 1, b: 2 }, function(args, cb) {
      cb(null, args.a + args.b)
    })

    si.act({ a: 1 })
    si.act({ a: 1, b: 2 })
    si.act('a:1')
    si.act('a:1, b:2')
    si.act('a:1', { b: 2 })
    si.act('b:2', { a: 1 })
    si.act('', { a: 1 })
    si.act('', { a: 1, b: 2 })
    done()
  })

  it('strargs', function(done) {
    var si = Seneca({ log: 'silent', strict: { result: false } })
    si.add({ a: 1, b: 2 }, function(args, cb) {
      cb(null, (args.c || -1) + parseInt(args.b, 10) + parseInt(args.a, 10))
    })

    si.act({ a: 1, b: 2, c: 3 }, function(err, out) {
      assert.ok(!err)
      assert.equal(6, out)

      si.act('a:1,b:2,c:3', function(err, out) {
        assert.ok(!err)
        assert.equal(6, out)

        si.act('a:1,b:2', function(err, out) {
          assert.ok(!err)
          assert.equal(2, out)

          try {
            si.add('a:,b:2', function(args, cb) {
              cb()
            })
          } catch (e) {
            assert.equal(e.code, 'add_string_pattern_syntax')

            try {
              si.act('a:,b:2', { c: 3 }, function() {
                assert.fail()
              })
            } catch (e) {
              assert.equal(e.code, 'add_string_pattern_syntax')

              try {
                si.add('a:1,b:2', 'bad-arg', function(args, cb) {
                  cb()
                })
              } catch (e) {
                assert.ok(e.message.match(/norma:/))

                try {
                  si.add(123, function(args, cb) {
                    cb()
                  })
                } catch (e) {
                  assert.ok(e.message.match(/norma:/))
                  done()
                }
              }
            }
          }
        })
      })
    })
  })

  it('string-add', function(done) {
    var addFunction = function(args, done) {
      done(null, {
        v: (args.c || -1) + parseInt(args.b, 10) + parseInt(args.a, 10)
      })
    }

    var checkFunction = function(err, out, done) {
      assert.equal(err, null)
      assert.equal(6, out.v)
      done()
    }

    var si = Seneca(testopts).error(done)

    si
      .add('i:0,a:1,b:2', addFunction)
      .act('i:0,a:1,b:2,c:3', function(err, out) {
        checkFunction(err, out, function() {
          si
            .add('i:1,a:1', { b: 2 }, addFunction)
            .act('i:1,a:1,b:2,c:3', function(err, out) {
              checkFunction(err, out, function() {
                si
                  .add('i:2,a:1', { b: 2, c: { required$: true } }, addFunction)
                  .act('i:2,a:1,b:2,c:3', function(err, out) {
                    checkFunction(err, out, done)
                  })
              })
            })
        })
      })
  })

  it('fix-basic', function(done) {
    var si = Seneca(testopts)

    function ab(args, cb) {
      cb(null, { r: '' + args.a + (args.b || '-') + (args.c || '-') + args.z })
    }

    si
      .fix('a:1')
      .add('b:2', ab)
      .add('c:3', ab)
      .act('b:2,z:8', function(err, out) {
        assert.equal(err, null)
        assert.equal('12-8', out.r)
      })
      .act('c:3,z:9', function(err, out) {
        assert.equal(err, null)
        assert.equal('1-39', out.r)
      })

    si
      .act('a:1,b:2,z:8', function(err, out) {
        assert.equal(err, null)
        assert.equal('12-8', out.r)
      })
      .act('a:1,c:3,z:9', function(err, out) {
        assert.equal(err, null)
        assert.equal('1-39', out.r)
      })

    done()
  })

  it('sub', function(done) {
    var si = Seneca(testopts, { log: 'silent', errhandler: done })

    var tmp = { a: 0, as1: 0, as2: 0, as1_in: 0, as1_out: 0, all: 0 }

    si.sub({}, function() {
      tmp.all++
    })

    si.add({ a: 1 }, function(args, reply) {
      tmp.a = tmp.a + 1
      reply({ b: 1, y: 1 })
    })

    si.act({ a: 1 }, function(err, out) {
      assert.ok(!err)
      assert.equal(1, out.b)
      assert.equal(1, tmp.a)
      assert.equal(0, tmp.as1)
      assert.equal(0, tmp.as2)

      si.sub({ a: 1 }, function(args) {
        assert.equal(1, args.a)
        assert.equal(true, args.in$)
        tmp.as1 = tmp.as1 + 1
      })

      si.sub({ a: 1, in$: true }, function(args) {
        assert.equal(1, args.a)
        assert.equal(true, args.in$)
        tmp.as1_in = tmp.as1_in + 1
      })

      si.sub({ a: 1, out$: true }, function(args, result) {
        assert.equal(1, args.a)
        assert.equal(1, result.y)
        assert.equal(true, args.out$)
        tmp.as1_out = tmp.as1_out + 1
      })

      si.act({ a: 1 }, function(err, out) {
        assert.ok(!err)
        assert.equal(1, out.b)
        assert.equal(2, tmp.a)
        assert.equal(1, tmp.as1)
        assert.equal(1, tmp.as1_in)
        assert.equal(1, tmp.as1_out)
        assert.equal(0, tmp.as2)

        si.sub({ a: 1 }, function() {
          tmp.as2 = tmp.as2 + 1
        })

        si.act({ a: 1, x: 1 }, function(err, out) {
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
    si.sub({ fail: 1 }, function() {
      throw Error('Sub failed')
    })

    si.add({ fail: 1 }, function(msg, done) {
      done()
    })
    si.act({ fail: 1 }, function() {
      done()
    })
  })

  it('act-cache', function(done) {
    var si = Seneca(testopts, { actcache: { active: true } })
    si.options({ errhandler: done })

    si.use('entity')

    var x = 0

    si.add({ a: 1 }, function() {
      x++
      this.good({ x: x })
    })

    si.act({ a: 1 }, function(err, out) {
      assert.ok(!err)
      assert.equal(1, out.x)
    })

    si.act({ id$: 'a/B', a: 1 }, function(err, out) {
      assert.ok(!err)
      assert.equal(2, out.x)

      si.act({ a: 1 }, function(err, out) {
        assert.ok(!err)
        assert.equal(3, out.x)

        si.act({ id$: 'a/B', a: 1 }, function(err, out) {
          assert.ok(!err)
          assert.equal(2, out.x)

          si.act('role:seneca,cmd:stats', function(err, stats) {
            assert.ok(!err)
            // --seneca.log.all and count INs
            // ... | grep act | grep IN | wc -l
            // sensitive to changes in plugin init and internal action calls
            assert.equal(
              '{ calls: 8, done: 8, fails: 0, cache: 1 }',
              Util.inspect(stats.act)
            )
            done()
          })
        })
      })
    })
  })

  it('wrap', function(done) {
    var si = Seneca(testopts)
    si.options({ errhandler: done })

    si.add('a:1', function(args, cb) {
      cb(null, { aa: args.aa })
    })
    si.add('b:2', function(args, cb) {
      cb(null, { bb: args.bb })
    })
    si.add('a:1,c:3', function(args, cb) {
      cb(null, { cc: args.cc })
    })
    si.add('a:1,d:4', function(args, cb) {
      cb(null, { dd: args.dd })
    })

    si.wrap('a:1', function first(args, cb) {
      this.prior(args, function(err, out) {
        out.X = 1
        cb(err, out)
      })
    })

    function assertMetaName(name, pattern) {
      var meta = si.find(pattern)
      assert.equal(name, meta.func.name)
    }

    assertMetaName('first', 'a:1')

    // existence predicate!! d must exist
    si.wrap('a:1,d:*', function second(args, cb) {
      this.prior(args, function(err, out) {
        out.DD = 44
        cb(err, out)
      })
    })

    assertMetaName('second', 'a:1,d:4')

    si.act('a:1,aa:1', function(err, out) {
      assert.equal(err, null)
      assert.deepEqual({ aa: 1, X: 1 }, out)

      si.act('a:1,c:3,cc:3', function(err, out) {
        assert.equal(err, null)
        assert.deepEqual({ cc: 3, X: 1 }, out)

        si.act('a:1,d:4,dd:4', function(err, out) {
          assert.equal(err, null)
          assert.deepEqual({ dd: 4, X: 1, DD: 44 }, out)

          si.act('b:2,bb:2', function(err, out) {
            assert.equal(err, null)
            assert.deepEqual({ bb: 2 }, out)

            si.wrap('', function(args, cb) {
              this.prior(args, function(err, out) {
                out.ALL = 2
                cb(err, out)
              })
            })

            si.act('a:1,aa:1', function(err, out) {
              assert.equal(err, null)
              assert.deepEqual({ aa: 1, X: 1, ALL: 2 }, out)

              si.act('a:1,c:3,cc:3', function(err, out) {
                assert.equal(err, null)
                assert.deepEqual({ cc: 3, X: 1, ALL: 2 }, out)

                si.act('a:1,d:4,dd:4', function(err, out) {
                  assert.equal(err, null)
                  assert.deepEqual({ dd: 4, X: 1, DD: 44, ALL: 2 }, out)

                  si.act('b:2,bb:2', function(err, out) {
                    assert.equal(err, null)
                    assert.deepEqual({ bb: 2, ALL: 2 }, out)
                    done()
                  })
                })
              })
            })
          })
        })
      })
    })
  })

  it('meta', function(done) {
    var si = Seneca(testopts)
    si.options({ errhandler: done })

    var meta = {}

    si.add('a:1', function(args, cb) {
      meta.a = args.meta$
      cb(null, { aa: args.aa })
    })

    si.add('b:2', function(args, cb) {
      meta.b = args.meta$
      cb(null, { bb: args.bb })
    })

    si.act('a:1', function(err) {
      assert.ok(!err)
      si.act('b:2', function(err) {
        assert.ok(!err)
        assert.equal('a:1', meta.a.pattern)
        assert.equal('b:2', meta.b.pattern)

        done()
      })
    })
  })

  it('strict', function(done) {
    var si = Seneca({ log: 'silent' })

    si.add('a:1', function(a, cb) {
      cb(null, 'a')
    })
    si.act('a:1', function(err) {
      assert.ok(err)
      assert.equal('result_not_objarr', err.code)

      si.options({ strict: { result: false } })
      si.act('a:1', function(err, res) {
        assert.ok(!err)
        assert.equal('a', res)
        done()
      })
    })
  })

  it('add-noop', function(done) {
    var si = Seneca({ log: 'silent' })
      .error(done)
      .add('a:1')
      .act('a:1', function(e, o) {
        assert.equal(null, o)

        // use si to avoid act_loop error
        si.act('a:1,default$:{x:1}', function(e, o) {
          assert.equal(1, o.x)
          done()
        })
      })
  })

  describe('#error', function() {
    it("isn't called twice on fatal errors when fatal$: true", function(done) {
      var si = Seneca({ log: 'silent', debug: { undead: true } })

      var count = 0
      si.error(function() {
        assert(++count === 1)
      })

      si.add({ role: 'foo', cmd: 'bar' }, function(args, cb) {
        cb(new Error('test error'))
      })

      si.act({ role: 'foo', cmd: 'bar', fatal$: true }, function(err) {
        assert(!err)
      })

      setTimeout(function() {
        assert(count === 1)
        done()
      }, 200)
    })

    it("isn't called twice when fatal$: false", function(done) {
      var si = Seneca({ log: 'silent', debug: { undead: true } })

      var count = 0
      si.error(function() {
        ++count
      })

      si.add({ role: 'foo', cmd: 'bar' }, function(args, cb) {
        cb(new Error('test error'))
      })

      si.act({ role: 'foo', cmd: 'bar', fatal$: false }, function(err) {
        assert(err)
      })

      setTimeout(function() {
        assert(count === 1)
        done()
      }, 200)
    })
  })

  describe('#decorate', function() {
    it('can add a property to seneca', function(done) {
      var si = Seneca({ log: 'silent' })
      si.decorate('foo', function() {
        assert(this === si)
        return 'bar'
      })

      assert.equal(si.foo(), 'bar')
      done()
    })

    it('cannot override core property', function(done) {
      var si = Seneca({ log: 'silent' })

      var fn = function() {
        si.decorate('use', 'foo')
      }

      assert.throws(fn)
      done()
    })

    it('cannot overwrite a decorated property', function(done) {
      var si = Seneca({ log: 'silent' })
      si.decorate('foo', function() {
        return 'bar'
      })

      var fn = function() {
        si.decorate('foo', 'bar')
      }

      assert.throws(fn)
      done()
    })

    it('cannot prefix a property with an underscore', function(done) {
      var si = Seneca({ log: 'silent' })

      var fn = function() {
        si.decorate('_use', 'foo')
      }

      assert.throws(fn)
      done()
    })
  })

  it('basic-close', function(fin) {
    Seneca({legacy:{transport:false}})
      .test(fin)
      .close(function(err) {
        assert(!err)
        fin()
      })
  })

  it('supports jsonic params to has', function(done) {
    var si = Seneca({ log: 'silent' })
    si.add({ cmd: 'a' }, function(msg, done) {
      done(null, {})
    })

    assert(si.has({ cmd: 'a' }))
    assert(si.has('cmd:a'))

    done()
  })

  describe('#intercept', function() {
    it('intercept', function(done) {
      var si = Seneca({ log: 'silent' }).error(done)
      var fm = {}

      var i0 = function i0(msg, done) {
        msg.z = 1
        var f = fm[msg.b]

        f.call(this, msg, done)
      }

      i0.handle = function(a, t) {
        fm[a.b$] = t
      }

      si.add('a:1', i0)

      si.add('a:1,b$:1', function b1(msg, done) {
        done(null, { z: msg.z, b: 1 })
      })

      si.add('a:1,b$:2', function b2(msg, done) {
        done(null, { z: msg.z, b: 2 })
      })

      si.act('a:1,b:1', function(e, o) {
        assert.equal(1, o.b)

        si.act('a:1,b:2', function(e, o) {
          assert.equal(2, o.b)

          done()
        })
      })
    })
  })

  it('supports a function to trace actions', function(done) {
    var seneca = Seneca({ log: 'silent', trace: { act: _.noop } })
    seneca.add({ a: 1 }, function(args, cb) {
      cb(null, { b: 2 })
    })
    seneca.act({ a: 1 }, function(err, out) {
      expect(err).to.not.exist()
      assert.equal(out.b, 2)
      done()
    })
  })

  it('supports true to be passed as trace action option', function(done) {
    var stdout = process.stdout.write
    process.stdout.write = _.noop

    var seneca = Seneca({ log: 'silent', trace: { act: true } })
    seneca.add({ a: 1 }, function(args, cb) {
      cb(null, { b: 2 })
    })
    seneca.act({ a: 1 }, function(err, out) {
      expect(err).to.not.exist()
      assert.equal(out.b, 2)
      process.stdout.write = stdout
      done()
    })
  })

  it('supports strict.find for allowing not found actions', function(done) {
    var seneca = Seneca({ log: 'silent', strict: { find: false } })
    seneca.act({ a: 1 }, function(err, out) {
      expect(err).to.not.exist()
      expect(Object.keys(out).length).to.equal(0)
      done()
    })
  })

  it('supports strict.find for disabling not found actions', function(done) {
    var seneca = Seneca({ log: 'silent', strict: { find: true } })
    seneca.act({ a: 1 }, function(err, out) {
      expect(err).to.exist()
      expect(out).to.not.exist()
      done()
    })
  })

  it('supports strict.find not overriding existing default$', function(done) {
    var seneca = Seneca({ log: 'test', strict: { find: false } })
    seneca.act({ a: 1, default$: { foo: 'bar' } }, function(err, out) {
      expect(err).to.not.exist()
      expect(Object.keys(out).length).to.equal(1)
      done()
    })
  })

  // Confirms fix for https://github.com/senecajs/seneca/issues/375
  it('catchall-pattern', function(done) {
    var seneca = Seneca({ log: 'test' }).error(done)

    seneca
      .add('', function(msg, done) {
        done(null, { r: 1 })
      })
      .add('a:1', function(msg, done) {
        done(null, { x: 1 })
      })
      .add('b:1,c:1', function(msg, done) {
        done(null, { z: 1 })
      })
      // Execute following actions sequentially, so that
      // .ready(done) will wait for them to complete
      .gate()
      .act('', function(ignored, out) {
        expect(out.r).to.equal(1)
      })
      .act('k:1', function(ignored, out) {
        expect(out.r).to.equal(1)
      })
      .act('a:1', function(ignored, out) {
        expect(out.x).to.equal(1)
      })
      .act('a:2', function(ignored, out) {
        expect(out.r).to.equal(1)
      })
      // Hits the catchall, even though b:1 is a partial pattern
      .act('b:1', function(ignored, out) {
        expect(out.r).to.equal(1)
      })
      .act('b:2', function(ignored, out) {
        expect(out.r).to.equal(1)
      })
      .act('c:1', function(ignored, out) {
        expect(out.r).to.equal(1)
      })
      .act('c:2', function(ignored, out) {
        expect(out.r).to.equal(1)
      })
      .act('b:1,c:1', function(ignored, out) {
        expect(out.z).to.equal(1)
      })
      .act('b:2,c:1', function(ignored, out) {
        expect(out.r).to.equal(1)
      })
      // Hits the catchall, even though b:1 is a partial pattern
      .act('b:1,c:2', function(ignored, out) {
        expect(out.r).to.equal(1)
      })
      .ungate()
      .ready(done)
  })

  it('memory', function(done) {
    var SIZE = 1000

    Seneca({ log: 'silent' })
      .error(done)
      .add('a:1', function(msg, done) {
        done(null, { x: msg.x })
      })
      .ready(function() {
        var start = Date.now()
        var count = 0

        for (var i = 0; i < SIZE; ++i) {
          this.act('a:1', { x: i }, function() {
            ++count

            if (SIZE === count) validate(start)
          })
        }
      })

    function validate(start) {
      var end = Date.now()
      expect(end - start).below(1500)

      var mem = process.memoryUsage()
      expect(mem.rss).below(180000000)

      done()
    }
  })
})
