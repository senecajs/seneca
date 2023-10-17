/* Copyright (c) 2010-2019 Richard Rodger and other contributors, MIT License */
'use strict'

const Assert = require('assert')
const Util = require('util')
const Code = require('@hapi/code')
const { Gex } = require('gex')
const Lab = require('@hapi/lab')
const Package = require('../package.json')
const Common = require('../lib/common.js')

const lab = (exports.lab = Lab.script())
const describe = lab.describe
const expect = Code.expect
const assert = Assert

const Shared = require('./shared')
const it = Shared.make_it(lab)
const clock = Shared.clock()

const Seneca = require('..')

const tmx = parseInt(process.env.TIMEOUT_MULTIPLIER || 1, 10)
console.log('TEST transport tmx=' + tmx)

// timerstub broken on node 0.11
// const timerstub = require('timerstub')
const timerstub = {
  setTimeout: setTimeout,
  setInterval: setInterval,
  Date: Date,
  wait: function (dur, fn) {
    setTimeout(fn, dur)
  },
}

const testopts = { log: 'test' }

describe('seneca', function () {
  it('happy', function (fin) {
    Seneca()
      .test(fin)
      .add('a:1', function (msg, reply, meta) {
        expect(msg).includes({ a: 1 })
        expect(JSON.stringify(this.util.clean(msg))).equals('{"a":1}')
        expect(meta).includes({ pattern: 'a:1' })
        reply({ x: 1 })
      })
      .act('a:1', function (err, out, meta) {
        expect(err).not.exist()
        expect(out).includes({ x: 1 })
        expect(JSON.stringify(this.util.clean(out))).equals('{"x":1}')
        expect(meta).includes({ pattern: 'a:1' })
        expect(meta).includes(meta)
        fin()
      })
  })

  it('require-abbrev', function (done) {
    var si0 = require('..').test()
    var si1 = require('..').quiet()
    si0.ready(si1.ready.bind(si1, done))
  })

  it('version', function (done) {
    var start = Date.now()
    var si = Seneca({ log: 'test', legacy: { logging: false } })
    expect(si.version).to.equal(Package.version)
    var end = Date.now()

    // ensure startup time does not degenerate
    expect(end - start).to.be.below(333)

    expect(si === si.seneca()).true()
    done()
  })

  it('tag', function (done) {
    var si = Seneca({ tag: 'foo' }, testopts)
    expect(si.tag).to.equal('foo')
    expect(si.id).to.endWith('/foo')

    si.options({ tag: 'bar' })
    expect(si.tag).to.equal('bar')
    expect(si.id).to.endWith('/bar')

    var d0 = si.delegate()
    d0.options({ tag: 'zed' })
    expect(d0.tag).to.equal('zed')
    expect(d0.id).to.endWith('/zed')
    expect(si.tag).to.equal('zed')
    expect(si.id).to.endWith('/zed')

    done()
  })

  it('json-inspect', function (done) {
    var si = Seneca({ id$: 'a' }, testopts)
    si.start_time = 123
    expect(JSON.stringify(si)).equal(
      '{"isSeneca":true,"id":"a","fixedargs":{},"fixedmeta":{},"start_time":123,"version":"' +
        Package.version +
        '"}',
    )
    expect(Util.inspect(si).replace(/\n */g, ' ')).equal(
      "{ isSeneca: true, id: 'a', did: undefined, fixedargs: {}, fixedmeta: {}, start_time: 123, version: '" +
        Package.version +
        "' }",
    )
    done()
  })

  it('quick', function (done) {
    var si = Seneca({ log: 'test' }).error(done)

    si.use(function quickplugin() {
      this.add({ a: 1 }, function (args, cb) {
        cb(null, { b: 2 })
      })
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

  it('happy-error', function (done) {
    Seneca({ log: 'silent' })
      .add('happy_error:1', function (args, done) {
        done(new Error('happy-error'))
      })
      .act('happy_error:1', function (err) {
        assert.ok(err)
        assert.equal(
          'seneca: Action happy_error:1 failed: happy-error.',
          err.message,
        )
        done()
      })
  })

  it('errhandler', function (done) {
    var tmp = {}

    function grab_all(err) {
      tmp.grab = err
      return true
    }

    function pass_on(err) {
      tmp.pass = err
    }

    var si = Seneca({ log: 'silent' })
    si.add('cmd:grab', function (args, done) {
      done(new Error('grab'))
    })
    si.add('cmd:pass', function (args, done) {
      done(new Error('pass'))
    })

    si.options({ errhandler: grab_all })

    si.act('cmd:grab', function () {
      assert.fail()
    })

    setTimeout(function () {
      assert.ok(tmp.grab)

      si.options({ errhandler: pass_on })

      si.act('cmd:pass', function (err) {
        assert.ok(err)
        assert.ok(tmp.pass)
        done()
      })
    }, 100)
  })

  it('action-basic', function (done) {
    var si = Seneca(testopts).error(done)
    si.options({ debug: { fragile: true } })

    var a1 = 0

    si.add({ op: 'foo' }, function (args, cb) {
      a1 = args.a1
      cb(null, { s: '+' + a1 })
    })

    si.act({ op: 'foo', a1: 100 }, function (err, out) {
      assert.equal(err, null)
      assert.equal('+100', out.s)
      assert.equal(100, a1)

      si.act({ op: 'foo', a1: 200 }, function (err, out) {
        assert.equal(err, null)
        assert.equal('+200', out.s)
        assert.equal(200, a1)

        done()
      })
    })

    it('action timeouts override the seneca instance timeout', function (done) {
      var seneca = Seneca({ log: 'silent', timeout: 2 }).error(done)
      seneca.add({ cmd: 'foo' }, function (args, cb) {
        root.setTimout(function () {
          cb({ result: 'bar' })
        }, 10)
      })

      seneca.act({ cmd: 'foo', timeout$: 20 }, function (err, message) {
        expect(err).to.not.exist()
        expect(message.result).to.equal('bar')
        done()
      })
    })
  })

  it('action-callback-instance', function (done) {
    Seneca({ log: 'silent' })
      .error(done)
      .add({ cmd: 'foo' }, function (args, reply) {
        reply(null, { did: reply.seneca.did })
      })
      .act({ cmd: 'foo' }, function (err, result) {
        expect(err).to.not.exist()
        expect(result.did).to.equal(this.did)
        done()
      })
  })

  it('action-act-invalid-args', function (done) {
    var si = Seneca(testopts, { log: 'silent' })

    si.act({ op: 'bad', a1: 100 }, function (e) {
      assert.equal(e.code, 'act_not_found')

      // default is not an object
      si.act({ op: 'bad', a1: 100, default$: 'qaz' }, function (e) {
        assert.equal(e.code, 'act_default_bad')

        si.act(null, function (e) {
          assert.equal(e.code, 'act_not_found')
          done()
        })
      })
    })
  })

  it('action-default', function (done) {
    var si = Seneca(testopts).error(done)

    si.act({ op: 'bad', a1: 100, default$: { a: 1 } }, function (err, out) {
      assert.equal(err, null)
      expect(out.a).equal(1)

      si.add('a:0', function (m, r) {
        this.prior(m, r)
      })

      si.act('a:0,default$:{y:2}', function (e, o) {
        assert.equal(null, e)
        expect(o.y).equal(2)

        si.add('a:0', function (m, r) {
          this.prior(m, r)
        })

        si.act('a:0,default$:{y:3}', function (e, o) {
          assert.equal(null, e)
          expect(o.y).equal(3)

          done()
        })
      })
    })
  })

  it('action-override', function (fin) {
    var si = Seneca(testopts).error(fin)

    var trace = (meta) =>
      Seneca.util
        .flatten(meta.trace, 'trace')
        .map((x) => x.desc[Common.TRACE_ACTION]) // meta.action
        .toString()

    function foo(msg, reply, meta) {
      reply(null, { a: msg.a, s: this.toString(), foo: meta })
    }

    function bar(msg, reply, meta) {
      var bar_meta = meta
      var pmsg = { a: msg.a, s: msg.s }
      this.prior(pmsg, function (e, o) {
        o.b = 2
        o.bar = bar_meta
        reply(e, o)
      })
    }

    function zed(msg, reply, meta) {
      var zed_meta = meta
      //msg.z = 3
      var pmsg = { z: 3, a: msg.a, s: msg.s }
      this.prior(pmsg, function (e, o) {
        o.z = 3
        o.zed = zed_meta
        reply(e, o)
      })
    }

    si.ready(function () {
      si.add({ op: 'foo' }, foo)

      si.act('op:foo,a:1,i:1', function (e, o, m) {
        assert.ok(Gex('1~Seneca/*' + '/*').on('' + o.a + '~' + o.s))
        assert.ok(!o.foo.prior)
        assert.ok(m.action.match(/foo/))

        si.add({ op: 'foo' }, bar)

        si.act('op:foo,a:1,i:2', function (e, o, m) {
          assert.ok(
            Gex('1~2~Seneca/*' + '/*').on('' + o.a + '~' + o.b + '~' + o.s),
          )
          assert.ok(!o.bar.prior)
          assert.ok(m.action.match(/bar/))

          if (!this.options().prior.direct) {
            assert.ok(o.foo.prior)
            assert.ok(trace(m).match(/foo/))
          }

          si.add({ op: 'foo' }, zed)
          si.act('op:foo,a:1,i:3', function (e, o, m) {
            assert.ok(
              Gex('1~2~3~Seneca/*' + '/*').on(
                '' + o.a + '~' + o.b + '~' + o.z + '~' + o.s,
              ),
            )

            assert.ok(m.action.match(/zed/))

            if (!this.options().prior.direct) {
              assert.ok(!o.zed.prior)
              assert.ok(o.bar.prior)
              assert.ok(o.foo.prior)
              assert.ok(trace(m).match(/bar.*foo/))
            }

            fin()
          })
        })
      })
    })
  })

  it('action-callback-args', function (fin) {
    var si = Seneca(testopts).test(fin)

    function foo(msg, reply) {
      reply.apply(null, msg.items)
    }
    si.add({ op: 'foo' }, foo)

    var items = [null, { one: 1 }, { two: 2 }, { three: 3 }]
    si.act('op:foo', { items: items }, function () {
      assert.equal(arguments.length, 3)
      fin()
    })
  })

  it('action-extend', function (fin) {
    var si = Seneca(testopts).test(fin)

    si.options({ strict: { add: false } })

    function foo(msg, next, meta) {
      next(null, { a: msg.a, s: this.toString(), foo: meta })
    }

    function bar(msg, next, meta) {
      var bar_meta = meta
      var pmsg = { a: msg.a, s: msg.s }

      this.prior(pmsg, function (e, o) {
        o.b = 2
        o.bar = bar_meta
        next(e, o)
      })
    }

    function zed(msg, next, meta) {
      var zed_meta = meta
      msg.z = 3
      this.prior(msg, function (e, o) {
        o.z = 3
        o.zed = zed_meta
        next(e, o)
      })
    }

    si.ready(function () {
      si.add({ op: 'foo' }, foo)
      si.add({ op: 'foo', a: 1 }, bar)
      si.add({ op: 'foo', a: 1, b: 2 }, zed)

      si.act('op:foo,a:1', function (err, o) {
        assert.ok(!err)
        assert.ok(Gex('1~Seneca/*' + '/*').on('' + o.a + '~' + o.s))

        if (!this.options().prior.direct) {
          assert.ok(o.foo.prior)
          assert.ok(!o.bar.prior)
        }

        si.act('op:foo,a:1,b:2', function (err, o) {
          assert.ok(!err)
          assert.ok(
            Gex('1~2~Seneca/*' + '/*').on('' + o.a + '~' + o.b + '~' + o.s),
          )

          if (!this.options().prior.direct) {
            assert.ok(o.foo.prior)
            assert.ok(o.bar.prior)
            assert.ok(!o.zed.prior)
          }

          fin()
        })
      })
    })
  })

  it('prior-nocache', function (done) {
    var si = Seneca({ log: 'test', errhandler: done, trace: { act: false } })
    var count = 0
    var called = ''

    si.ready(function () {
      si.add('foo:a', function (msg, reply, meta) {
        count++
        count += msg.x
        reply(null, { count: count })
      })

      si.add('foo:a', function (msg, reply, meta) {
        count += msg.y
        msg.z = 1
        this.prior(msg, reply)
      })

      si.gate()
        .act('foo:a,x:10,y:0.1', function (err) {
          assert.equal(err, null)
          assert.equal(11.1, count)
          called += 'A'
        })
        .act('foo:a,x:100,y:0.01', function (err) {
          assert.equal(err, null)
          assert.equal(112.11, count)
          called += 'B'
        })
        .act('foo:a,x:10,y:0.1', function (err) {
          assert.equal(err, null)
          assert.equal(123.21, count)
          called += 'C'
        })
        .act('foo:a,x:100,y:0.01', function (err) {
          assert.equal(err, null)
          assert.equal(224.22, count)
          called += 'D'
        })
        .ready(function () {
          assert.equal('ABCD', called)
          assert.equal(224.22, count)

          this.add('foo:a', function (msg, reply, meta) {
            count += msg.z
            this.prior(msg, reply)
          })
            .gate()
            .act('foo:a,x:10,y:0.1,z:1000000', function (err) {
              assert.equal(err, null)
              assert.equal(1000235.32, count)
              called += 'E'
            })
            .ready(function () {
              assert.equal('ABCDE', called)
              done()
            })
        })
    })
  })

  it('gating', function (done) {
    var si = Seneca({ log: 'silent', errhandler: done })
    var count = 0
    var called = ''

    si.add('foo:a', function (args, done) {
      count++
      count += args.x
      done(null, { count: count })
    })

    si.gate()
      .act('foo:a,x:10', function (err) {
        assert.equal(err, null)
        assert.equal(11, count)
        called += 'A'
      })
      .act('foo:a,x:100', function (err) {
        assert.equal(err, null)
        assert.equal(112, count)
        called += 'B'
      })
      .act('foo:a,x:1000', function (err) {
        assert.equal(err, null)
        assert.equal(1113, count)
        called += 'C'
      })
      .ready(function () {
        assert.equal('ABC', called)
        assert.equal(1113, count)
        done()
      })
  })


  it('loading-plugins', function (done) {
    var si = Seneca().test()

    function Mock1() {
      var self = this
      self.name = 'mock1'
      self.plugin = function () {
        return self
      }
      self.define = function () {
        this.add({ role: self.name, cmd: 'foo' }, function (msg, cb) {
          cb(null, { x: 'foo:' + msg.foo })
        })
      }
    }

    si = Seneca(testopts)
    si.use(new Mock1())

    si.act({ role: 'mock1', cmd: 'foo', foo: 1 }, function (err, out) {
      assert.equal(err, null)
      assert.equal('foo:1', out.x)
    })

    si = Seneca(testopts)
    var mock1a = new Mock1()
    mock1a.name = 'mock1a'
    si.use(mock1a)
    si.act({ role: 'mock1a', cmd: 'foo', foo: 1 }, function (err, out) {
      assert.equal(err, null)
      assert.equal('foo:1', out.x)
    })

    function Mock2() {
      var self = this
      self.name = 'mock2'
      self.plugin = function () {
        return self
      }
      self.define = function () {
        this.add({ role: 'mock1', cmd: 'foo' }, function (msg, cb) {
          this.prior(msg, function (err, out) {
            assert.equal(err, null)
            cb(null, { x: 'bar:' + out.x })
          })
        })
      }
    }

    si = Seneca(testopts)
    si.use(new Mock1())
    si.use(new Mock2())

    si.act({ role: 'mock1', cmd: 'foo', foo: 2 }, function (err, out) {
      assert.equal(err, null)
      assert.equal('bar:foo:2', out.x)
    })

    si.ready(done)
  })

  it('fire-and-forget', function (done) {
    var si = Seneca({ log: 'silent' })
    si.add({ a: 1 }, function (msg, cb) {
      cb(null, msg.a + 1)
    })
    si.add({ a: 1, b: 2 }, function (msg, cb) {
      cb(null, msg.a + msg.b)
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

  it('strargs', function (done) {
    var si = Seneca({ strict: { result: false } })
      .test(done)
      .add({ a: 1, b: 2 }, function (args, cb) {
        cb(null, (args.c || -1) + parseInt(args.b, 10) + parseInt(args.a, 10))
      })

    si.act({ a: 1, b: 2, c: 3 }, function (err, out) {
      assert.ok(!err)
      assert.equal(6, out)

      si.act('a:1,b:2,c:3', function (err, out) {
        assert.ok(!err)
        assert.equal(6, out)

        si.act('a:1,b:2', function (err, out) {
          assert.ok(!err)
          assert.equal(2, out)

          try {
            si.add('a::2', function (args, cb) {
              cb()
            })
          } catch (e) {
            assert.equal(e.code, 'add_string_pattern_syntax')

            try {
              si.act('a::2', { c: 3 }, function () {
                assert.fail()
              })
            } catch (e) {
              assert.equal(e.code, 'msg_jsonic_syntax')

              try {
                si.add('a:1,b:2', 'bad-arg', function (args, cb) {
                  cb()
                })
              } catch (e) {
                assert.ok(e.message.match(/norma:/))

                try {
                  si.add(123, function (args, cb) {
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

  it('string-add', function (done) {
    var addFunction = function (args, done) {
      done(null, {
        v: (args.c || -1) + parseInt(args.b, 10) + parseInt(args.a, 10),
      })
    }

    var checkFunction = function (err, out, done) {
      assert.equal(err, null)
      assert.equal(6, out.v)
      done()
    }

    var si = Seneca({ legacy: { rules: true } }).test(done) //(testopts).error(done)

    si.add('i:0,a:1,b:2', addFunction)

    si.act('i:0,a:1,b:2,c:3', function (err, out) {
      checkFunction(err, out, function () {
        si.add('i:1,a:1', { b: 2 }, addFunction).act(
          'i:1,a:1,b:2,c:3',
          function (err, out) {
            checkFunction(err, out, function () {
              si.add(
                'i:2,a:1',
                { b: 2, c: { required$: true } },
                addFunction,
              ).act('i:2,a:1,b:2,c:3', function (err, out) {
                checkFunction(err, out, done)
              })
            })
          },
        )
      })
    })
  })

  it('fix-basic', function (done) {
    var si = Seneca(testopts)

    function ab(args, cb) {
      cb(null, { r: '' + args.a + (args.b || '-') + (args.c || '-') + args.z })
    }

    si.fix('a:1')
      .add('b:2', ab)
      .add('c:3', ab)
      .act('b:2,z:8', function (err, out) {
        assert.equal(err, null)
        assert.equal('12-8', out.r)
      })
      .act('c:3,z:9', function (err, out) {
        assert.equal(err, null)
        assert.equal('1-39', out.r)
      })

    si.act('a:1,b:2,z:8', function (err, out) {
      assert.equal(err, null)
      assert.equal('12-8', out.r)
    }).act('a:1,c:3,z:9', function (err, out) {
      assert.equal(err, null)
      assert.equal('1-39', out.r)
    })

    done()
  })

  it('act-history', function (fin) {
    var si = Seneca().test(fin).use('entity')

    var x = 0

    si.add({ a: 1 }, function (msg, reply) {
      x++
      reply({ x: x })
    })

    si.act({ a: 1 }, function (err, out) {
      assert.ok(!err)
      assert.equal(1, out.x)
    })

    si.act({ id$: 'a/B', a: 1 }, function (err, out) {
      assert.ok(!err)
      assert.equal(2, out.x)

      si.act({ a: 1 }, function (err, out) {
        assert.ok(!err)
        assert.equal(3, out.x)

        si.act({ id$: 'a/B', a: 1 }, function (err, out) {
          assert.ok(!err)
          assert.equal(2, out.x)

          si.act('role:seneca,cmd:stats', function (err, stats) {
            assert.ok(!err)
            // --seneca.log.all and count INs
            // ... | grep act | grep IN | wc -l
            // sensitive to changes in plugin init and internal action calls
            assert.equal(
              '{ calls: 8, done: 8, fails: 0, cache: 1 }',
              Util.inspect(stats.act),
            )
            fin()
          })
        })
      })
    })
  })

  it('wrap', function (fin) {
    var si = Seneca({ legacy: { transport: false } }).test(fin)

    si.add('a:1', function a1(msg, reply, meta) {
      reply(null, { aa: msg.aa })
    })
    si.add('b:2', function b2(msg, reply, meta) {
      reply(null, { bb: msg.bb })
    })
    si.add('a:1,c:3', function a1c3(msg, reply, meta) {
      reply(null, { cc: msg.cc })
    })
    si.add('a:1,d:4', function a1d4(msg, reply, meta) {
      reply(null, { dd: msg.dd })
    })

    si.wrap('a:1', function first(msg, reply) {
      this.prior(msg, function (err, out) {
        out.X = 1
        reply(err, out)
      })
    })

    function assertDefName(name, pattern) {
      var def = si.find(pattern)
      assert.equal(name, def.func.name)
    }

    assertDefName('first', 'a:1')

    // existence predicate!! d must exist
    si.wrap('a:1,d:*', function second(msg, reply) {
      this.prior(msg, function (err, out) {
        out.DD = 44
        reply(err, out)
      })
    })

    assertDefName('second', 'a:1,d:4')

    //console.dir(si.find('a:1'),{depth:null})
    //console.dir(si.find('a:1,d:4'),{depth:null})

    si.act('a:1,aa:1', function (err, out) {
      expect(out).contains({ aa: 1, X: 1 })

      si.act('a:1,c:3,cc:3', function (err, out) {
        expect(out).contains({ cc: 3, X: 1 })

        si.act('a:1,d:4,dd:4', function (err, out) {
          expect(out).contains({ dd: 4, X: 1, DD: 44 })

          si.act('b:2,bb:2', function (err, out) {
            expect(out).contains({ bb: 2 })

            si.wrap('', function (msg, reply, meta) {
              this.prior(msg, function (err, out) {
                out.ALL = 2
                reply(err, out)
              })
            })

            si.act('a:1,aa:1', function (err, out) {
              expect(out).contains({ aa: 1, X: 1, ALL: 2 })

              si.act('a:1,c:3,cc:3', function (err, out) {
                expect(out).contains({ cc: 3, X: 1, ALL: 2 })

                si.act('a:1,d:4,dd:4', function (err, out) {
                  expect(out).contains({ dd: 4, X: 1, DD: 44, ALL: 2 })

                  si.act('b:2,bb:2', function (err, out) {
                    expect(out).contains({ bb: 2, ALL: 2 })
                    fin()
                  })
                })
              })
            })
          })
        })
      })
    })
  })

  it('wrap-priors', async () => {
    let s0 = Seneca({ tag: 'wrap-priors', legacy: false })
      .test()
      .use('promisify')
      .use('entity')
    await s0.ready()

    s0.message('foo:1', async function (msg) {
      return { x: msg.x, w: msg.w }
    })

    // TODO add seneca-promisify support
    s0.wrap('foo:1', function (msg, reply) {
      msg.w++
      this.prior(msg, reply)
    })

    let o0 = await s0.post('foo:1,x:22,w:1')
    expect(o0).equal({ x: 22, w: 2 })

    s0.message('bar:1,zed:1', async function (msg) {
      return { x: msg.x, w: msg.w }
    })

    s0.message('bar:1,zed:2', async function (msg) {
      return { y: msg.y, w: msg.w }
    })

    s0.wrap('bar:1', function (msg, reply) {
      msg.w++
      this.prior(msg, reply)
    })

    let o1 = await s0.post('bar:1,zed:1,x:22,w:1')
    expect(o1).equal({ x: 22, w: 2 })

    let o2 = await s0.post('bar:1,zed:2,y:33,w:1')
    expect(o2).equal({ y: 33, w: 2 })

    s0.message('qaz:1', async function qaz1(msg) {
      return { z: msg.z, w: msg.w }
    })

    s0.message('qaz:1,bez:2', async function qaz1bez1(msg) {
      let out = await this.prior(msg)
      out.w++
      return out
    })

    let o3 = await s0.post('qaz:1,z:11,w:1')
    expect(o3).equal({ z: 11, w: 1 })

    let o4 = await s0.post('qaz:1,bez:2,z:22,w:1')
    expect(o4).equal({ z: 22, w: 2 })

    s0.wrap('qaz:1', function wrap_qaz1(msg, reply) {
      msg.w *= 10
      this.prior(msg, reply)
    })

    let o5 = await s0.post('qaz:1,z:33,w:1')
    expect(o5).equal({ z: 33, w: 10 })

    let o6 = await s0.post('qaz:1,bez:2,z:44,w:1')
    expect(o6).equal({ z: 44, w: 11 })
  })

  it('meta', function (fin) {
    var si = Seneca().test(fin)
    var tmp = {}

    si.add('a:1', function (msg, reply, meta) {
      tmp.a = meta
      reply({ aa: msg.aa })
    })

    si.add('b:2', function (msg, reply, meta) {
      tmp.b = meta
      reply({ bb: msg.bb })
    })

    si.act('a:1', function (err, out, meta) {
      expect(err).not.exist()
      expect(meta.pattern).equal('a:1')

      si.act('b:2', function (err, out, meta) {
        expect(err).not.exist()
        expect(meta.pattern).equal('b:2')

        expect(tmp.a.pattern).equal('a:1')
        expect(tmp.b.pattern).equal('b:2')

        fin()
      })
    })
  })

  it('strict-result', function (fin) {
    var si = Seneca({ log: 'silent', legacy: { transport: false } })

    si.add('a:1', function (msg, reply) {
      reply('a')
    }).act('a:1', function (err) {
      assert.ok(err)
      assert.equal('result_not_objarr', err.code)

      si.options({ strict: { result: false } })
      si.act('a:1', function (err, out) {
        assert.ok(!err)
        assert.equal('a', out)
        fin()
      })
    })
  })

  it('add-noop', function (done) {
    var si = Seneca({ log: 'silent' })
      .error(done)
      .add('a:1')
      .act('a:1', function (e, o) {
        assert.equal(null, o)

        // use si to avoid act_loop error
        si.act('a:1,default$:{x:1}', function (e, o) {
          assert.equal(1, o.x)
          done()
        })
      })
  })

  it('decorate-basic', async ()=> {
    const si = Seneca().test().quiet()
    si.decorate('foo', function () {
      expect(this === si)
      return 'bar'
    })

    expect(si.foo()).equals('bar')
  })

  it('decorate-core-property', async ()=> {
    const si = Seneca().test().quiet()
    expect(()=>si.decorate('add',()=>{}))
      .throws('seneca: Decoration overrides core property:add')
  })

  it('decorate-overwrite', async ()=>{
    const si = Seneca().test().quiet()
    si.decorate('foo', ()=>{})
    expect(()=>si.decorate('foo',()=>{}))
      .throws('seneca: Decoration already exists: foo')
  })

  it('decorate-underscore-prefix', async ()=>{
    const si = Seneca().test().quiet()
    expect(()=>si.decorate('_use'))
      .throws('seneca: Decorate property cannot start with underscore (was _use)')
  })

  it('supports jsonic params to has', function (done) {
    var si = Seneca({ log: 'silent' })
    si.add({ cmd: 'a' }, function (msg, done) {
      done(null, {})
    })

    assert(si.has({ cmd: 'a' }))
    assert(si.has('cmd:a'))

    done()
  })

  it('add-handle', function (done) {
    var si = Seneca({ log: 'silent' }).error(done)
    var fm = {}

    var i0 = function i0(msg, done) {
      msg.z = 1
      var f = fm[msg.b]

      f.call(this, msg, done)
    }

    i0.handle = function (actdef) {
      fm[actdef.raw.b$] = actdef.func
    }

    si.add('a:1', i0)

    si.add('a:1,b$:1', function b1(msg, done) {
      done(null, { z: msg.z, b: 1 })
    })

    si.add('a:1,b$:2', function b2(msg, done) {
      done(null, { z: msg.z, b: 2 })
    })

    si.act('a:1,b:1', function (e, o) {
      assert.equal(1, o.b)

      si.act('a:1,b:2', function (e, o) {
        assert.equal(2, o.b)

        done()
      })
    })
  })

  it('supports a function to trace actions', function (done) {
    var seneca = Seneca({ log: 'silent', trace: { act: () => {} } })
    seneca.add({ a: 1 }, function (args, cb) {
      cb(null, { b: 2 })
    })
    seneca.act({ a: 1 }, function (err, out) {
      expect(err).to.not.exist()
      assert.equal(out.b, 2)
      done()
    })
  })

  it('supports true to be passed as trace action option', function (done) {
    var stdout = process.stdout.write
    process.stdout.write = () => {}

    var seneca = Seneca({ log: 'silent', trace: { act: true } })
    seneca.add({ a: 1 }, function (args, cb) {
      cb(null, { b: 2 })
    })
    seneca.act({ a: 1 }, function (err, out) {
      expect(err).to.not.exist()
      assert.equal(out.b, 2)
      process.stdout.write = stdout
      done()
    })
  })

  it('strict-find-false', function (fin) {
    var seneca = Seneca({ strict: { find: false } }).test(fin)
    seneca.act({ a: 1 }, function (err, out) {
      expect(err).not.exist()
      expect(out).object()
      fin()
    })
  })

  it('strict-find-true', function (fin) {
    var seneca = Seneca({ log: 'silent', strict: { find: true } })
    seneca.act({ a: 1 }, function (err, out) {
      expect(err).to.exist()
      expect(out).to.not.exist()
      fin()
    })
  })

  it('strict-find-default', function (fin) {
    var seneca = Seneca({ strict: { find: false } }).test(fin)
    seneca.act({ a: 1, default$: { foo: 'bar' } }, function (err, out) {
      expect(err).to.not.exist()
      expect(out).contains({ foo: 'bar' })
      fin()
    })
  })

  // Confirms fix for https://github.com/senecajs/seneca/issues/375
  it('catchall-pattern', function (done) {
    var seneca = Seneca({ log: 'test' }).error(done)

    seneca
      .add('', function (msg, done) {
        done(null, { r: 1 })
      })
      .add('a:1', function (msg, done) {
        done(null, { x: 1 })
      })
      .add('b:1,c:1', function (msg, done) {
        done(null, { z: 1 })
      })
      // Execute following actions sequentially, so that
      // .ready(done) will wait for them to complete
      .gate()
      .act('', function (ignored, out) {
        expect(out.r).to.equal(1)
      })
      .act('k:1', function (ignored, out) {
        expect(out.r).to.equal(1)
      })
      .act('a:1', function (ignored, out) {
        expect(out.x).to.equal(1)
      })
      .act('a:2', function (ignored, out) {
        expect(out.r).to.equal(1)
      })
      // Hits the catchall, even though b:1 is a partial pattern
      .act('b:1', function (ignored, out) {
        expect(out.r).to.equal(1)
      })
      .act('b:2', function (ignored, out) {
        expect(out.r).to.equal(1)
      })
      .act('c:1', function (ignored, out) {
        expect(out.r).to.equal(1)
      })
      .act('c:2', function (ignored, out) {
        expect(out.r).to.equal(1)
      })
      .act('b:1,c:1', function (ignored, out) {
        expect(out.z).to.equal(1)
      })
      .act('b:2,c:1', function (ignored, out) {
        expect(out.r).to.equal(1)
      })
      // Hits the catchall, even though b:1 is a partial pattern
      .act('b:1,c:2', function (ignored, out) {
        expect(out.r).to.equal(1)
      })
      .ungate()
      .ready(done)
  })

  it('memory', { timeout: 2222 * tmx }, function (done) {
    var SIZE = 1000

    Seneca({ log: 'silent' })
      .error(done)
      .add('a:1', function (msg, done) {
        done(null, { x: msg.x })
      })
      .ready(function () {
        var start = Date.now()
        var count = 0

        for (var i = 0; i < SIZE; ++i) {
          this.act('a:1', { x: i }, function () {
            ++count

            if (SIZE === count) validate(start)
          })
        }
      })

    function validate(start) {
      var end = Date.now()
      expect(end - start).below(1500 * tmx)

      var mem = process.memoryUsage()
      expect(mem.rss).below(444444444)

      done()
    }
  })

  it('use-shortcut', function (fin) {
    Seneca.use(function () {
      this.add('a:1', function (msg, reply, meta) {
        reply({ x: 1 })
      })
    })
      .test(fin)
      .act('a:1', function (err, out) {
        expect(err).equal(null)
        expect(out.x).equal(1)
        fin()
      })
  })

  it('status-log', function (fin) {
    var seen = false
    var si = Seneca({
      status: { interval: 100, running: true },
      internal: {
        logger: {
          preload: function () {
            return {
              extend: {
                logger: function () {
                  if (!seen && si) {
                    si.options().status.running = false
                    seen = true
                    fin()
                  }
                },
              },
            }
          },
        },
      },
    })
  })

  it('reply-seneca', function (fin) {
    Seneca()
      .test(fin)
      .add('a:1', function A1(msg, reply) {
        reply({ sid: reply.seneca.id })
      })
      .add('b:1', function B1(msg, reply) {
        // console.log('REPLY B1', msg, reply)
        msg.id1 = reply.seneca.id
        reply(msg)
      })
      .add('b:1', function B2(msg, reply) {
        // console.log('REPLY B2', msg, reply)
        msg.id0 = reply.seneca.id
        this.prior(msg, reply)
      })
      .gate()
      .act('a:1', function (ignore, out) {
        expect(this.id).equal(out.sid)
      })
      .act('b:1', function (ignore, out) {
        expect(this.id).equal(out.id0)
        expect(this.id).equal(out.id1)
      })
      .ready(fin)
  })

  it('pattern-types', function (fin) {
    Seneca()
      .test(fin)
      // Just the value types from json.org, excluding object and array

      .add({ s: 's' }, function (msg, reply) {
        reply({ s: msg.s })
      })
      .add({ i: 1 }, function (msg, reply) {
        reply({ i: msg.i })
      })
      .add({ f: 1.1 }, function (msg, reply) {
        reply({ f: msg.f })
      })
      .add({ bt: true }, function (msg, reply) {
        reply({ bt: msg.bt })
      })
      .add({ bf: false }, function (msg, reply) {
        reply({ bf: msg.bf })
      })
      .add({ n: null }, function (msg, reply) {
        reply({ n: msg.n })
      })
      .gate()
      .act({ s: 's' }, function (ignore, out) {
        expect(Util.inspect(out)).equal("{ s: 's' }")
      })
      .act({ i: 1 }, function (ignore, out) {
        expect(Util.inspect(out)).equal('{ i: 1 }')
      })
      .act({ f: 1.1 }, function (ignore, out) {
        expect(Util.inspect(out)).equal('{ f: 1.1 }')
      })
      .act({ bt: true }, function (ignore, out) {
        expect(Util.inspect(out)).equal('{ bt: true }')
      })
      .act({ bf: false }, function (ignore, out) {
        expect(Util.inspect(out)).equal('{ bf: false }')
      })
      .act({ n: null }, function (ignore, out) {
        expect(Util.inspect(out)).equal('{ n: null }')
      })
      .ready(fin)
  })

  it('order', function (fin) {
    var si = Seneca().test(fin)

    expect(si.order.plugin).exists()
    expect(si.order.plugin.task).exists()

    fin()
  })
})
