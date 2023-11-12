/* Copyright (c) 2019 Richard Rodger and other contributors, MIT License */
'use strict'

const Code = require('@hapi/code')
const Lab = require('@hapi/lab')

var lab = (exports.lab = Lab.script())
var describe = lab.describe
var expect = Code.expect

var Shared = require('./shared')
var it = Shared.make_it(lab)

var Seneca = require('..')

describe('add', function () {
  it('args', function (fin) {
    const si = Seneca().test()
    si
      // First can be jsonic
      .add({ a: 1 }, function a1(msg, reply) {
        reply({ x: 1 })
      })
      .add('a:2', function a2(msg, reply) {
        reply({ x: 2 })
      })

      // Second is always an object.
      .add({ a: 3 }, { b: 1 }, function a3b1(msg, reply) {
        reply({ x: 3 })
      })
      .add('a:4', { b: 2 }, function a4b2(msg, reply) {
        reply({ x: 4 })
      })

      // Sub patterns don't need an action.
      .add({ a: 5 })
      .add('a:6')
      .add({ a: 7 })
      .add('a:8', { b: 5 })

      .add(
        { a: 9 },
        function a9(msg, reply) {
          reply({ x: 9 })
        },
        { plugin_name: 'p9' },
      )
      .add(
        'a:10',
        function a10(msg, reply) {
          reply({ x: 10 })
        },
        { plugin_name: 'p10' },
      )
      .add(
        { a: 11 },
        { b: 6 },
        function a11b6(msg, reply) {
          reply({ x: 11 })
        },
        { plugin_name: 'p11' },
      )
      .add(
        'a:12',
        { b: 7 },
        function a12b7(msg, reply) {
          reply({ x: 12 })
        },
        { plugin_name: 'p12' },
      )

    let pats = si.list('a:*')
    // console.log(pats)
    expect(pats).equal([
      { a: '1' },
      { a: '2' },
      { a: '3', b: '1' },
      { a: '4', b: '2' },
      { a: '5' },
      { a: '6' },
      { a: '7' },
      { a: '8', b: '5' },
      { a: '9' },
      { a: '10' },
      { a: '11', b: '6' },
      { a: '12', b: '7' },
    ])

    si.act('a:1', function (err, out) {
      expect(err).equal(null)
      expect(out).equal({ x: 1 })

      si.act('a:2', function (err, out) {
        expect(err).equal(null)
        expect(out).equal({ x: 2 })

        si.act('a:3,b:1', function (err, out) {
          expect(err).equal(null)
          expect(out).equal({ x: 3 })

          si.act('a:4,b:2', function (err, out) {
            expect(err).equal(null)
            expect(out).equal({ x: 4 })

            si.act('a:9', function (err, out, meta) {
              expect(err).equal(null)
              expect(out).equal({ x: 9 })
              expect(meta.plugin.name).equal('p9')

              si.act('a:10', function (err, out, meta) {
                expect(err).equal(null)
                expect(out).equal({ x: 10 })
                expect(meta.plugin.name).equal('p10')

                si.act('a:11,b:6', function (err, out, meta) {
                  expect(err).equal(null)
                  expect(out).equal({ x: 11 })
                  expect(meta.plugin.name).equal('p11')

                  si.act('a:12,b:7', function (err, out, meta) {
                    expect(err).equal(null)
                    expect(out).equal({ x: 12 })
                    expect(meta.plugin.name).equal('p12')

                    fin()
                  })
                })
              })
            })
          })
        })
      })
    })
  })

  it('args-error', function (fin) {
    const si = Seneca().test()

    expect(() => si.add('a', 'b')).throw(
      'seneca (add): Validation failed for property "actdef"' +
        ' with string "b" because the string is not of type object.',
    )

    fin()
  })


  it('action-name', function (fin) {
    var si = Seneca().test()

    si.add('n:0')
      .add('n:1', function () {})
      .add('n:2', function n2() {})

    // NOTE: these may need to be updated if startup action call sequence changes.
    // console.log(si.list().map(x=>si.find(x).id))
    
    expect(si.find('n:0')).contains({
      id: 'root$/default_action/8',
      name: 'default_action',
    })

    expect(si.find('n:1')).contains({
      id: 'root$/action/9',
      name: 'action',
    })

    expect(si.find('n:2')).contains({
      id: 'root$/n2/10',
      name: 'n2',
    })

    si.use(function p0() {
      this.add('p:0', function f0(msg, reply) {
        reply({ x: 1 })
      })
    }).ready(function () {
      expect(si.find('p:0')).contains({
        id: 'p0/f0/12',
        name: 'f0',
      })

      fin()
    })
  })

  it('action_modifier', function (fin) {
    var si = Seneca().test()

    si.private$.action_modifiers.push(function (actdef) {
      actdef.desc = actdef.func.desc
    })

    si.add({ a: 1 }, a1)

    a1.validate = { b: 2 }
    a1.desc = 'The ubiquitous a1 action.'
    function a1(m, r) {
      r()
    }

    si.ready(function () {
      var actdef = si.find('a:1')
      expect(actdef.rules.b).equal(2)
      expect(actdef.desc).equal('The ubiquitous a1 action.')
      fin()
    })
  })

  
  it('rules-basic', function (fin) {
    const si = Seneca({ legacy: false })
          .test()
          .quiet()

    si
      .add({ a: 1, b: Number }, function (m, r) {
        r({ b: m.b * 2 })
      })
      .add('a:2', { b: Number }, function (m, r) {
        r({ b: m.b * 3 })
      })

    si.act({ a: 1, b: 2 }, function (e, o) {
      expect(e).not.exist()
      expect(o).equal({ b: 4 })

      this.act({ a: 1, b: 'x' }, function (e, o) {
        expect(e).exist()
        expect(o).not.exist()
        expect(e.code).equal('act_invalid_msg')
        expect(e.details.props).equal([
          { path: 'b', what: 'type', type: 'number', value: 'x' },
        ])

        si.act({ a: 2, b: 3 }, function (e, o) {
          expect(e).not.exist()
          expect(o).equal({ b: 9 })

          this.act({ a: 2, b: 'x' }, function (e, o) {
            expect(e).exist()
            expect(o).not.exist()
            expect(e.code).equal('act_invalid_msg')
            expect(e.details.props).equal([
              { path: 'b', what: 'type', type: 'number', value: 'x' },
            ])
            fin()
          })
        })
      })
    })
  })

  it('rules-builders', function (fin) {
    const si = Seneca({ log: 'silent' }) //.test()
    const { Required } = si.valid

    si.add({ a: 1, b: Required({ x: Number }) }, function (m, r) {
      r({ b: m.b.x * 2 })
    })

    si.act({ a: 1, b: { x: 2 } }, function (e, o) {
      expect(e).not.exist()
      expect(o).equal({ b: 4 })

      this.act({ a: 1 }, function (e, o) {
        expect(e).exist()
        expect(o).not.exist()
        expect(e.code).equal('act_invalid_msg')
        expect(e.message).equal(
          'seneca: Action a:1 received an invalid message; Validation failed for property "b" with value "undefined" because the value is required.; message content was: { a: 1 }.'
        )
        fin()
      })
    })
  })

  it('rules-scalars', function (fin) {
    const si = Seneca({legacy:false})
          .test()
          .quiet()
    const { Required, Default } = si.valid

    si.add({ a: 1, b: Default(2) }, function (m, r) {
      r({ x: m.b * 2 })
    })

    si.act({ a: 1 }, function (e, o) {
      expect(e).not.exist()
      expect(o).equal({ x: 4 })

      this.act({ a: 1, b: 'q' }, function (e, o) {
        expect(e).exist()
        expect(o).not.exist()
        expect(e.code).equal('act_invalid_msg')
        expect(e.message).equal(
          'seneca: Action a:1 received an invalid message; Validation failed for property "b" with string "q" because the string is not of type number.; message content was: { a: 1, b: \'q\' }.'
        )
        fin()
      })
    })
  })

  
  it('rules-deep', function (fin) {
    const si = Seneca({ legacy: false })
          .test()
          .quiet()
    si.add({ a: 1, b: { c: 2 } }, function (m, r) {
      r({ r: m.b.c * 2 })
    }).add({ a: 2, d: { f: Boolean } }, function (m, r) {
      r({ r: m.b.c * 2 })
    })

    si.act({ a: 1 }, function (e, o) {
      expect(e).not.exist()
      expect(o).equal({ r: 4 })

      this.act({ a: 2 }, function (e, o) {
        expect(e).exist()
        expect(o).not.exist()
        expect(e.code).equal('act_invalid_msg')
        expect(e.message).equal(
          'seneca: Action a:2 received an invalid message; Validation failed for property "d.f" with value "undefined" because the value is required.; message content was: { a: 2, d: {} }.'
        )
        fin()
      })
    })
  })
})
