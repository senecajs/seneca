/* Copyright (c) 2019-2024 Richard Rodger, MIT License */
'use strict'

const tmx = parseInt(process.env.TIMEOUT_MULTIPLIER || 1, 10)

const Util = require('util')

const Lab = require('@hapi/lab')
const Code = require('@hapi/code')

const lab = (exports.lab = Lab.script())
const describe = lab.describe
const expect = Code.expect

const Shared = require('./shared')
const it = Shared.make_it(lab)

const Seneca = require('..')

describe('promise', function () {

  it('happy', async () => {
    let counter = 0

    const si = makeSeneca().message('a:1', async function (msg) {
      counter++
      return { x: msg.x }
    })

    // async message (no response)
    si.act('a:1,x:2')

    // sync message (has response)
    const out = await si.post('a:1,x:3')
    expect(out.x).equal(3)

    expect(counter).equal(2)
  })

  it('message', async () => {
    let counter = 0

    const si = makeSeneca().message('a:1', { b: 2 }, async function (msg) {
      counter++
      return { x: msg.x }
    })

    // async message (no response)
    si.act('a:1,b:2,x:2')

    // sync message (has response)
    const out = await si.post('a:1,b:2,x:3')
    expect(out.x).equal(3)

    expect(counter).equal(2)

    si.add('s:1')
      .sub('s:1', function () {
        counter++
      })
      .act('s:1')
    await si.ready()

    expect(counter).equal(3)
  })

  it('no-action', async () => {
    const tmp = { a1: 0, a1x1: 0 }

    const si = makeSeneca().message('a:1')

    si.sub('a:1', (m) => {
      tmp.a1++
    }).sub('a:1,x:1', (m) => {
      tmp.a1x1++
    })

    // async message (no response)
    si.act('a:1')
    await si.ready()
    expect(tmp).equal({ a1: 1, a1x1: 0 })

    return

    si.act('a:1,x:1')
    await si.ready()
    expect(tmp).equal({ a1: 1, a1x1: 1 })
  })

  it('close', async () => {
    const si = makeSeneca()
    expect(si.flags.closed).false()

    await si.close()
    expect(si.flags.closed).true()
  })

  it('validate-handle', async () => {
    let counter = 0

    async function a1(msg) {
      counter++
      return { x: msg.x }
    }

    a1.validate = {
      x: Number,
    }

    a1.handle = function () {}

    const si = makeSeneca().message('a:1', a1)

    // async message (no response)
    si.act('a:1,x:2')

    // sync message (has response)
    const out = await si.post('a:1,x:3')
    expect(out.x).equal(3)

    expect(counter).equal(2)
  })

  
  it('plugin-prepare-prior', async () => {
    const si = makeSeneca().use(function prep2() {
      let y = 0

      this.message('a:1', async function a1(msg) {
        return { x: msg.x, y: y }
      })
        .prepare(async function () {
          y = 50
        })
        .prepare(async function prep() {
          y = 100
        })
    })

    const out = await si.post('a:1,x:2')

    // NOTE: prior order!
    expect(out).equal({ x: 2, y: 50 })
  })

  
  it('plugin-prepare', async () => {
    const tmp = { log: [] }

    const si = makeSeneca().use(function p1() {
      let y = 0

      this.message('a:1', async function a0(msg) {
        return { x: msg.x, y: y }
      }).prepare(async function () {
        y = 50
      })
    })

    let out = await si.post('a:1,x:2')
    expect(out).equal({ x: 2, y: 50 })

    si.use(function p1$t0() {
      let y = -1
      this.prepare(async function () {
        y = 0
        tmp.log.push('p1$t0/0')
      }).message('p1:a', async function p1a(msg) {
        return { x: msg.x, y: y }
      })
    })

    out = await si.post('p1:a,x:3')
    expect(out).equal({ x: 3, y: 0 })

    expect(si.list('init:p1')).equals([
      { init: 'p1', plugin: 'init', role: 'seneca' },
      { init: 'p1', plugin: 'init', role: 'seneca', tag: 't0' },
    ])
  })

  it('plugin-destroy', async () => {
    const tmp = { log: [] }

    const si = makeSeneca()
        .use(function p0() {
          this.destroy(async function p0d() {
            tmp.log.push('p0')
          })
        })
        .use(function p1() {
          this.destroy(async function p1d() {
            tmp.log.push('p1')
          })
        })

    await si.ready()
    await si.close()

    // NOTE: inverse order
    expect(tmp).equal({ log: ['p1', 'p0'] })
  })

  it('plugin-multi-prepare-destroy', async () => {
    const tmp = { log: [] }

    const si = makeSeneca()
        .use(function p0() {
          let y = -1
          this.prepare(async function p0p0() {
            tmp.log.push('p0p0')
            y = 0
          })
            .destroy(async function p0d0() {
              tmp.log.push('p0d0')
            })
            .message('p:p0,get:y', async () => ({ y }))
        })
        .use(function p1() {
          let y = -1
          this.prepare(async function p1p0() {
            tmp.log.push('p1p0')
            y = 0
          })
            .prepare(async function p1p1() {
              tmp.log.push('p1p1')
              y = 1
            })
            .destroy(async function p1d0() {
              tmp.log.push('p1d0')
            })
            .destroy(async function p1d1() {
              tmp.log.push('p1d1')
            })
            .message('p:p1,get:y', async () => ({ y }))
        })
        .use(function p2() {
          let y = -1
          this.prepare(async function p2p0() {
            tmp.log.push('p2p0')
            y = 0
          })
            .prepare(async function p2p1() {
              tmp.log.push('p2p1')
              y = 1
            })
            .prepare(async function p2p2() {
              tmp.log.push('p2p2')
              y = 2
            })
            .destroy(async function p2d0() {
              tmp.log.push('p2d0')
            })
            .destroy(async function p2d1() {
              tmp.log.push('p2d1')
            })
            .destroy(async function p2d2() {
              tmp.log.push('p2d2')
            })
            .message('p:p2,get:y', async () => ({ y }))
        })

    await si.ready()

    // NOTE: prior order!
    expect(await si.post('p:p0,get:y')).equal({ y: 0 })
    expect(await si.post('p:p1,get:y')).equal({ y: 0 })
    expect(await si.post('p:p2,get:y')).equal({ y: 0 })

    await si.close()

    // NOTE: inverse order, by design, these are just priors!
    expect(tmp).equal({
      log: [
        'p0p0',
        'p1p1',
        'p1p0',
        'p2p2',
        'p2p1',
        'p2p0',
        'p2d2',
        'p2d1',
        'p2d0',
        'p1d1',
        'p1d0',
        'p0d0',
      ],
    })
  })

  it('entity', async () => {
    const si = makeSeneca()

    const bar0 = si.entity('bar').data$({ a: 1 })
    expect('' + bar0).equal('$-/-/bar;id=;{a:1}')

    const bar1 = si.entity('bar', { a: 2 })
    expect('' + bar1).equal('$-/-/bar;id=;{a:2}')

    const bar2 = si.entity('bar')
    bar2.a = 3
    expect('' + bar2).equal('$-/-/bar;id=;{a:3}')

    const bar10 = si.make('bar').data$({ a: 1 })
    expect('' + bar10).equal('$-/-/bar;id=;{a:1}')

    const bar11 = si.make('bar', { a: 2 })
    expect('' + bar11).equal('$-/-/bar;id=;{a:2}')

    const bar12 = si.make('bar')
    bar12.a = 3
    expect('' + bar12).equal('$-/-/bar;id=;{a:3}')

    const foo0 = await si.entity('foo').data$({ a: 1 }).save$()

    const foo1 = await si.entity('foo').load$(foo0.id)
    expect('' + foo0).equal('' + foo1)

    const foo2 = await si.entity('foo').data$({ a: 1 }).save$()
    let list = await si.entity('foo').list$({ a: 1 })
    expect(list.length).equal(2)

    await foo0.remove$()
    list = await si.entity('foo').list$({ a: 1 })
    expect(list.length).equal(1)

    const foo3 = list[0].clone$()
    foo3.a = 2
    await foo3.save$()

    const foo4 = await list[0].load$()
    expect(foo4.a).equal(2)
  })

  it('prepare-entity', async () => {
    const si = makeSeneca().use(function () {
      this.prepare(async function () {
        const foo = await this.entity('foo').data$({ a: 1 }).save$()
        expect(foo.a).equal(1)
      })
    })

    //await Util.promisify(si.ready)()
    await si.ready()
  })

  it('prior', async () => {
    const si = makeSeneca()

    si.add('trad:0', function (msg, reply) {
      reply({ x: msg.x, y: 1, z: msg.z, q: msg.q })
    })

    si.add('trad:0', function (msg, reply) {
      msg = this.util.clean(msg)
      msg.z = 1
      this.prior(msg, reply)
    })

    let out = await si.post('trad:0,x:1')
    expect(out).equal({ x: 1, y: 1, z: 1, q: void 0 })

    si.message('trad:0', async function (msg) {
      msg = this.util.clean(msg)
      msg.q = 1
      return await this.prior(msg)
    })

    out = await si.post('trad:0,x:1')
    expect(out).equal({ x: 1, y: 1, z: 1, q: 1 })

    const tmp = {}
    si.add('a:1', function (msg) {
      tmp.a = msg.a
    })

    si.add('a:1', function (msg) {
      this.prior({ a: msg.a })
    })

    si.act('a:1')

    setImmediate(function () {
      expect(tmp.a).equal(1)
    })
  })

  it('ready', async () => {
    const si = makeSeneca()
    const tmp = {}

    si.use(function (opts) {
      this.prepare(async function () {
        await new Promise((r) => setTimeout(r, 111))
        tmp.a = 1
      })
    })

    const so = await si.ready()
    expect(tmp.a).equal(1)
    expect(si === so).true()
  })

})


function makeSeneca() {
  return Seneca().test().use('entity')
}
