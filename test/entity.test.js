/* Copyright (c) 2013 Richard Rodger */
'use strict'

// mocha entity.test.js

var Util = require('util')
var Assert = require('assert')
var _ = require('lodash')
var Async = require('async')
var Gex = require('gex')
var Lab = require('lab')
var Seneca = require('..')

var lab = exports.lab = Lab.script()
var describe = lab.describe
var it = lab.it
var assert = Assert
var testopts = { log: 'silent' }


describe('entity', function () {
  it('happy-mem', function (done) {
    var si = Seneca(testopts)
    si.use('entity')
    si.options({errhandler: done})

    var fooent = si.make$('foo')
    assert.ok(fooent.is$('foo'))
    assert.ok(!fooent.is$('bar'))

    fooent.data$({a: 1, b: 2}).save$(function (err, out) {
      assert.equal(err, null)
      assert.ok(out.id)
      assert.equal(1, out.a)
      assert.equal(2, out.b)

      si.close(done)
    })
  })

  it('setid-mem', function (done) {
    var si = Seneca(testopts)
    si.use('entity')

    var z0 = si.make('zed')
    z0.id$ = 0
    z0.z = 0
    z0.save$(function (e, z) {
      assert.equal(0, z.id)
      assert.equal(0, z.z)

      si.make('zed', {id$: 1, z: 1}).save$(function (e, z) {
        assert.equal(1, z.id)
        assert.equal(1, z.z)

        si.make('zed').data$({id$: 2, z: 2}).save$(function (e, z) {
          assert.equal(2, z.id)
          assert.equal(2, z.z)

          si.close(done)
        })
      })
    })
  })

  it('mem-ops', function (done) {
    var si = Seneca(testopts)
    si.use('entity')
    si.options({
      errhandler: function (err) { err && done(err); return true }
    })

    var fooent = si.make$('foo')

    fooent.load$(function (err, out) {
      assert.equal(err, null)
      assert.equal(out, null)

      fooent.load$('', function (err, out) {
        assert.equal(err, null)
        assert.equal(out, null)

        fooent.remove$(function (err, out) {
          assert.equal(err, null)
          assert.equal(out, null)

          fooent.remove$('', function (err, out) {
            assert.equal(err, null)
            assert.equal(out, null)

            fooent.list$(function (err, list) {
              assert.equal(err, null)
              assert.equal(0, list.length)

              fooent.list$({a: 1}, function (err, list) {
                assert.equal(err, null)
                assert.equal(0, list.length)

                fooent.make$({a: 1}).save$(function (err, foo1) {
                  assert.equal(err, null)
                  assert.ok(foo1.id)
                  assert.equal(1, foo1.a)

                  fooent.list$(function (err, list) {
                    assert.equal(err, null)
                    assert.equal(1, list.length)
                    assert.equal(foo1.id, list[0].id)
                    assert.equal(foo1.a, list[0].a)
                    assert.equal('' + foo1, '' + list[0])

                    fooent.list$({a: 1}, function (err, list) {
                      assert.equal(err, null)
                      assert.equal(1, list.length)
                      assert.equal(foo1.id, list[0].id)
                      assert.equal(foo1.a, list[0].a)
                      assert.equal('' + foo1, '' + list[0])

                      fooent.load$(foo1.id, function (err, foo11) {
                        assert.equal(err, null)
                        assert.equal(foo1.id, foo11.id)
                        assert.equal(foo1.a, foo11.a)
                        assert.equal('' + foo1, '' + foo11)

                        foo11.a = 2
                        foo11.save$(function (err, foo111) {
                          assert.equal(err, null)
                          assert.equal(foo11.id, foo111.id)
                          assert.equal(2, foo111.a)

                          fooent.list$(function (err, list) {
                            assert.equal(err, null)
                            assert.equal(1, list.length)
                            assert.equal(foo1.id, list[0].id)
                            assert.equal(2, list[0].a)
                            assert.equal('' + foo111, '' + list[0])

                            fooent.list$({a: 2}, function (err, list) {
                              assert.equal(err, null)
                              assert.equal(1, list.length)
                              assert.equal(foo1.id, list[0].id)
                              assert.equal(2, list[0].a)
                              assert.equal('' + foo111, '' + list[0])

                              list[0].remove$(function (err) {
                                assert.equal(err, null)
                                fooent.list$(function (err, list) {
                                  assert.equal(err, null)
                                  assert.equal(0, list.length)

                                  fooent.list$({a: 2}, function (err, list) {
                                    assert.equal(err, null)
                                    assert.equal(0, list.length)

                                    fooent.make$({b: 1}).save$(function () {
                                      fooent.make$({b: 2}).save$(function () {
                                        fooent.list$(function (err, list) {
                                          assert.equal(err, null)
                                          assert.equal(2, list.length)

                                          fooent.list$({b: 1}, function (err, list) {
                                            assert.equal(err, null)
                                            assert.equal(1, list.length)

                                            si.close(done)
                                          }) }) }) }) }) }) }) }) }) }) }) }) }) }) }) }) }) }) }) })
  })

  it('parsecanon', function (done) {
    var si = Seneca(testopts)
    si.use('entity')
    function def (v, d) { return v == null ? d : v }
    function fmt (cn) { return def(cn.zone, '-') + '/' + def(cn.base, '-') + '/' + def(cn.name, '-') }

    assert.equal('-/-/n1', fmt(si.util.parsecanon('n1')))
    assert.equal('-/b1/n1', fmt(si.util.parsecanon('b1/n1')))
    assert.equal('z1/b1/n1', fmt(si.util.parsecanon('z1/b1/n1')))

    assert.equal('-/-/-', fmt(si.util.parsecanon('-')))
    assert.equal('-/-/-', fmt(si.util.parsecanon('-/-')))
    assert.equal('-/-/-', fmt(si.util.parsecanon('-/-/-')))
    assert.equal('-/-/0', fmt(si.util.parsecanon('0')))
    assert.equal('-/0/0', fmt(si.util.parsecanon('0/0')))
    assert.equal('0/0/0', fmt(si.util.parsecanon('0/0/0')))

    var fail
    try {
      si.util.parsecanon('')
      fail = ''
    }
    catch (e) {
      assert.equal('invalid_canon', e.code)
    }

    try {
      si.util.parsecanon('?')
      fail = '?'
    }
    catch (e) {
      assert.equal('invalid_canon', e.code)
    }

    assert.equal(fail, void 0, fail)

    var foo = si.make$('foo')
    assert.equal('a/b/c', fmt(foo.canon$({parse: 'a/b/c'})))
    si.close(done)
  })

  it('make', function (done) {
    var si = Seneca(testopts)
    si.use('entity')

    var foo = si.make$('foo')
    assert.equal('-/-/foo', foo.entity$)
    assert.equal('-/-/foo', foo.canon$())
    assert.equal('-/-/foo', foo.canon$({string: true}))
    assert.equal('$-/-/foo', foo.canon$({string$: true}))
    assert.equal(',,foo', '' + foo.canon$({array: true}))
    assert.equal(',,foo', '' + foo.canon$({array$: true}))
    assert.equal("{ zone: undefined, base: undefined, name: 'foo' }", Util.inspect(foo.canon$({object: true})))
    assert.equal("{ 'zone$': undefined, 'base$': undefined, 'name$': 'foo' }", Util.inspect(foo.canon$({object$: true})))
    assert.equal(',,foo', '' + foo.canon$({}))

    var b1_n1 = si.make$('b1/n1')
    assert.equal('-/b1/n1', b1_n1.entity$)
    var z1_b1_n1 = si.make$('z1/b1/n1')
    assert.equal('z1/b1/n1', z1_b1_n1.entity$)

    var pe = si.make({entity$: '-/-/a'})
    assert.equal('-/-/a', pe.canon$({string: true}))
    assert.equal('-/-/a', pe.entity$)
    pe = si.make({entity$: '-/b/a'})
    assert.equal('-/b/a', pe.entity$)
    assert.equal('-/b/a', pe.canon$({string: true}))
    pe = si.make({entity$: 'c/b/a'})
    assert.equal('c/b/a', pe.entity$)
    assert.equal('c/b/a', pe.canon$({string: true}))

    pe = si.make({entity$: {name: 'a'}})
    assert.equal('-/-/a', pe.canon$({string: true}))
    assert.equal('-/-/a', pe.entity$)
    pe = si.make({entity$: {base: 'b', name: 'a'}})
    assert.equal('-/b/a', pe.entity$)
    assert.equal('-/b/a', pe.canon$({string: true}))
    pe = si.make({entity$: {zone: 'c', base: 'b', name: 'a'}})
    assert.equal('c/b/a', pe.entity$)
    assert.equal('c/b/a', pe.canon$({string: true}))

    var ap = si.make$('a', {x: 1})
    assert.equal('-/-/a', ap.entity$)
    ap = si.make$('b', 'a', {x: 1})
    assert.equal('-/b/a', ap.entity$)
    ap = si.make$('c', 'b', 'a', {x: 1})
    assert.equal('c/b/a', ap.entity$)

    var esc1 = si.make$('esc', {x: 1, y_$: 2})
    assert.equal(esc1.toString(), '$-/-/esc;id=;{x:1,y:2}')

    done()
  })

  it('toString', function (done) {
    var si = Seneca(testopts)
    si.use('entity')

    var f1 = si.make$('foo')
    f1.a = 1
    assert.equal('$-/-/foo;id=;{a:1}', '' + f1)

    var f2 = si.make$('foo')
    f2.a = 2
    f2.b = 3
    assert.equal('$-/-/foo;id=;{a:2,b:3}', '' + f2)

    var f3 = f1.make$({c: 4})
    f3.d = 5
    assert.equal('$-/-/foo;id=;{c:4,d:5}', '' + f3)
    done()

    si = Seneca(_.extend(testopts, {entity: {hide: {
      'foo': {a: true, b: true},
      'bar': ['c', 'd']
    }}}))

    si.use('entity')

    assert.equal('$-/-/foo;id=;{c:3,d:4}',
      si.make('foo', {a: 1, b: 2, c: 3, d: 4}).toString())

    assert.equal('$-/-/bar;id=;{a:1,b:2}',
      si.make('bar', {a: 1, b: 2, c: 3, d: 4}).toString())
  })

  it('isa', function (done) {
    var si = Seneca(testopts)
    si.use('entity')

    var f1 = si.make$('foo')

    assert.ok(f1.canon$({isa: 'foo'}))
    assert.ok(f1.canon$({isa: [null, null, 'foo']}))
    assert.ok(f1.canon$({isa: {name: 'foo'}}))

    assert.ok(!f1.canon$({isa: 'bar'}))
    assert.ok(!f1.canon$({isa: [null, null, 'bar']}))
    assert.ok(!f1.canon$({isa: {name: 'bar'}}))

    var f2 = si.make$('boo/foo')

    assert.ok(f2.canon$({isa: 'boo/foo'}))
    assert.ok(f2.canon$({isa: [null, 'boo', 'foo']}))
    assert.ok(f2.canon$({isa: {base: 'boo', name: 'foo'}}))

    assert.ok(!f2.canon$({isa: 'far/bar'}))
    assert.ok(!f2.canon$({isa: [null, 'far', 'bar']}))
    assert.ok(!f2.canon$({isa: {base: 'far', name: 'bar'}}))

    var f3 = si.make$('zoo/boo/foo')

    assert.ok(f3.canon$({isa: 'zoo/boo/foo'}))
    assert.ok(f3.canon$({isa: ['zoo', 'boo', 'foo']}))
    assert.ok(f3.canon$({isa: {zone: 'zoo', base: 'boo', name: 'foo'}}))

    assert.ok(!f3.canon$({isa: 'zar/far/bar'}))
    assert.ok(!f3.canon$({isa: ['zar', 'far', 'bar']}))
    assert.ok(!f3.canon$({isa: {zone: 'zar', base: 'far', name: 'bar'}}))

    done()
  })

  it('mem-store-import-export', function (done) {
    var si = Seneca(testopts)
    si.use('entity')

    // NOTE: zone is NOT saved! by design!

    var x1, x2, x3

    Async.series([
      function (next) { si.make$('a', {x: 1}).save$(function (e, o) { x1 = o; next() }) },
      function (next) { si.make$('b', 'a', {x: 2}).save$(function (e, o) { x2 = o; next() }) },
      function (next) { si.make$('c', 'b', 'a', {x: 3}).save$(function (e, o) { x3 = o; next() }) },

      function (next) {
        si.act('role:mem-store,cmd:dump', function (e, o) {
          var t = Gex(
            '{"undefined":{"a":{"*":{"entity$":"-/-/a","x":1,"id":"*"}}},"b":{"a":{"*":{"entity$":"-/b/a","x":2,"id":"*"},"*":{"entity$":"c/b/a","x":3,"id":"*"}}}}'
         ).on(JSON.stringify(o))
          assert.ok(t)
          next(e)
        })
      },

      function (next) {
        si.act('role:mem-store,cmd:export', function (err, out) {
          assert.equal(err, null)

          var si2 = Seneca(testopts)
          si2.use('entity')

          si2.act('role:mem-store,cmd:import', {json: out.json}, function (err) {
            assert.equal(err, null)

            si2.act('role:mem-store,cmd:dump', function (err, o) {
              assert.equal(err, null)
              assert.ok(Gex('{"undefined":{"a":{"*":{"entity$":"-/-/a","x":1,"id":"*"}}},"b":{"a":{"*":{"entity$":"-/b/a","x":2,"id":"*"},"*":{"entity$":"c/b/a","x":3,"id":"*"}}}}').on(JSON.stringify(o)))

              si2.make('a').load$({x: 1}, function (err, nx1) {
                assert.equal(err, null)
                assert.equal('$-/-/a;id=' + x1.id + ';{x:1}', '' + nx1)

                si2.make('a').load$({x: 1}, function (err, nx1) {
                  assert.equal(err, null)
                  assert.equal('$-/-/a;id=' + x1.id + ';{x:1}', '' + nx1)

                  si2.make('b', 'a').load$({x: 2}, function (err, nx2) {
                    assert.equal(err, null)
                    assert.equal('$-/b/a;id=' + x2.id + ';{x:2}', '' + nx2)

                    si2.make('c', 'b', 'a').load$({x: 3}, function (err, nx3) {
                      assert.equal(err, null)
                      assert.equal('$c/b/a;id=' + x3.id + ';{x:3}', '' + nx3)
                      si2.close()

                      next()
                    })
                  })
                })
              })
            })
          })
        })
      }

    ], function (err) {
      si.close()
      done(err)
    }
   )
  })

  it('close', function (done) {
    var si = Seneca(testopts)
    si.use('entity')

    var tmp = {s0: 0, s1: 0, s2: 0}

    function noopcb (args, cb) { cb() }

    si.use(function store0 () {
      this.store.init(this, {}, {
        save: noopcb, load: noopcb, list: noopcb, remove: noopcb, native: noopcb,
        close: function (args, cb) {
          tmp.s0++
          cb()
        }
      })
    })

    si.use(function store1 () {
      this.store.init(this, {}, {
        save: noopcb, load: noopcb, list: noopcb, remove: noopcb, native: noopcb, nick: '11',
        close: function (args, cb) {
          tmp.s1++
          cb()
        }
      })
    })

    si.use(function store2 () {
      this.store.init(this, {map: {'foo': '*'}}, {
        save: noopcb, load: noopcb, list: noopcb, remove: noopcb, native: noopcb, nick: '22',
        close: function (args, cb) {
          tmp.s2++
          cb()
        }
      })
    })

    si.close(function (err) {
      if (err) return done(err)

      // close gets called on all of them
      // any store may have open db connections
      assert.equal(1, tmp.s0)
      assert.equal(1, tmp.s1)
      assert.equal(1, tmp.s2)

      done()
    })
  })


  it('entity.mapping', function (done) {
    var si = Seneca(testopts)

    si.use('mem-store', {map: {'-/-/foo': '*'}})
    si.use('mem-store', {map: {'-/-/bar': '*'}})

    si.ready(function () {
      var plugins = si.plugins()

      assert.ok(!plugins['mem-store/4'])
      assert.ok(plugins['mem-store/3'])
      assert.ok(plugins['mem-store/2'])
      assert.ok(plugins['mem-store/1'])
      assert.ok(!plugins['mem-store/0'])

      // TODO: need to be able to introspect store map

      done()
    })
  })
})
