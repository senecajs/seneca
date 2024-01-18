'use strict'

const Lab = require('@hapi/lab')
const Code = require('@hapi/code')

var lab = (exports.lab = Lab.script())
var describe = lab.describe
var expect = Code.expect

var Shared = require('./shared')
var it = Shared.make_it(lab)
var Seneca = require('..')

describe('history', function () {
  it('to cleanup after successful execution', function (fin) {
    const clearing = 10
    const n = 2
    const seneca = Seneca({
      history: { interval: 1 },
      timeout: 60 * 1000,
      legacy: { transport: false },
    })
      .test()
      .quiet()
      .add('a:1', function (msg, done) {
        done()
      })
      .add('a:2', function (msg, done) {
        setTimeout(() => {
          done()
        }, clearing + 101)
      })

    for (let i = 0; i < n; ++i) {
      seneca.act('a:1', function () {})
      seneca.act('a:2', function () {})
    }

    setTimeout(() => {
      expect(seneca.private$.history.list().length).equal(n)
      fin()
    }, clearing + 10)
  })
})
