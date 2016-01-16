/* Copyright (c) 2013-2015 Richard Rodger */
'use strict'

var Assert = require('assert')
var Async = require('async')
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
    si.ready(function () {
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
  })

  it('dynamic', function (done) {
    var si = Seneca(testopts)
    si.ready(function () {
      si.add({ c: 'C' }, function (args, cb) {
        cb(null, args)
      })
      si.add({ d: 'D' }, function (args, cb) {
        this.act({ c: 'C', d: 'D' }, cb)
      })
      var sid = si.delegate({ a$: 'A', b: 'B' })

      Async.series([
        function (next) {
          si.act({ c: 'C' }, function (err, out) {
            assert.ok(!err)
            assert.ok(out.c === 'C')
            next()
          })
        },
        function (next) {
          si.act({ d: 'D' }, function (err, out) {
            assert.ok(!err)
            assert.ok(out.c === 'C')
            assert.ok(out.d === 'D')
            next()
          })
        },
        function (next) {
          sid.act({ c: 'C' }, function (err, out) {
            assert.ok(!err)
            assert.ok(out.a$ === 'A')
            assert.ok(out.c === 'C')
            assert.ok(out.b === 'B')
            next()
          })
        },
        function (next) {
          sid.act({ d: 'D' }, function (err, out) {
            assert.ok(!err)
            assert.ok(out.a$ === 'A')
            assert.ok(out.b === 'B')
            assert.ok(out.c === 'C')
            assert.ok(out.d === 'D')
            next()
          })
        }
      ], function () {
        si.close(done)
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

    si.ready(function () {
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
  })

  it('parent', function (done) {
    var si = Seneca(testopts)
    si.add({c: 'C'}, function (args, cb) {
      // console.log('C='+this)
      args.a = 1
      cb(null, args)
    })
    si.add({c: 'C'}, function (args, cb) {
      this.parent(args, function (err, out) {
        out.p = 1
        cb(err, out)
      })
    })

    si.ready(function () {
      si.act({c: 'C'}, function (err, out) {
        assert.equal(err, null)
        si.close(done)
      })
    })
  })

  it('parent.plugin', function (done) {
    var si = Seneca(testopts)

    si.use(function (opts) {
      this.add({a: 'A'}, function (args, cb) {
        this.log.debug('P', '1')
        args.p1 = 1
        cb(null, args)
      })
      return {name: 'p1'}
    })

    si.use(function (opts) {
      this.add({a: 'A'}, function (args, cb) {
        this.log.debug('P', '2a')

        this.parent(args, function (err, out) {
          this.log.debug('P', '2b')
          out.p2 = 1
          cb(err, out)
        })
      })
      return {name: 'p2'}
    })

    si.use(function (opts) {
      this.add({a: 'A'}, function (args, cb) {
        this.log.debug('P', '3a')

        this.parent(args, function (err, out) {
          this.log.debug('P', '3b')
          out.p3 = 1
          cb(err, out)
        })
      })
      return {name: 'p3'}
    })

    si.ready(function () {

      si.act({a: 'A'}, function (err, out) {
        assert.ok(!err)
        assert.ok(out.a === 'A')
        assert.ok(out.p1 === 1)
        assert.ok(out.p2 === 1)
        assert.ok(out.p3 === 1)
        done()
      })
    })
  })
})
