/* Copyright (c) 2019-2020 Richard Rodger and other contributors, MIT License */
'use strict'

const Util = require('util')

const Code = require('@hapi/code')
const Lab = require('@hapi/lab')

const lab = (exports.lab = Lab.script())
const describe = lab.describe
const expect = Code.expect

const { Ordu } = require('ordu')

const Shared = require('./shared')
const it = Shared.make_it(lab)

const Seneca = require('..')
const Act = require('../lib/act.js')

const intern = Act.intern

describe('act', function () {
  it('make_actmsg', function (fin) {
    var origmsg = {
      a: 1,
      b: { c: 11 },
      id$: 2,
      caller$: 3,
      meta$: 4,
      transport$: 5,
    }

    var actmsg = intern.make_actmsg(origmsg)

    expect(actmsg.a).equal(1)
    expect(actmsg.b.c).equal(11)
    expect(actmsg.id$).not.exist()
    expect(actmsg.caller$).not.exist()
    expect(actmsg.meta$).not.exist()

    expect(actmsg.transport$).equal(5)

    actmsg.a = 111
    expect(origmsg.a).equal(1)

    fin()
  })

  it('process_outward', function (fin) {
    var outward = new Ordu({ name: 'outward' })
      .add(function (spec) {
        spec.data.x = 1
      })
      .add(function (spec) {
        if (spec.data.a) {
          return { op: 'stop', out: { kind: 'error', error: new Error('a') } }
        }
      })
      .add(function (spec) {
        if (spec.data.b) {
          return {
            op: 'stop',
            out: { kind: 'error', code: 'b', info: { b: 1 } },
          }
        }
      })
      // .add(function (spec) {
      //   if (spec.data.c) {
      //     return { op: 'stop', out: { kind: 'result', result: { c: 1 } } }
      //   }
      // })
      .add(function (spec) {
        if (spec.data.d) {
          return { op: 'stop', out: { kind: 'bad' } }
        }
      })

    var actctxt = { seneca: { order: { outward } } }

    var d0 = { a: 1, meta: {} }
    intern.process_outward(actctxt, d0)
    expect(d0.x).equals(1)
    expect(Util.isError(d0.err)).true()
    expect(d0.meta.error).true()

    var d1 = { b: 2, meta: {} }
    intern.process_outward(actctxt, d1)
    expect(d1.x).equals(1)
    expect(Util.isError(d1.err)).true()
    expect(d1.err.code).equal('b')
    expect(d1.meta.error).true()

    // var d2 = { c: 3, meta: {} }
    // intern.process_outward(actctxt, d2)
    // expect(d2.x).equals(1)
    // expect(d2.res).equal({ c: 1 })
    // expect(d2.meta.error).not.exists()

    var d3 = { d: 4 }
    intern.process_outward(actctxt, d3)
    expect(d3.err.code).equals('invalid-process-outward-code')
    expect(d3.meta.error).exists()

    var d4 = {}
    intern.process_outward(actctxt, d4)
    expect(d4.x).equals(1)

    fin()
  })

  it('validate-action-params', function (fin) {
    let s0 = Seneca({ legacy: false })
      .test()
      .quiet()
      .add('a:1', { x: Number }, function (msg, reply) {
        reply({ x: 1 + msg.x })
      })

    s0.act('a:1,x:2', function (err, out) {
      expect(out.x).equal(3)

      s0.act('a:1,x:s', function (err, out) {
        expect(err.code).equal('act_invalid_msg')
        expect(err.message).equal(
          'seneca: Action a:1 received an invalid message; Validation failed for property "x" with string "s" because the string is not of type number.; message content was: {a:1,x:s}.',
        )
        fin()
      })
    })
  })

  
  it('direct-basic-reply', async () => {
    let si = await Seneca({ legacy: false }).test().ready()
    let log = []

    si.add('a:1', function a1(msg, reply) {
      log.push('msg-exec')
      reply({ x: msg.x + 1 })
    })

    log.push('pre-msg')
    si.act('a:1,x:1,direct$:true', function (err, out) {
      expect(err).null()
      log.push('reply:' + JSON.stringify(out))
    })
    log.push('post-msg')

    // console.log('log', log)
    expect(log).equal(['pre-msg', 'msg-exec', 'reply:{"x":2}', 'post-msg'])
  })


  it('direct-basic-api', async () => {
    let si = await Seneca({ timeout: 50, legacy: false }).test().ready()
    let log = []

    si.add('a:1', function a1(msg) {
      log.push('msg-exec')
      return { x: msg.x + 1 }
    })

    log.push('pre-msg')
    let out = si.direct('a:1,x:1,direct$:true')
    log.push('reply:' + JSON.stringify(out))
    log.push('post-msg')

    expect(log).equal(['pre-msg', 'msg-exec', 'reply:{"x":2}', 'post-msg'])

    await new Promise(r=>setTimeout(r,100))
  })

  
  it('direct-no-reply', async () => {
    let si = await Seneca({ legacy: false }).test().ready()
    let log = []

    si.add('a:1', function a1(msg) {
      log.push(`msg0:a1:x=${msg.x}`)
    })

    log.push('pre-msg')
    si.act('a:1,x:1,direct$:true')
    log.push('post-msg')

    // console.log('log', log)
    expect(log).equal(['pre-msg', 'msg0:a1:x=1', 'post-msg'])
  })

  it('direct-child-actions', async () => {
    let si = await Seneca({ legacy: false }).test().ready()
    let log = []

    si.add('a:1', function a1(msg, reply) {
      log.push(`msg0:a1:x=${msg.x}`)
      reply({ x: msg.x + 1 })
    }).add('b:1', function b1(msg, reply) {
      log.push(`msg0:b1:x=${msg.x}`)

      this.act('a:1', { x: msg.x }, function (err, out) {
        expect(err).equal(null)
        log.push(`msg1:b1:x=${out.x}`)
        reply({ x: out.x * 2 })
      })
    })

    log.push('pre-msg')
    si.act('b:1,x:1,direct$:true', function (err, out) {
      expect(err).equal(null)
      log.push('reply:' + JSON.stringify(out))
    })
    log.push('post-msg')

    // console.log('log', log)
    expect(log).equal([
      'pre-msg',
      'msg0:b1:x=1',
      'msg0:a1:x=1',
      'msg1:b1:x=2',
      'reply:{"x":4}',
      'post-msg',
    ])
  })

  it('direct-prior-actions', async () => {
    let si = await Seneca({ legacy: false }).test().ready()
    let log = []

    si.add('a:1', function a1p1(msg, reply) {
      log.push(`msg0:a1p1:x=${msg.x}`)
      reply({ x: msg.x + 1 })
    }).add('a:1', function a1(msg, reply) {
      log.push(`msg0:a1:x=${msg.x}`)
      this.prior(msg, function (err, out) {
        expect(err).equal(null)
        log.push(`msg1:a1:x=${out.x}`)
        reply({ x: out.x * 2 })
      })
    })

    log.push('pre-msg')
    si.act('a:1,x:1,direct$:true', function (err, out) {
      expect(err).equal(null)
      log.push('reply:' + JSON.stringify(out))
    })
    log.push('post-msg')

    // console.log('log', log)
    expect(log).equal([
      'pre-msg',
      'msg0:a1:x=1',
      'msg0:a1p1:x=1',
      'msg1:a1:x=2',
      'reply:{"x":4}',
      'post-msg',
    ])
  })

  it('direct-sequence', async () => {
    let si = await Seneca({ legacy: false }).use('promisify').test().ready()
    let log = []

    si.add('a:1', function a1(msg, reply) {
      log.push(`msg0:a1:x=${msg.x}`)
      reply({ x: msg.x + 1 })
    })
      .add('b:1', function b1(msg, reply) {
        log.push(`msg0:b1:x=${msg.x}`)
        reply({ x: msg.x + 2 })
      })
      .add('c:1', function c1(msg, reply) {
        log.push(`msg0:c1:x=${msg.x}`)
        reply({ x: msg.x + 3 })
      })
      .add('d:1', function d1(msg) {
        log.push(`msg0:d1:x=${msg.x}`)
        this.act('a:1', { x: 1 })
        this.act('b:1', { x: 1 })
        this.act('c:1', { x: 1 })
        log.push(`msg1:d1:x=${msg.x}`)
        return { x: msg.x + 4 }
      })

    log.push('seq0')
    si.act('a:1,x:1,direct$:true', function (err, out) {
      expect(err).null()
      log.push('reply0:' + JSON.stringify(out))
    })

    log.push('seq1')
    si.act('b:1,x:1,direct$:true', function (err, out) {
      expect(err).null()
      log.push('reply1:' + JSON.stringify(out))
    })

    log.push('seq2')
    si.act('c:1,x:1,direct$:true', function (err, out) {
      expect(err).null()
      log.push('reply2:' + JSON.stringify(out))
    })

    log.push('seq3')
    si.act('d:1,x:1,direct$:true', function (err, out) {
      expect(err).null()
      log.push('reply3:' + JSON.stringify(out))
    })
    log.push('end')

    // console.log('log', log)
    expect(log).equal([
      'seq0',
      'msg0:a1:x=1',
      'reply0:{"x":2}',
      'seq1',
      'msg0:b1:x=1',
      'reply1:{"x":3}',
      'seq2',
      'msg0:c1:x=1',
      'reply2:{"x":4}',
      'seq3',
      'msg0:d1:x=1',
      'msg0:a1:x=1',
      'msg0:b1:x=1',
      'msg0:c1:x=1',
      'msg1:d1:x=1',
      'reply3:{"x":5}',
      'end',
    ])
  })
})
