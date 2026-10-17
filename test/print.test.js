/* Copyright © 2010-2019 Richard Rodger and other contributors, MIT License. */
'use strict'

const Path = require('path')
const assert = require('node:assert/strict')
const { Print } = require('../lib/print.js')

const { describe, it } = require('node:test')

const Seneca = require('..')

// TODO: capture STDOUT and verify
describe('print', function () {
  it('init', function (t, fin) {
    var si = Seneca().test(fin)
    Print(si, ['', ''])
    Print(si, ['', '', '--seneca.print'])
    Print(si, ['', '', '--seneca.print.options'])
    fin()
  })

  it('options', function (t, fin) {
    var si = Seneca({ debug: { print: { options: true } } })
      .test(fin)
      .add('a:1', function (msg, reply) {
        reply({ x: 1 })
      })
    fin()
  })

  it('print', function (t, fin) {
    Print.print(new Error('foo'))
    Print.print(null, { foo: 1 })
    fin()
  })

  it('custom-print', function (t, fin) {
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

    assert.ok(tmp[0].startsWith('LOG:{"data":["bbb"]'))
    assert.equal(tmp[1], 'ERR:ccc')

    fin()
  })
})
