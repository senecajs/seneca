/* Copyright (c) 2015-2020 Richard Rodger, Contributors */
'use strict'

const assert = require('node:assert/strict')
const { describe, it } = require('node:test')

var Seneca = require('..')

var testopts = { log: 'test' }

describe('prior', function () {
  it('happy', function (t, fin) {
    Seneca()
      .test(fin)
      .add('a:1', function a1(msg, reply) {
        reply({ x: msg.x })
      })
      .add('a:1', function a1p(msg, reply) {
        msg.x = msg.x + 1
        this.prior(msg, reply)
      })
      .act('a:1,x:2', function (ignore, out) {
        assert.equal(out.x, 3)
        fin()
      })
  })

  it('top-level', function (t, fin) {
    try {
      Seneca().test().prior({ a: 1 })
      assert.equal(false, true)
    } catch (e) {
      assert.equal(e.code, 'no_prior_action')
      fin()
    }
  })

  it('direct_prior-happy', async () => {
    let si = await Seneca({ legacy: false }).test().ready()
    let log = []

    si.add('a:1', function a1(msg) {
      log.push(`a1:x=${msg.x}`)
      return { x: msg.x }
    }).add('a:1', function a1p(msg) {
      msg.x = msg.x + 1
      log.push(`a1p:x=${msg.x}`)
      return this.direct_prior(msg)
    })

    log.push('pre')
    let out = si.direct('a:1,x:2')
    log.push('post')

    assert.equal(out.x, 3)
    assert.deepEqual(log, ['pre', 'a1p:x=3', 'a1:x=3', 'post'])
  })

  it('direct_prior-with-reply', async () => {
    let si = await Seneca({ legacy: false }).test().ready()
    let log = []

    si.add('a:1', function a1(msg, reply) {
      log.push(`a1:x=${msg.x}`)
      reply({ x: msg.x })
    }).add('a:1', function a1p(msg, reply) {
      msg.x = msg.x + 1
      log.push(`a1p:x=${msg.x}`)
      this.direct_prior(msg, function (err, out) {
        assert.equal(err, null)
        log.push(`a1p-reply:x=${out.x}`)
        reply({ x: out.x * 2 })
      })
    })

    log.push('pre')
    si.act('a:1,x:2,direct$:true', function (err, out) {
      assert.equal(err, null)
      log.push('reply:' + JSON.stringify(out))
    })
    log.push('post')

    assert.deepEqual(log, [
      'pre',
      'a1p:x=3',
      'a1:x=3',
      'a1p-reply:x=3',
      'reply:{"x":6}',
      'post',
    ])
  })

  it('direct_prior-no-prior', async () => {
    let si = await Seneca({ legacy: false }).test().ready()

    si.add('a:1', function a1(msg) {
      return this.direct_prior(msg)
    })

    let out = si.direct('a:1,x:2')
    assert.equal(out, null)
  })

  it('direct_prior-no-prior-default', async () => {
    let si = await Seneca({ legacy: false }).test().ready()

    si.add('a:1', function a1(msg) {
      msg.default$ = { x: 99 }
      return this.direct_prior(msg)
    })

    let out = si.direct('a:1,x:2')
    assert.equal(out.x, 99)
  })

  it('direct_prior-no-prior-default-array', async () => {
    let si = await Seneca({ legacy: false }).test().ready()
    let dflt = [1, 2]

    si.add('a:1', function a1(msg) {
      msg.default$ = dflt
      return this.direct_prior(msg)
    })

    let out = si.direct('a:1')
    assert.deepEqual(out, [1, 2])
    assert.notEqual(out, dflt)

    si.add('b:1', function b1(msg, reply) {
      msg.default$ = dflt
      this.direct_prior(msg, reply)
    })

    let cbout = null
    si.direct('b:1', function (err, out) {
      cbout = out
    })
    assert.equal(Array.isArray(cbout), true)
    assert.deepEqual(cbout, [1, 2])
  })

  it('prior-no-prior-default-array', async () => {
    let si = await Seneca({ legacy: false }).test().ready()

    si.add('a:1', function a1(msg, reply) {
      msg.default$ = [1, 2]
      this.prior(msg, reply)
    })

    let out = await si.post('a:1')
    assert.equal(Array.isArray(out), true)
    assert.deepEqual(out, [1, 2])
  })

  it('direct_prior-top-level-error', function (t, fin) {
    try {
      Seneca().test().direct_prior({ a: 1 })
      assert.equal(false, true)
    } catch (e) {
      assert.equal(e.code, 'no_prior_action')
      fin()
    }
  })

  it('direct_prior-chain', async () => {
    let si = await Seneca({ legacy: false }).test().ready()
    let log = []

    si.add('a:1', function a1(msg) {
      log.push(`a1:x=${msg.x}`)
      return { x: msg.x + 1 }
    })
      .add('a:1', function a1p1(msg) {
        log.push(`a1p1:x=${msg.x}`)
        let out = this.direct_prior(msg)
        return { x: out.x + 10 }
      })
      .add('a:1', function a1p2(msg) {
        log.push(`a1p2:x=${msg.x}`)
        let out = this.direct_prior(msg)
        return { x: out.x + 100 }
      })

    let out = si.direct('a:1,x:1')
    assert.equal(out.x, 112)
    assert.deepEqual(log, ['a1p2:x=1', 'a1p1:x=1', 'a1:x=1'])
  })

  it('add-general-to-specific', function (t, done) {
    Seneca(testopts)
      .error(done)
      .add('a:1', order_called(3))
      .add('a:1,b:1', order_called(2))
      .add('a:1,b:1,c:1', order_called(1))
      .act('a:1,b:1,c:1', function (err, out) {
        assert.ifError(err)
        assert.deepEqual(out.order, [1, 2, 3])
        done()
      })
  })

  it('add-strict-general-to-specific', function (t, done) {
    Seneca(Object.assign({ strict: { add: true } }, testopts))
      .error(done)
      .add('a:1', order_called(3))
      .add('a:1,b:1', order_called(2))
      .add('a:1,b:1,c:1', order_called(1))
      .act('a:1,b:1,c:1', function (err, out) {
        assert.ifError(err)
        assert.deepEqual(out.order, [1])
        done()
      })
  })

  it('add-specific-to-general', function (t, done) {
    Seneca(testopts)
      .error(done)
      .add('a:1,b:1,c:1', order_called(1))
      .add('a:1,b:1', order_called(2))
      .add('a:1', order_called(3))
      .act('a:1,b:1,c:1', function (err, out) {
        assert.ifError(err)
        assert.deepEqual(out.order, [1])
        done()
      })
  })

  it('add-strict-specific-to-general', function (t, done) {
    Seneca(Object.assign({ strict: { add: true } }, testopts))
      .error(done)
      .add('a:1,b:1,c:1', order_called(1))
      .add('a:1,b:1', order_called(2))
      .add('a:1', order_called(3))
      .act('a:1,b:1,c:1', function (err, out) {
        assert.ifError(err)
        assert.deepEqual(out.order, [1])
        done()
      })
  })

  it('add-general-to-specific-alpha', function (t, done) {
    Seneca(testopts)
      .error(done)
      .add('a:1', order_called(4))
      .add('a:1,c:1', order_called(3))
      .add('a:1,b:1', order_called(2))
      .add('a:1,b:1,c:1', order_called(1))
      .act('a:1,b:1,c:1', function (err, out) {
        assert.ifError(err)
        assert.deepEqual(out.order, [1, 2, 4])
        done()
      })
  })

  it('add-general-to-specific-reverse-alpha', function (t, done) {
    Seneca(testopts)
      .error(done)
      .add('a:1', order_called(4))
      .add('a:1,b:1', order_called(3))
      .add('a:1,c:1', order_called(2))
      .add('a:1,b:1,c:1', order_called(1))
      .act('a:1,b:1,c:1', function (err, out) {
        assert.ifError(err)
        assert.deepEqual(out.order, [1, 3, 4])
        done()
      })
  })

  it('add-strict-default', function (t, done) {
    Seneca(testopts)
      .error(done)
      .add('a:1', order_called(2))
      .add('a:1,b:1', order_called(1))
      .act('a:1,b:1', function (err, out) {
        assert.ifError(err)
        assert.deepEqual(out.order, [1, 2])

        this.add('c:1', order_called(2))
          .add('c:1,d:1,strict$:{add:true}', order_called(1))
          .act('c:1,d:1', function (err, out) {
            assert.ifError(err)
            assert.deepEqual(out.order, [1])
            done()
          })
      })
  })

  it('add-strict-true', function (t, done) {
    Seneca(Object.assign({ strict: { add: true } }, testopts))
      .error(done)
      .add('a:1', order_called(2))
      .add('a:1,b:1', order_called(1))
      .act('a:1,b:1', function (err, out) {
        assert.ifError(err)
        assert.deepEqual(out.order, [1])

        this.add('c:1', order_called(2))
          .add('c:1,d:1,strict$:{add:false}', order_called(1))
          .act('c:1,d:1', function (err, out) {
            assert.ifError(err)
            assert.deepEqual(out.order, [1, 2])
            done()
          })
      })
  })
})

function order_called(order) {
  return function (msg, respond) {
    msg.order = msg.order || []
    msg.order.push(order)
    this.prior(msg, function (err, out) {
      respond(err, out || this.util.clean(msg))
    })
  }
}
