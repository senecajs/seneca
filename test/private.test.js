/* Copyright (c) 2019 Richard Rodger and other contributors, MIT License */
'use strict'

const Code = require('@hapi/code')
const Lab = require('@hapi/lab')

const lab = (exports.lab = Lab.script())
const expect = Code.expect

const Seneca = require('..')

lab.describe('private', function () {
  lab.test('exit_close', async () => {
    var tmp = { exit: 0 }
    var opts = {
      legacy: false,
      system: {
        exit: () => {
          tmp.exit++
        },
      },
    }

    var si0 = Seneca(opts).use('promisify').test()
    si0.private$.exit_close()
    await si0.ready()
    expect(tmp.exit).equal(1)

    var si1 = Seneca(opts).use('promisify').test()
    si1.add('role:seneca,cmd:close', function (msg, reply) {
      tmp.si1 = true
      this.prior(msg, reply)
    })
    si1.private$.exit_close()
    await si1.ready()
    expect(tmp).equal({ exit: 2, si1: true })

    var si2 = Seneca(opts).use('promisify').quiet()

    si2.add('role:seneca,cmd:close', function (msg, reply) {
      tmp.si2 = true
      throw new Error('si2')
    })
    si2.private$.exit_close()
    await si2.ready()
    expect(tmp).equal({ exit: 3, si1: true, si2: true })
  })
})
