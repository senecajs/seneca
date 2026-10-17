/* Copyright (c) 2019-2022 Richard Rodger, MIT License */
'use strict'

var tmx = parseInt(process.env.TIMEOUT_MULTIPLIER || 1, 10)

const assert = require('node:assert/strict')

const { describe, it } = require('node:test')
var Seneca = require('..')

describe('explain', function () {
  it('explain-basic', async () => {
    const si = Seneca()
      .test()
      .message('a:1', async function (msg, meta) {
        var exp = meta.explain
        if (1 === msg.x) {
          assert.ok(null == exp)
        }
        exp && exp.push({ z: 3 })
        return { x: msg.x }
      })
      .message('b:1', async function (msg) {
        var exp = this.explain()
        if (4 === msg.x) {
          assert.ok(null == exp)
        }
        exp && exp({ z: 3 })
        return { x: msg.x }
      })
      .message('c:1', async function (msg, meta) {
        var exp = meta.explain
        exp && exp.push({ z: 4 })
        return [msg.x]
      })

    var exp = []
    var out = await si.post('a:1,x:1')
    assert.equal(out.x, 1)
    assert.equal(exp.length, 0)

    exp = []
    out = await si.post('a:1,x:2', { explain$: exp })
    assert.equal(out.x, 2)
    assert.partialDeepStrictEqual(exp[0].explain$, { pattern: 'a:1' })
    assert.partialDeepStrictEqual(exp[1], { z: 3 })

    await new Promise((resolve, reject) => {
      exp = []
      si.act('a:1,x:3', { explain$: exp }, function (err, out, meta) {
        if (err) return reject(err)
        assert.equal(out.x, 3)
        assert.partialDeepStrictEqual(meta.explain[1], { z: 3 })
        resolve(out)
      })
    })

    exp = []
    out = await si.post('b:1,x:4')
    assert.equal(out.x, 4)
    assert.equal(exp.length, 0)

    exp = []
    out = await si.post('b:1,x:5', { explain$: exp })
    assert.equal(out.x, 5)
    assert.partialDeepStrictEqual(exp[1], { z: 3 })

    await new Promise((resolve, reject) => {
      exp = []
      si.act('b:1,x:6', { explain$: exp }, function (err, out, meta) {
        if (err) return reject(err)
        assert.equal(out.x, 6)
        assert.partialDeepStrictEqual(meta.explain[1], { z: 3 })
        resolve(out)
      })
    })

    exp = []
    out = await si.post('c:1,x:5')
    assert.deepEqual(out, [5])
    assert.equal(exp.length, 0)

    exp = []
    out = await si.post('c:1,x:6', { explain$: exp })
    assert.deepEqual(out, [6])
    assert.partialDeepStrictEqual(exp[1], { z: 4 })

    await new Promise((resolve, reject) => {
      exp = []
      si.act('c:1,x:7', { explain$: exp }, function (err, out, meta) {
        if (err) return reject(err)
        assert.deepEqual(out, [7])
        assert.partialDeepStrictEqual(meta.explain[1], { z: 4 })
        resolve(out)
      })
    })
  })

  it('explain-data', async () => {
    const si = Seneca({ id$: 's01' })
      .test()
      .use('entity')
      .message('a:1', async function (msg, meta) {
        var exp = this.explain()
        exp && exp({ z: 1, s: this, e: this.make('foo').data$({ d: 2 }) })
        return { x: msg.x }
      })

    var exp = []
    var out = await si.post('a:1,x:2', { explain$: exp })
    assert.equal(out.x, 2)

    var json_exp = JSON.stringify(exp)
    var exp_json = JSON.parse(json_exp)

    assert.equal(exp_json[0].explain$.pattern, 'a:1')
    assert.deepEqual(exp_json[0].msg$, { a: 1, x: 2 })
    assert.equal(exp_json[1].z, 1)
    assert.partialDeepStrictEqual(exp_json[1].s, {
      isSeneca: true,
      id: 's01',
    })
    assert.deepEqual(exp_json[1].e, { entity$: '-/-/foo', d: 2 })
  })

  it('explain-deep', async () => {
    const si = Seneca()
      .test()
      .message('a:1', async function (msg) {
        var exp = this.explain()
        exp && exp({ z: 3 })
        return { x: msg.x }
      })
      .message('b:1', async function (msg) {
        var exp = this.explain()
        exp && exp({ z: 4 })
        return { y: msg.y }
      })
      .message('c:1', async function (msg) {
        var exp = this.explain()
        exp && exp({ z: 5 })
        msg.a = 1
        return await this.post(msg)
      })
      .message('d:1', async function (msg) {
        var exp = this.explain()
        exp && exp({ z: 6 })
        msg.c = 1
        return await this.post(msg)
      })
      .message('e:1', async function (msg) {
        var exp = this.explain()
        exp && exp({ z: 7 })
        var msg_a = { a: 1, ...msg }
        var out_a = await this.post(msg_a)
        var msg_b = { b: 1, ...msg }
        var out_b = await this.post(msg_b)
        return { x: out_a.x, y: out_b.y }
      })

    var exp = []
    var out = await si.post('a:1,x:2')
    assert.equal(out.x, 2)

    exp = []
    out = await si.post('a:1,x:2', { explain$: exp })
    assert.equal(out.x, 2)
    assert.partialDeepStrictEqual(exp[0].explain$, { pattern: 'a:1' })
    assert.partialDeepStrictEqual(exp[1], { z: 3 })

    exp = []
    out = await si.post('b:1,y:1', { explain$: exp })
    assert.equal(out.y, 1)
    assert.partialDeepStrictEqual(exp[0].explain$, { pattern: 'b:1' })
    assert.partialDeepStrictEqual(exp[1], { z: 4 })

    exp = []
    out = await si.post('c:1,x:4', { explain$: exp })
    assert.equal(out.x, 4)
    assert.partialDeepStrictEqual(exp[0].explain$, { pattern: 'c:1' })
    assert.partialDeepStrictEqual(exp[1], { z: 5 })
    assert.partialDeepStrictEqual(exp[2].explain$, { pattern: 'a:1' })
    assert.partialDeepStrictEqual(exp[3], { z: 3 })

    exp = []
    out = await si.post('d:1,x:5', { explain$: exp })
    assert.equal(out.x, 5)
    assert.partialDeepStrictEqual(exp[0].explain$, { pattern: 'd:1' })
    assert.partialDeepStrictEqual(exp[1], { z: 6 })
    assert.partialDeepStrictEqual(exp[2].explain$, { pattern: 'c:1' })
    assert.partialDeepStrictEqual(exp[3], { z: 5 })
    assert.partialDeepStrictEqual(exp[4].explain$, { pattern: 'a:1' })
    assert.partialDeepStrictEqual(exp[5], { z: 3 })

    exp = []
    out = await si.post('e:1,x:6,y:2', { explain$: exp })
    assert.equal(out.x, 6)
    assert.equal(out.y, 2)
    assert.partialDeepStrictEqual(exp[0].explain$, { pattern: 'e:1' })
    assert.partialDeepStrictEqual(exp[1], { z: 7 })
    assert.partialDeepStrictEqual(exp[2].explain$, { pattern: 'a:1' })
    assert.partialDeepStrictEqual(exp[3], { z: 3 })
    assert.partialDeepStrictEqual(exp[4].explain$, { pattern: 'b:1' })
    assert.partialDeepStrictEqual(exp[5], { z: 4 })
  })

  it('explain-toplevel', async () => {
    const si = Seneca()
      .test()
      .message('a:1', async function (msg) {
        var exp = this.explain()
        exp && exp({ z: msg.z })
        return { x: msg.x }
      })

    await si.ready()

    var exp = si.explain()
    assert.ok(null == exp)

    // turns on explain for each msg, for this instance
    var topexp = si.explain(true)
    assert.deepEqual(topexp, [])

    var out = await si.post('a:1,x:1,z:1')
    assert.equal(out.x, 1)
    assert.partialDeepStrictEqual(topexp[0][0].msg$, { a: 1, x: 1, z: 1 })
    assert.partialDeepStrictEqual(topexp[0][1], { z: 1 })

    out = await si.post('a:1,x:2,z:2')
    assert.equal(out.x, 2)
    assert.partialDeepStrictEqual(topexp[0][0].msg$, { a: 1, x: 1, z: 1 })
    assert.partialDeepStrictEqual(topexp[0][1], { z: 1 })
    assert.partialDeepStrictEqual(topexp[1][0].msg$, { a: 1, x: 2, z: 2 })
    assert.partialDeepStrictEqual(topexp[1][1], { z: 2 })

    var topexp_off = si.explain(false)
    assert.partialDeepStrictEqual(topexp_off[0][0].msg$, { a: 1, x: 1, z: 1 })
    assert.partialDeepStrictEqual(topexp_off[0][1], { z: 1 })
    assert.partialDeepStrictEqual(topexp_off[1][0].msg$, { a: 1, x: 2, z: 2 })
    assert.partialDeepStrictEqual(topexp_off[1][1], { z: 2 })

    out = await si.post('a:1,x:3,z:3')
    assert.equal(out.x, 3)
    assert.equal(topexp_off.length, 2)
  })

  // TODO: move to @seneca/transport
  // it('explain-transport', { timout: 22222 * tmx }, async () => {
  //   var s0 = Seneca({ id$: 's0', legacy: { transport: false } }).test()
  //   var c0 = Seneca({
  //     id$: 'c0',
  //     timeout: 22222 * tmx,
  //     legacy: { transport: false },
  //   }).test()

  //   await s0
  //     .add('a:1', function a1(msg, reply, meta) {
  //       meta.explain.push({ direct: 1 })

  //       var exp = this.explain()
  //       exp && exp('aaa')

  //       reply({ x: msg.x })
  //     })
  //     .add('b:1', function b1(msg, reply, meta) {
  //       var exp = this.explain()

  //       if (1 === msg.x) {
  //         assert.ok(null == exp)
  //         exp && exp('bbb')
  //       } else {
  //         assert.ok(null != exp)
  //         exp && exp('ccc')
  //       }
  //       //reply([1, 2, 3])
  //       reply({ x: msg.x })
  //     })
  //     .add('c:1', function c1(msg, reply, meta) {
  //       var exp = this.explain()
  //       exp && exp('ccc')

  //       reply([msg.x])
  //     })
  //     .listen(62110)
  //     .ready()

  //   await c0.client(62110).ready()

  //   var exp = []
  //   await new Promise((resolve, reject) => {
  //     c0.error(reject)
  //     s0.error(reject)

  //     c0.act('a:1,x:2', { explain$: exp }, function (ignore, out, meta) {
  //       assert.equal(out.x, 2)

  //       assert.partialDeepStrictEqual(exp[0].msg$, { a: 1, x: 2 })
  //       assert.partialDeepStrictEqual(exp[0].explain$, { instance: 'c0' })
  //       assert.partialDeepStrictEqual(exp[1].msg$, { a: 1, x: 2 })
  //       assert.partialDeepStrictEqual(exp[1].explain$, { instance: 's0' })
  //       assert.partialDeepStrictEqual(exp[2], { direct: 1 })
  //       assert.partialDeepStrictEqual(exp[3], { content: 'aaa' })

  //       c0.act('b:1,x:1', function (ignore, out, meta) {
  //         assert.equal(out.x, 1)
  //         assert.deepEqual(meta.explain, void 0)

  //         exp = []
  //         c0.act('b:1,x:2', { explain$: exp }, function (ignore, out, meta) {
  //           assert.equal(out.x, 2)

  //           assert.partialDeepStrictEqual(exp[0].msg$, { b: 1, x: 2 })
  //           assert.partialDeepStrictEqual(exp[0].explain$, { instance: 'c0' })
  //           assert.partialDeepStrictEqual(exp[1].msg$, { b: 1, x: 2 })
  //           assert.partialDeepStrictEqual(exp[1].explain$, { instance: 's0' })

  //           assert.partialDeepStrictEqual(meta.explain[0].msg$, { b: 1, x: 2 })
  //           assert.partialDeepStrictEqual(meta.explain[0].explain$, { instance: 'c0' })
  //           assert.partialDeepStrictEqual(meta.explain[1].msg$, { b: 1, x: 2 })
  //           assert.partialDeepStrictEqual(meta.explain[1].explain$, { instance: 's0' })

  //           exp = []
  //           c0.act('c:1,x:3', { explain$: exp }, function (ignore, out, meta) {
  //             assert.deepEqual(out, [3])

  //             assert.partialDeepStrictEqual(exp[0].msg$, { c: 1, x: 3 })
  //             assert.partialDeepStrictEqual(exp[0].explain$, { instance: 'c0' })
  //             assert.partialDeepStrictEqual(exp[1].msg$, { c: 1, x: 3 })
  //             assert.partialDeepStrictEqual(exp[1].explain$, { instance: 's0' })

  //             assert.partialDeepStrictEqual(meta.explain[0].msg$, { c: 1, x: 3 })
  //             assert.partialDeepStrictEqual(meta.explain[0].explain$, { instance: 'c0' })
  //             assert.partialDeepStrictEqual(meta.explain[1].msg$, { c: 1, x: 3 })
  //             assert.partialDeepStrictEqual(meta.explain[1].explain$, { instance: 's0' })

  //             s0.close(c0.close.bind(c0, resolve))
  //           })
  //         })
  //       })
  //     })
  //   })
  // })
})
