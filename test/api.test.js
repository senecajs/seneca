'use strict'

var Code = require('code')
var Lab = require('lab')

var lab = exports.lab = Lab.script()
var describe = lab.describe
var it = lab.it
var expect = Code.expect

var Seneca = require('..')


describe('api', function () {

  var si = Seneca({log: 'silent'})

  function z (msg, reply) {
    reply({z: msg.z})
  }


  it('find', function (done) {
    si = si.test()

    expect(si.list()).to.equal([])

    var nump = si.list({}).length
    expect(nump).above(6)
    expect(si.list('a:1')).to.equal([])

    si.add('a:1', function () {})

    expect(si.list({}).length).equal(nump + 1)
    expect(si.list('a:1')).equal([{a: '1'}])
    expect(si.list({a: 1})).equal([{a: '1'}])
    expect(si.list({a: '1'})).equal([{a: '1'}])

    si.test().add('a:1,b:2', function () {})

    expect(si.list('a:1')).equal([{a: '1'}, {a: '1', b: '2'}])
    expect(si.list({a: 1})).equal([{a: '1'}, {a: '1', b: '2'}])
    expect(si.list({a: '1'})).equal([{a: '1'}, {a: '1', b: '2'}])

    expect(si.list('b:2')).equal([{a: '1', b: '2'}])
    expect(si.list({b: 2})).equal([{a: '1', b: '2'}])
    expect(si.list({b: '2'})).equal([{a: '1', b: '2'}])

    done()
  })


  it('has', function (done) {
    si = si.test()

    expect(si.has('h:1')).equal(false)
    expect(si.has('g:1')).equal(false)

    si.add('h:1', function () {})

    expect(si.has('h:1')).equal(true)
    expect(si.has('g:1')).equal(false)

    expect(si.has('h:1,x:1')).equal(false)

    done()
  })


  it('find', function (done) {
    var seneca = Seneca()
          .test(done)
          .add('a:1', z)
          .add('a:1,b:2', z)
          .add('a:1,b:2,c:3', z)
          .add('a:2', z)

    expect(seneca.has('a:1')).to.be.true()
    expect(seneca.has({a: 1})).to.be.true()

    expect(seneca.has('a:1,b:2')).to.be.true()
    expect(seneca.has('a:1,b:2,c:3')).to.be.true()

    expect(seneca.has('not:0')).to.be.false()

    expect(seneca.find('a:1').pattern).to.equal('a:1')
    expect(seneca.find({a: 1}).pattern).to.equal('a:1')

    expect(seneca.find('a:1,b:2').pattern).to.equal('a:1,b:2')
    expect(seneca.find('a:1,b:2,c:3').pattern).to.equal('a:1,b:2,c:3')

    expect(seneca.list('a:1')).to.equal(
      [{a: '1'}, {a: '1', b: '2'}, {a: '1', b: '2', c: '3'}])
    expect(seneca.list('a:1,b:2')).to.equal(
      [{a: '1', b: '2'}, {a: '1', b: '2', c: '3'}])
    expect(seneca.list('a:1,b:2,c:3')).to.equal(
      [{a: '1', b: '2', c: '3'}])
    expect(seneca.list({a: 1, b: 2, c: 3})).to.equal(
      [{a: '1', b: '2', c: '3'}])

    expect(seneca.list('a:*')).to.equal(
      [ { a: '1' },
        { a: '1', b: '2' },
        { a: '1', b: '2', c: '3' },
        { a: '2' } ])

    expect(seneca.list('b:*')).to.equal(
      [ { a: '1', b: '2' },
        { a: '1', b: '2', c: '3' } ])

    expect(seneca.list('c:*')).to.equal(
      [ { a: '1', b: '2', c: '3' } ])

    expect(seneca.list({c: '*'})).to.equal(
      [ { a: '1', b: '2', c: '3' } ])

    done()
  })
})
