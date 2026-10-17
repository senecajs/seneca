/* Copyright (c) 2023 Richard Rodger, MIT License */
'use strict'

const assert = require('node:assert/strict')

const { describe, it } = require('node:test')

var Seneca = require('..')

describe('translation', () => {
  it('happy', async () => {
    const s0 = Seneca({ legacy: false })
      .test()

      .message('a:1,b:2', async function (msg) {
        return { x: 1 + msg.x }
      })

    let out = await s0.post('a:1,b:2,x:11')
    assert.equal(out.x, 12)

    s0.translate('c:3', 'a:1')

    out = await s0.post('c:3,b:2,x:21')
    assert.equal(out.x, 22)
  })

  it('prior-add', async () => {
    const s0 = Seneca({ legacy: false })
      .test()

      .message('a:1,b:2', async function (msg) {
        return { x: 1 + msg.x }
      })

      .translate('c:3', 'a:1,c:null')

    // console.log(s0.list())

    s0.message('c:3,b:2', async function (msg) {
      msg.x = 2 * msg.x
      return this.prior(msg)
    })

    // console.log(s0.list())
    // console.log(s0.find('a:1,b:2'))
    // console.log(s0.find('c:3,b:2'))

    let out = await s0.post('c:3,b:2,x:11')
    assert.equal(out.x, 23)

    out = await s0.post('a:1,b:2,x:11')
    assert.equal(out.x, 23)

    s0.message('c:3,b:2', async function (msg) {
      msg.x = 0.1 + msg.x
      return this.prior(msg)
    })

    out = await s0.post('c:3,b:2,x:11')
    assert.equal(out.x, 23.2)

    out = await s0.post('a:1,b:2,x:11')
    assert.equal(out.x, 23.2)
  })

  it('sub', async () => {
    let log = []
    const s0 = Seneca({ legacy: false })
      .test()

      .message('a:1', async function (msg) {
        return { x: 1 + msg.x }
      })
      .sub('a:1', function (msg) {
        log.push(msg)
      })

    let out = await s0.post('a:1,x:11')
    assert.equal(out.x, 12)
    assert.deepEqual(log[0], { a: 1, x: 11, in$: true })

    s0.translate('b:2', 'a:1,b:null')

    out = await s0.post('a:1,x:12')
    assert.equal(out.x, 13)
    assert.deepEqual(log[1], { a: 1, x: 12, in$: true })

    out = await s0.post('b:2,x:13')
    assert.equal(out.x, 14)
    assert.deepEqual(log[2], { a: 1, x: 13, in$: true })

    s0.message('c:3', async function (msg) {
      return { x: 2 * msg.x }
    })
      .translate('d:4', 'c:3,d:null')
      .sub('d:4', function (msg) {
        log.push(msg)
      })

    out = await s0.post('c:3,x:14')
    assert.equal(out.x, 28)
    assert.deepEqual(log[3], { c: 3, x: 14, in$: true })

    out = await s0.post('d:4,x:15')
    assert.equal(out.x, 30)
    assert.deepEqual(log[4], { c: 3, x: 15, in$: true })
  })
})
