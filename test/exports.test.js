/* Copyright © 2020 Richard Rodger and other contributors, MIT License. */
'use strict'

const Code = require('@hapi/code')
const Lab = require('@hapi/lab')

var lab = (exports.lab = Lab.script())
var describe = lab.describe
var expect = Code.expect
var it = lab.it

var Seneca = require('..')

describe('exports', function () {
  it('happy', async () => {
    var s0 = Seneca().test()

    var p0 = function p0(options) {
      return {
        exports: {
          x: options.x,
        },
      }
    }

    s0.use(p0, { x: 1 })

    return new Promise((r) => {
      s0.ready(function () {
        expect(s0.export('p0/x')).equals(1)
        r()
      })
    })
  })

  it('async-basic', async () => {
    var s0 = Seneca().test()

    var p0 = function p0(options) {
      return {
        exports: {
          x: options.x,
        },
      }
    }

    s0.use(p0, { x: 1 })

    return new Promise((r) => {
      s0.ready(function () {
        expect(s0.export('p0/x')).equals(1)
        r()
      })
    })
  })

  it('async-basic-error', async () => {
    // TODO: should async ready thow this?
    return new Promise((r) => {
      Seneca({ log: 'silent', debug: { undead: true } })
        .error((err) => {
          expect(err.message).includes('p0')
          r()
        })
        .use(async function p0(options) {
          throw new Error('p0')
        })
    })
  })

  it('with-init', async () => {
    var s0 = Seneca().test()

    var p0 = function p0(options) {
      var exp = {
        x: { y: options.y },
      }

      // TODO: auto init reply feature to handle case where init is sync
      // and reply forgotten?
      this.init(function (reply) {
        exp.x.z = 1
        reply()
      })

      return {
        exports: exp,
      }
    }

    s0.use(p0, { y: 1 })

    return new Promise((r) => {
      s0.ready(function () {
        // NOTE: Seneca maintains original object references and does not
        // modify or clone exports
        expect(s0.export('p0/x')).equals({ y: 1, z: 1 })
        r()
      })
    })
  })

  it('async-with-init', async () => {
    var s0 = Seneca().test()

    var p0 = async function p0(options) {
      var exp = {
        x: { y: options.y },
      }

      // TODO: auto init reply feature to handle case where init is sync
      // and reply forgotten?
      this.init(function (reply) {
        exp.x.z = 1
        reply()
      })

      return {
        exports: exp,
      }
    }

    s0.use(p0, { y: 1 })

    return new Promise((r) => {
      s0.ready(function () {
        // NOTE: Seneca maintains original object references and does not
        // modify or clone exports
        expect(s0.export('p0/x')).equals({ y: 1, z: 1 })
        r()
      })
    })
  })

  it('with-preload', async () => {
    var s0 = Seneca().test()

    var p0 = function p0(options) {
      var exp = {
        x: { y: options.y },
      }

      return {
        exports: exp,
      }
    }

    p0.preload = function () {
      return {
        exports: {
          z: 1,
        },
      }
    }

    s0.use(p0, { y: 2 })
    expect(s0.export('p0/z')).equals(1)

    return new Promise((r) => {
      s0.ready(function () {
        // NOTE: Seneca maintains original object references and does not
        // modify or clone exports
        expect(s0.export('p0/z')).equals(1)
        expect(s0.export('p0/x')).equals({ y: 2 })
        r()
      })
    })
  })

  it('async-with-preload', async () => {
    var s0 = Seneca().test()

    var p0 = async function p0(options) {
      var exp = {
        x: { y: options.y },
      }

      return {
        exports: exp,
      }
    }

    p0.preload = function () {
      return {
        exports: {
          z: 1,
        },
      }
    }

    s0.use(p0, { y: 2 })
    expect(s0.export('p0/z')).equals(1)

    return new Promise((r) => {
      s0.ready(function () {
        // NOTE: Seneca maintains original object references and does not
        // modify or clone exports
        expect(s0.export('p0/z')).equals(1)
        expect(s0.export('p0/x')).equals({ y: 2 })
        r()
      })
    })
  })

  it('with-preload-and-init', async () => {
    var s0 = Seneca().test()

    var p0 = function p0(options) {
      var exp = {
        x: { y: options.y },
      }

      this.init(function (reply) {
        exp.x.q = 1
        reply()
      })

      return {
        exports: exp,
      }
    }

    p0.preload = function () {
      return {
        exports: {
          z: 1,
        },
      }
    }

    s0.use(p0, { y: 2 })
    expect(s0.export('p0/z')).equals(1)

    return new Promise((r) => {
      s0.ready(function () {
        // NOTE: Seneca maintains original object references and does not
        // modify or clone exports
        expect(s0.export('p0/z')).equals(1)
        expect(s0.export('p0/x')).equals({ y: 2, q: 1 })
        r()
      })
    })
  })

  it('async-with-preload-and-init', async () => {
    var s0 = Seneca().test()

    var p0 = async function p0(options) {
      var exp = {
        x: { y: options.y },
      }

      this.init(function (reply) {
        exp.x.q = 1
        reply()
      })

      return {
        exports: exp,
      }
    }

    p0.preload = function () {
      return {
        exports: {
          z: 1,
        },
      }
    }

    s0.use(p0, { y: 2 })
    expect(s0.export('p0/z')).equals(1)

    return new Promise((r) => {
      s0.ready(function () {
        // NOTE: Seneca maintains original object references and does not
        // modify or clone exports
        expect(s0.export('p0/z')).equals(1)
        expect(s0.export('p0/x')).equals({ y: 2, q: 1 })
        r()
      })
    })
  })

  it('with-tags', async () => {
    const s0 = Seneca({ legacy: false }).test()

    var p0 = function p0(options) {
      return {
        exports: {
          x: options.x,
        },
      }
    }

    s0.use({ init: p0, tag: 'a', options: { x: 1 } })
    await s0.ready()
    expect(s0.export('p0/x')).equals(1)
    expect(s0.export('p0$a/x')).equals(1)

    // NOTE/plugin/774a
    s0.use({ init: p0, tag: 'b', options: { x: 2 } })
    await s0.ready()
    expect(s0.export('p0/x')).equals(2)
    expect(s0.export('p0$a/x')).equals(1)
    expect(s0.export('p0$b/x')).equals(2)

    const s1 = Seneca({ legacy: false }).test()

    var p1 = function p1(options) {
      return {
        exports: {
          x: options.x,
        },
      }
    }

    s1.use({ init: p1, tag: 'a', options: { x: 11 } })
    s1.use({ init: p1, tag: 'b', options: { x: 22 } })
    s1.use({ init: p1, tag: 'c', options: { x: 33 } })
    await s1.ready()
    expect(s1.export('p1/x')).equals(33)
    expect(s1.export('p1$a/x')).equals(11)
    expect(s1.export('p1$b/x')).equals(22)
    expect(s1.export('p1$c/x')).equals(33)
  })

  it('async-with-tags', async () => {
    const s0 = Seneca({ legacy: false }).test()

    var p0 = async function p0(options) {
      return {
        exports: {
          x: options.x,
        },
      }
    }

    s0.use({ init: p0, tag: 'a', options: { x: 1 } })
    await s0.ready()
    expect(s0.export('p0/x')).equals(1)
    expect(s0.export('p0$a/x')).equals(1)

    // NOTE/plugin/774a
    s0.use({ init: p0, tag: 'b', options: { x: 2 } })
    await s0.ready()
    expect(s0.export('p0/x')).equals(2)
    expect(s0.export('p0$a/x')).equals(1)
    expect(s0.export('p0$b/x')).equals(2)

    const s1 = Seneca({ legacy: false }).test()

    var p1 = async function p1(options) {
      return {
        exports: {
          x: options.x,
        },
      }
    }

    s1.use({ init: p1, tag: 'a', options: { x: 11 } })
    s1.use({ init: p1, tag: 'b', options: { x: 22 } })
    s1.use({ init: p1, tag: 'c', options: { x: 33 } })
    await s1.ready()
    expect(s1.export('p1/x')).equals(33)
    expect(s1.export('p1$a/x')).equals(11)
    expect(s1.export('p1$b/x')).equals(22)
    expect(s1.export('p1$c/x')).equals(33)
  })
})
