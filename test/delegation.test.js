/* Copyright (c) 2013-2017 Richard Rodger */
'use strict'


var Assert = require('assert')


var Gex = require('gex')
var Lab = require('lab')
var Seneca = require('..')


var lab = exports.lab = Lab.script()
var describe = lab.describe
var it = lab.it
var assert = Assert
var testopts = { log: 'silent' }


describe('delegation', function () {
  it('happy', function (done) {
    var si = Seneca(testopts)
    si.add({ c: 'C' }, function (args, cb) {
      cb(null, args)
    })
    var sid = si.delegate({ a$: 'A', b: 'B' })

    assert.ok(Gex('Seneca/*.*.*/*').on(si.toString()))
    assert.ok(Gex('Seneca/*.*.*/*/{b:B}').on(sid.toString()))

    si.act({ c: 'C' }, function (err, out) {
      assert.ok(!err)
      assert.ok(out.c === 'C')
      sid.act({ c: 'C' }, function (err, out) {
        assert.ok(!err)
        assert.ok(out.c === 'C')
        assert.ok(out.a$ === 'A')
        assert.ok(out.b === 'B')
        si.close(done)
      })
    })
  })

  it('dynamic', function (done) {
    var si = Seneca(testopts)
    si.add({ c: 'C' }, function (args, cb) {
      cb(null, args)
    })
    si.add({ d: 'D' }, function (args, cb) {
      this.act({ c: 'C', d: 'D' }, cb)
    })
    var sid = si.delegate({ a$: 'A', b: 'B' })

    si.act({ c: 'C' }, function (err, out) {
      assert.ok(!err)
      assert.ok(out.c === 'C')

      si.act({ d: 'D' }, function (err, out) {
        assert.ok(!err)
        assert.ok(out.c === 'C')
        assert.ok(out.d === 'D')

        sid.act({ c: 'C' }, function (err, out) {
          assert.ok(!err)
          assert.ok(out.a$ === 'A')
          assert.ok(out.c === 'C')
          assert.ok(out.b === 'B')

          sid.act({ d: 'D' }, function (err, out) {
            assert.ok(!err)
            assert.ok(out.a$ === 'A')
            assert.ok(out.b === 'B')
            assert.ok(out.c === 'C')
            assert.ok(out.d === 'D')

            sid.close(si.close.bind(si, done))
          })
        })
      })
    })
  })

  it('logging.actid', function (done) {
    var fail
    var si = Seneca({
      log: {
        map: [{
          handler: function () {
            if (arguments[6] === 'aaa') {
              if (arguments[1] !== 'debug') fail = 'aaa,debug'
              if (arguments[2] !== 'single') fail = 'aaa,single'
            }
            else if (arguments[6] === 'ppp') {
              if (arguments[1] !== 'debug') fail = 'ppp,debug'
              if (arguments[2] !== 'plugin') fail = 'ppp,plugin'
            }
          }
        }]
      }
    })

    si.add({a: 'A'}, function (args, cb) {
      this.log.debug('aaa')
      cb(null, args)
    })

    si.use(function (opts) {
      this.add({p: 'P'}, function (args, cb) {
        this.log.debug('ppp')
        cb(null, args)
      })
      return {name: 'p1'}
    })

    si.act({a: 'A'}, function (err, out) {
      assert.ok(!err)
      assert.ok(out.a === 'A')
      si.act({ p: 'P' }, function (err, out) {
        assert.ok(!err)
        assert.ok(out.p === 'P')

        if (fail) {
          console.log(fail)
          assert.fail(fail)
        }

        si.close(done)
      })
    })
  })

  it('prior.basic', function (done) {
    var si = Seneca(testopts)
    si.add({c: 'C'}, function c0 (args, cb) {
      // console.log('C='+this)
      args.a = 1
      cb(null, args)
    })

    si.add({c: 'C'}, function c1 (args, cb) {
      this.prior(args, function (err, out) {
        out.p = 2
        cb(err, out)
      })
    })

    si.act({c: 'C'}, function (err, out) {
      assert.equal(err, null)
      assert.equal(out.a, 1)
      assert.equal(out.p, 2)
      si.close(done)
    })
  })


  it('parent.plugin', function (done) {
    var si = Seneca(testopts).error(done)

    si.use(function (opts) {
      this.add({a: 'A'}, function (args, cb) {
        this.log.debug('P', '1')
        args.p1 = 1
        cb(null, args)
      })
      return {name: 'p1'}
    })

    si.act({ a: 'A' }, function (err, out) {
      assert.ok(!err)
      assert.ok(out.a === 'A')
      assert.ok(out.p1 === 1)

      si.use(function (opts) {
        this.add({a: 'A'}, function (args, cb) {
          this.log.debug('P', '2a')

          this.prior(args, function (err, out) {
            this.log.debug('P', '2b')
            out.p2 = 1
            cb(err, out)
          })
        })
        return {name: 'p2'}
      })

      si.act({ a: 'A' }, function (err, out) {
        assert.ok(!err)
        assert.ok(out.a === 'A')
        assert.ok(out.p1 === 1)
        assert.ok(out.p2 === 1)

        si.use(function (opts) {
          this.add({a: 'A'}, function (args, cb) {
            this.log.debug('P', '3a')

            this.prior(args, function (err, out) {
              this.log.debug('P', '3b')
              out.p3 = 1
              cb(err, out)
            })
          })
          return {name: 'p3'}
        })

        si.act({a: 'A'}, function (err, out) {
          assert.ok(!err)
          assert.ok(out.a === 'A')
          assert.ok(out.p1 === 1)
          assert.ok(out.p2 === 1)
          assert.ok(out.p3 === 1)

          si.close(done)
        })
      })
    })
  })
})
