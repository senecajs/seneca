/* Copyright (c) 2017 Richard Rodger, MIT License */
'use strict'

var Lab = require('lab')
var Code = require('code')
var Seneca = require('..')

var lab = (exports.lab = Lab.script())
var describe = lab.describe
var it = lab.it
var expect = Code.expect

var parents = msg => msg.meta$.parents.map(x => x[0])

describe('message', function() {
  it('happy', function(fin) {
    Seneca({ tag: 'h0' })
      .test(fin)
      .add('a:1', function a1(msg, reply) {
        expect(parents(msg)).equal([])

        msg.x1 = msg.x
        this.act('a:2', msg, reply)
      })
      .add('a:2', function a2(msg, reply) {
        expect(parents(msg)).equal(['a:1'])
        expect(msg.x1).equal(msg.x)

        msg.x2 = msg.x
        this.act('a:3', msg, reply)
      })
      .add('a:3', function a3(msg, reply) {
        expect(parents(msg)).equal(['a:2', 'a:1'])
        expect(msg.x2).equal(msg.x)

        msg.x3 = msg.x
        this.act('a:4', msg, reply)
      })
      .add('a:4', function a4(msg, reply) {
        //console.log(msg.meta$)

        expect(parents(msg)).equal(['a:3', 'a:2', 'a:1'])
        expect(msg.x3).equal(msg.x)

        msg.x4 = msg.x
        reply(msg)
      })
      .act('a:1,x:1', function(err, out) {
        expect(
          this.util.flatten(out.meta$.trace, 'trace').map(x => x.desc[0])
        ).equal(['a:2', 'a:3', 'a:4'])
        fin()
      })
  })

  it('loop', function(fin) {
    var i = 0
    Seneca({ id$: 'loop', idlen: 4, log: 'silent', limits: { maxparents: 3 } })
      .add('a:1', function a1(msg, reply) {
        i++
        if (4 < i) {
          throw new Error('failed to catch loop i=' + i)
        }
        this.act('a:1', msg, reply)
      })
      .act('a:1', function(err, out) {
        //console.dir(err.meta$,{depth:null,colors:true})
        expect(i).equal(4)
        expect(err.code).equal('maxparents')
        fin()
      })
  })
})
