/* Copyright © 2010-2019 Richard Rodger and other contributors, MIT License. */
'use strict'

const Path = require('path')
const Code = require('@hapi/code')
const Lab = require('@hapi/lab')

const Print = require('../lib/print.js')

const lab = (exports.lab = Lab.script())
const describe = lab.describe
const expect = Code.expect

const Shared = require('./shared')
const it = Shared.make_it(lab)

const Seneca = require('..')

// TODO: capture STDOUT and verify
describe('print', function () {
  it('init', function (fin) {
    var si = Seneca().test(fin)
    Print(si, ['', ''])
    Print(si, ['', '', '--seneca.print'])
    Print(si, ['', '', '--seneca.print.options'])
    fin()
  })

  it('options', function (fin) {
    var si = Seneca({ debug: { print: { options: true } } })
      .test(fin)
      .add('a:1', function (msg, reply) {
        reply({ x: 1 })
      })
    fin()
  })

  it('print', function (fin) {
    Print.print(new Error('foo'))
    Print.print(null, { foo: 1 })
    fin()
  })

  it('custom-print', function (fin) {
    var tmp = []
    function print(prefix) {
      return function (str) {
        tmp.push(prefix + str)
      }
    }
    var si = Seneca({
      internal: { print: { log: print('LOG:'), err: print('ERR:') } },
    })
    si.log.debug('aaa')
    si.log.info('bbb')
    si.private$.print.err('ccc')

    expect(tmp[0]).startsWith('LOG:{"data":["bbb"]')
    expect(tmp[1]).equals('ERR:ccc')

    fin()
  })
})
