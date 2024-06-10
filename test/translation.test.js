/* Copyright (c) 2016 Richard Rodger, MIT License */
'use strict'

const Lab = require('@hapi/lab')
const Code = require('@hapi/code')

var lab = (exports.lab = Lab.script())
var describe = lab.describe
var expect = Code.expect

var Shared = require('./shared')
var it = Shared.make_it(lab)
var Seneca = require('..')

describe('translation', () => {
  // return;

  it('happy', async () => {
    let s0 = Seneca({ legacy: false })
      .test()
      .use('promisify')

      .message('a:1,b:2', async function (msg) {
        return { x: 1 + msg.x }
      })

    let out = await s0.post('a:1,b:2,x:11')
    expect(out.x).equal(12)

    s0.translate('c:3', 'a:1')

    out = await s0.post('c:3,b:2,x:21')
    expect(out.x).equal(22)
  })

  it('prior-add', async () => {
    let s0 = Seneca({ legacy: false })
      .test()
      .use('promisify')

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
    expect(out.x).equal(23)

    out = await s0.post('a:1,b:2,x:11')
    expect(out.x).equal(23)

    s0.message('c:3,b:2', async function (msg) {
      msg.x = 0.1 + msg.x
      return this.prior(msg)
    })

    out = await s0.post('c:3,b:2,x:11')
    expect(out.x).equal(23.2)

    out = await s0.post('a:1,b:2,x:11')
    expect(out.x).equal(23.2)
  })

  it('sub', async () => {
    let log = []
    let s0 = Seneca({ legacy: false })
      .test()
      .use('promisify')

      .message('a:1', async function (msg) {
        return { x: 1 + msg.x }
      })
      .sub('a:1', function (msg) {
        log.push(msg)
      })

    let out = await s0.post('a:1,x:11')
    expect(out.x).equal(12)
    expect(log[0]).equal({ a: 1, x: 11, in$: true })

    s0.translate('b:2', 'a:1,b:null')

    out = await s0.post('a:1,x:12')
    expect(out.x).equal(13)
    expect(log[1]).equal({ a: 1, x: 12, in$: true })

    out = await s0.post('b:2,x:13')
    expect(out.x).equal(14)
    expect(log[2]).equal({ a: 1, x: 13, in$: true })

    s0.message('c:3', async function (msg) {
      return { x: 2 * msg.x }
    })
      .translate('d:4', 'c:3,d:null')
      .sub('d:4', function (msg) {
        log.push(msg)
      })

    out = await s0.post('c:3,x:14')
    expect(out.x).equal(28)
    expect(log[3]).equal({ c: 3, x: 14, in$: true })

    out = await s0.post('d:4,x:15')
    expect(out.x).equal(30)
    expect(log[4]).equal({ c: 3, x: 15, in$: true })
  })
})
