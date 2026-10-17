/* Copyright © 2020 Richard Rodger and other contributors, MIT License. */
'use strict'

const assert = require('node:assert/strict')
const { describe, it } = require('node:test')
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
        assert.equal(s0.export('p0/x'), 1)
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
        assert.equal(s0.export('p0/x'), 1)
        r()
      })
    })
  })

  it('async-basic-error', async () => {
    // TODO: should async ready thow this?
    return new Promise((r) => {
      Seneca({ log: 'silent', debug: { undead: true } })
        .error((err) => {
          assert.ok(err.message.includes('p0'))
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
        assert.deepEqual(s0.export('p0/x'), { y: 1, z: 1 })
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
        assert.deepEqual(s0.export('p0/x'), { y: 1, z: 1 })
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
    assert.equal(s0.export('p0/z'), 1)

    return new Promise((r) => {
      s0.ready(function () {
        // NOTE: Seneca maintains original object references and does not
        // modify or clone exports
        assert.equal(s0.export('p0/z'), 1)
        assert.deepEqual(s0.export('p0/x'), { y: 2 })
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
    assert.equal(s0.export('p0/z'), 1)

    return new Promise((r) => {
      s0.ready(function () {
        // NOTE: Seneca maintains original object references and does not
        // modify or clone exports
        assert.equal(s0.export('p0/z'), 1)
        assert.deepEqual(s0.export('p0/x'), { y: 2 })
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
    assert.equal(s0.export('p0/z'), 1)

    return new Promise((r) => {
      s0.ready(function () {
        // NOTE: Seneca maintains original object references and does not
        // modify or clone exports
        assert.equal(s0.export('p0/z'), 1)
        assert.deepEqual(s0.export('p0/x'), { y: 2, q: 1 })
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
    assert.equal(s0.export('p0/z'), 1)

    return new Promise((r) => {
      s0.ready(function () {
        // NOTE: Seneca maintains original object references and does not
        // modify or clone exports
        assert.equal(s0.export('p0/z'), 1)
        assert.deepEqual(s0.export('p0/x'), { y: 2, q: 1 })
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
    assert.equal(s0.export('p0/x'), 1)
    assert.equal(s0.export('p0$a/x'), 1)

    // NOTE/plugin/774a
    s0.use({ init: p0, tag: 'b', options: { x: 2 } })
    await s0.ready()
    assert.equal(s0.export('p0/x'), 2)
    assert.equal(s0.export('p0$a/x'), 1)
    assert.equal(s0.export('p0$b/x'), 2)

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
    assert.equal(s1.export('p1/x'), 33)
    assert.equal(s1.export('p1$a/x'), 11)
    assert.equal(s1.export('p1$b/x'), 22)
    assert.equal(s1.export('p1$c/x'), 33)
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
    assert.equal(s0.export('p0/x'), 1)
    assert.equal(s0.export('p0$a/x'), 1)

    // NOTE/plugin/774a
    s0.use({ init: p0, tag: 'b', options: { x: 2 } })
    await s0.ready()
    assert.equal(s0.export('p0/x'), 2)
    assert.equal(s0.export('p0$a/x'), 1)
    assert.equal(s0.export('p0$b/x'), 2)

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
    assert.equal(s1.export('p1/x'), 33)
    assert.equal(s1.export('p1$a/x'), 11)
    assert.equal(s1.export('p1$b/x'), 22)
    assert.equal(s1.export('p1$c/x'), 33)
  })
})
