/* Copyright (c) 2019 Richard Rodger, MIT License */
'use strict'

var tmx = parseInt(process.env.TIMEOUT_MULTIPLIER || 1, 10)

var Lab = require('lab')
var Code = require('code')
var Hoek = require('hoek')

var lab = (exports.lab = Lab.script())
var describe = lab.describe
var expect = Code.expect
var it = lab.it

var Seneca = require('..')


describe('explain', function() {
  it('explain-basic', async () => {
    var si = Seneca()
        .test()
        .use('promisify')
        .message('a:1', async function(msg, meta) {
          var exp = meta.explain
          if(1 === msg.x) {
            expect(exp).not.exist()
          } 
          exp && exp.push({z:3})
          return {x:msg.x}
        })
        .message('b:1', async function(msg) {
          var exp = this.explain()
          if(4 === msg.x) {
            expect(exp).not.exist()
          } 
          exp && exp({z:3})
          return {x:msg.x}
        })

    
    var exp = []
    var out = await si.post('a:1,x:1')
    expect(out.x).equal(1)
    expect(exp.length).equal(0)

    exp = []
    out = await si.post('a:1,x:2', {explain$:exp})
    expect(out.x).equal(2)
    expect(exp[0].explain$).includes({pattern:'a:1'})
    expect(exp[1]).includes({z:3})

    await new Promise((resolve,reject)=> {
      exp = []
      si.act('a:1,x:3', {explain$:exp}, function(err, out, meta) {
        if(err) return reject(err)
        expect(out.x).equal(3)
        expect(meta.explain[1]).includes({z:3})
        resolve(out)
      })
    })

    
    exp = []
    out = await si.post('b:1,x:4')
    expect(out.x).equal(4)
    expect(exp.length).equal(0)

    exp = []
    out = await si.post('b:1,x:5', {explain$:exp})
    expect(out.x).equal(5)
    expect(exp[1]).includes({z:3})


    await new Promise((resolve,reject)=> {
      exp = []
      si.act('b:1,x:6', {explain$:exp}, function(err, out, meta) {
        if(err) return reject(err)
        expect(out.x).equal(6)
        expect(meta.explain[1]).includes({z:3})
        resolve(out)
      })
    })
  })


  it('explain-deep', async () => {
    var si = Seneca()
        .test()
        .use('promisify')
        .message('a:1', async function(msg) {
          var exp = this.explain()
          exp && exp({z:3})
          return {x:msg.x}
        })
        .message('b:1', async function(msg) {
          var exp = this.explain()
          exp && exp({z:4})
          return {y:msg.y}
        })
        .message('c:1', async function(msg) {
          var exp = this.explain()
          exp && exp({z:5})
          msg.a = 1
          return await this.post(msg)
        })
        .message('d:1', async function(msg) {
          var exp = this.explain()
          exp && exp({z:6})
          msg.c = 1
          return await this.post(msg)
        })
        .message('e:1', async function(msg) {
          var exp = this.explain()
          exp && exp({z:7})
          var msg_a = {a:1, ...msg}
          var out_a = await this.post(msg_a)
          var msg_b = {b:1, ...msg}
          var out_b = await this.post(msg_b)
          return {x:out_a.x,y:out_b.y}
        })

    
    var exp = []
    var out = await si.post('a:1,x:2')
    expect(out.x).equal(2)

    exp = []
    out = await si.post('a:1,x:2', {explain$:exp})
    expect(out.x).equal(2)
    expect(exp[0].explain$).includes({pattern:'a:1'})
    expect(exp[1]).includes({z:3})

    exp = []
    out = await si.post('b:1,y:1', {explain$:exp})
    expect(out.y).equal(1)
    expect(exp[0].explain$).includes({pattern:'b:1'})
    expect(exp[1]).includes({z:4})

    exp = []
    out = await si.post('c:1,x:4', {explain$:exp})
    expect(out.x).equal(4)
    expect(exp[0].explain$).includes({pattern:'c:1'})
    expect(exp[1]).includes({z:5})
    expect(exp[2].explain$).includes({pattern:'a:1'})
    expect(exp[3]).includes({z:3})

    exp = []
    out = await si.post('d:1,x:5', {explain$:exp})
    expect(out.x).equal(5)
    expect(exp[0].explain$).includes({pattern:'d:1'})
    expect(exp[1]).includes({z:6})
    expect(exp[2].explain$).includes({pattern:'c:1'})
    expect(exp[3]).includes({z:5})
    expect(exp[4].explain$).includes({pattern:'a:1'})
    expect(exp[5]).includes({z:3})

    exp = []
    out = await si.post('e:1,x:6,y:2', {explain$:exp})
    expect(out.x).equal(6)
    expect(out.y).equal(2)
    expect(exp[0].explain$).includes({pattern:'e:1'})
    expect(exp[1]).includes({z:7})
    expect(exp[2].explain$).includes({pattern:'a:1'})
    expect(exp[3]).includes({z:3})
    expect(exp[4].explain$).includes({pattern:'b:1'})
    expect(exp[5]).includes({z:4})    
  })


  it('explain-toplevel', async () => {
    var si = Seneca()
        .test()
        .use('promisify')
        .message('a:1', async function(msg) {
          var exp = this.explain()
          exp && exp({z:msg.z})
          return {x:msg.x}
        })

    await si.ready()
    
    var exp = si.explain()
    expect(exp).not.exists()

    // turns on explain for each msg, for this instance
    var topexp = si.explain(true)
    expect(topexp).equal([])
    
    var out = await si.post('a:1,x:1,z:1')
    expect(out.x).equal(1)
    expect(topexp[0][0].msg$).includes({a:1,x:1,z:1})
    expect(topexp[0][1]).includes({z:1})

    out = await si.post('a:1,x:2,z:2')
    expect(out.x).equal(2)
    expect(topexp[0][0].msg$).includes({a:1,x:1,z:1})
    expect(topexp[0][1]).includes({z:1})
    expect(topexp[1][0].msg$).includes({a:1,x:2,z:2})
    expect(topexp[1][1]).includes({z:2})

    var topexp_off = si.explain(false)
    expect(topexp_off[0][0].msg$).includes({a:1,x:1,z:1})
    expect(topexp_off[0][1]).includes({z:1})
    expect(topexp_off[1][0].msg$).includes({a:1,x:2,z:2})
    expect(topexp_off[1][1]).includes({z:2})

    out = await si.post('a:1,x:3,z:3')
    expect(out.x).equal(3)
    expect(topexp_off.length).equal(2)
  })

  it('explain-transport', {timout: 22222 * tmx }, async () => {
    var s0 = Seneca({ id$: 's0', legacy: { transport: false } }).test()
    var c0 = Seneca({
      id$: 'c0',
      timeout: 22222 * tmx,
      legacy: { transport: false }
    }).test()
    
    await s0
      .add('a:1', function a1(msg, reply, meta) {
        meta.explain.push({direct:1})
        
        var exp = this.explain()
        exp && exp('aaa')
        
        reply({ x: msg.x })
      })
      .add('b:1', function a1(msg, reply, meta) {
        var exp = this.explain()
        expect(exp).not.exist()
        exp && exp('bbb')
        reply([1, 2, 3])
      })
      .listen(62110)
      .ready()


    await c0.client(62110).ready()

    var exp = []
    await new Promise((resolve, reject) => {
      c0.error(reject)
      s0.error(reject)

      c0.act('a:1,x:2', {explain$:exp}, function(ignore, out, meta) {
        expect(out.x).equals(2)

        expect(exp[0].msg$).includes({a:1,x:2})
        expect(exp[0].explain$).includes({instance:'c0'})
        expect(exp[1].msg$).includes({a:1,x:2})
        expect(exp[1].explain$).includes({instance:'s0'})
        expect(exp[2]).includes({direct:1})
        expect(exp[3]).includes({content:'aaa'})
        
        c0.act('b:1', function(ignore, out, meta) {
          expect(out).equals([1, 2, 3])
          
          expect(meta.explain,null)
          
          s0.close(c0.close.bind(c0, resolve))
        })
      })
    })
  })

})
