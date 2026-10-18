/* Copyright (c) 2017-2024 Richard Rodger and other contributors, MIT License */
'use strict'

const Util = require('util')

const assert = require('node:assert/strict')
const { describe, it } = require('node:test')

const Seneca = require('..')

describe('actions', function () {
  // var si = Seneca({ log: 'silent' })

  function z(msg, reply) {
    reply({ z: msg.z })
  }

  /* TODO:move to @seneca/transport
  it('cmd_ping', function (fin) {
    var si = Seneca({ legacy: false }).test(fin)
    assert.deepEqual(si.ping().id, si.id)

    si.listen().ready(function () {
      this.act('sys:seneca,cmd:ping', function (err, out) {
        // console.log(err, 'out', out, this.id)
        assert.deepEqual(out.id, this.id)
        si.close(fin)
      })
    })
  })
  */

  it('cmd_stats', function (t, fin) {
    var si = Seneca().add('a:1').act('a:1')

    si.test(fin).act('sys:seneca,cmd:stats', function (err, out) {
      assert.ok(null != out.act)
      assert.ok(null == out.actmap)

      this.act('sys:seneca,cmd:stats,summary:false', function (err, out) {
        assert.ok(null != out.act)
        assert.ok(null != out.actmap)

        this.act(
          'sys:seneca,cmd:stats,summary:false,pattern:"a:1"',
          function (err, out) {
            assert.equal(out.calls, 1)

            fin()
          },
        )
      })
    })
  })

  it('cmd_close', function (t, fin) {
    var si = Seneca().test(fin)

    var log = []
    si.on('close', function () {
      log.push('event-close')
    })
    si.add('sys:seneca,cmd:close', function (msg, reply) {
      log.push('custom-close')
      this.prior(msg, reply)
    })
    si.close(function () {
      assert.deepEqual(log, ['custom-close', 'event-close'])
      fin()
    })
  })

  it('info_fatal', function (t, fin) {
    Seneca({
      log: 'silent',
      system: { exit: function noop() {} },
    }).ready(function () {
      this.close = function () {}
      this.root.close = function () {}

      this.add('sys:seneca,cmd:close', function (msg, reply) {
        reply()
      })
        .sub('sys:seneca,info:fatal', function (msg) {
          assert.ok(null != msg.err)
          fin()
        })
        .add('a:1', function () {
          throw new Error('a:1')
        })
        .act('a:1,fatal$:true')
    })
  })

  it('get_options', function (t, fin) {
    var si = Seneca({ tag: 'foo', internal: { bar: { zoo: 1 } } }).test(fin)
    si.act('sys:seneca,get:options', function (err, out) {
      assert.ifError(err)
      assert.ok(null != out)
      assert.equal(out.tag, 'foo')
      assert.equal(si.tag, 'foo')

      this.act(
        'sys:seneca,get:options,base:internal,key:bar',
        function (err, out) {
          assert.ifError(err)
          assert.ok(null != out)
          assert.equal(out.zoo, 1)

          this.act(
            'sys:seneca,get:options,base:not-there,key:bar',
            function (err, out) {
              assert.ifError(err)
              assert.ok(null == out)

              fin()
            },
          )
        },
      )
    })
  })
})
