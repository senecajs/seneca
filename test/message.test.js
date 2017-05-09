/* Copyright (c) 2017 Richard Rodger, MIT License */
'use strict'

var Lab = require('lab')
var Code = require('code')
var Hoek = require('hoek')
var Seneca = require('..')

var lab = (exports.lab = Lab.script())
var describe = lab.describe
var it = lab.it
var expect = Code.expect



var parents = msg => msg.meta$.parents.map(x => x[0])

var partial_match = (obj, pat) => Hoek.contain(obj,pat,{deep:true})


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
        expect(i).equal(4)
        expect(err.code).equal('maxparents')
        fin()
      })
  })


  it('branch', function(fin) {
    var log = []
    Seneca({ id$: 'branch', idlen: 4, limits: { maxparents: 3 } })
      .test(fin)
      .add('a:1', function a1(msg, reply) {
        log.push('a1')
        expect(msg.meta$.parents.map(x=>x[0])).equal([])
        msg.a1 = 1
        this.act('b:1,a:null', msg)
        this.act('a:2', msg, reply)
      })

      .add('a:2', function a2(msg, reply) {
        expect(msg.meta$.parents.map(x=>x[0])).equal(['a:1'])
        log.push('a2')
        msg.a2 = 1
        this.act('c:1,a:null', msg)
        this.act('a:3', msg, function(err, out){
          expect(partial_match(out.meta$.trace, [{
            desc: ['a:4'],
            trace: []
          }])).true()

          log.push('a2r')
          msg.a2r = 1
          this.act('c:2,a:null', msg)

          // capture c2
          setImmediate(reply.bind(null,err,out))
        })
      })

      .add('a:3', function a3(msg, reply) {
        expect(msg.meta$.parents.map(x=>x[0])).equal(['a:2','a:1'])
        log.push('a3')
        msg.a3 = 1
        this.act('a:4', msg, reply)
      })

      .add('a:4', function a3(msg, reply) {
        expect(msg.meta$.parents.map(x=>x[0])).equal(['a:3', 'a:2','a:1'])
        log.push('a4')
        msg.a4 = 1
        reply(msg)
      })

      .add('b:1', function b1(msg, reply) {
        expect(msg.meta$.parents.map(x=>x[0])).equal(['a:1'])
        log.push('b1')
        msg.b1 = 1
        reply()
      })

      .add('c:1', function c1(msg, reply) {
        expect(msg.meta$.parents.map(x=>x[0])).equal(['a:2','a:1'])
        log.push('c1')
        msg.c1 = 1
        reply()
      })

      .add('c:2', function c2(msg, reply) {
        expect(msg.meta$.parents.map(x=>x[0])).equal(['a:3','a:2','a:1'])
        log.push('c2')
        msg.c2 = 1
        reply()
      })

      .act('a:1', function(err, out) {
        expect(err).equal(null)
        expect(out).equal({ a: 4, a1: 1, a2: 1, a3: 1, a4: 1 })
        expect(log).equal([ 'a1', 'b1', 'a2', 'c1', 'a3', 'a4', 'a2r', 'c2' ])

        expect(partial_match(out.meta$.trace, [
          { desc: ['b:1'] },
          { desc: ['a:2'], 
            trace: [
              { desc: ['c:1'], },
              { desc: ['a:3'], 
                trace: [
                  { desc: ['a:4'], },
                  { desc: ['c:2'], } 
                ]}
            ]}
        ])).true()

        fin()
      })
  })


  it('custom', function(fin) {
    var si = Seneca()
          .test(fin)
          .add('a:1', function a1(msg, reply) {
            msg.meta$.custom.a1 = 1
            reply({x:1})
          })
          .add('a:2', function a2(msg, reply) {
            msg.meta$.custom.a2 = 1
            msg.x = 2
            reply(msg)
          })

    var foo = {y:1}
    var bar = {z:1}
    
    si.
      gate()
      .act({a:1,custom$:foo}, function (err, out) {
        expect(err).equal(null)
        expect(out).equal({x:1})
        expect(foo).equal({y:1,a1:1})
        expect(out.meta$.custom).equal({y:1,a1:1})
      })
      .act({a:2,custom$:bar}, function (err, out) {
        expect(err).equal(null)
        expect(out).equal({a:2, x:2})
        expect(bar).equal({z:1,a2:1})
        expect(out.meta$.custom).equal({z:1,a2:1})
        fin()
      })
  })

  
  
  it('proto', function(fin) {
    var si = Seneca()
          .test(fin)
          .add('a:1', function a1(msg, reply) {
            expect(msg.a).equal(1)
            expect(msg.y).equal(1)
            reply({x:1})
          })
          .add('a:2', function a2(msg, reply) {
            expect(msg.a).equal(2)
            expect(msg.z).equal(1)
            msg.x = 2
            reply(msg)
          })

    var foo = {y:1}
    var bar = {z:1}

    var m0 = Object.create(foo)
    m0.a = 1

    var m1 = {a:2}
    m1.__proto__ = bar

    //var cm1 = Seneca.util.clean(m1)
    //console.log(cm1,cm1.z)
        
    si.
      gate()
      .act(m0, function (err, out) {
        expect(err).equal(null)
        expect(out).equal({x:1})
      })
      .act(m1, function (err, out) {
        expect(err).equal(null)
        expect(out.x).equal(2)
        expect(out.z).equal(1)
        fin()
      })
  })


  it('entity', function(fin) {
    var si = Seneca()
          .test(fin)
          .use('entity')

    si = si.gate()

    var foo = si.make$('foo',{id$:'a',a:1})

    foo.save$(function(err, out) {
      expect(out.toString()).equal('$-/-/foo;id=a;{a:1}')
      expect(out.meta$).exist()
      expect(out.canon$).exist()
    })

    foo.list$(function(err, list) {
      expect(list.length).equal(1)
      expect(list.meta$).exist()

      var foo0 = list[0]
      expect(foo0.toString()).equal('$-/-/foo;id=a;{a:1}')
      expect(foo0.canon$).exist()

      fin()
    })
  })
})
