/* Copyright © 2016-2018 Richard Rodger and other contributors, MIT License. */
'use strict'

const Lab = require('@hapi/lab')
const Code = require('@hapi/code')

var lab = (exports.lab = Lab.script())
var describe = lab.describe
var expect = Code.expect

var Shared = require('./shared')
var it = Shared.make_it(lab)

var Seneca = require('..')

var { Inward } = require('../lib/inward')
var { API } = require('../lib/api')

describe('inward', function () {
  it('announce', function (fin) {
    var seneca = Seneca().test(fin)
    var seen = 0

    seneca.ready(function () {
      seneca.on('act-in', function (ev) {
        expect(ev.a).equal(2)
        fin()
      })

      Inward.inward_announce({
        ctx: { seneca: seneca },
        data: { msg: { a: 1 } },
      })
      Inward.inward_announce({
        ctx: { seneca: seneca, actdef: {} },
        data: { msg: { a: 2 } },
      })
    })
  })

  it('arg-check', function (fin) {
    try {
      API.inward()
      expect(false).true()
    } catch (e) {
      expect(e.code).equal('invalid_arguments')
    }

    fin()
  })
})
