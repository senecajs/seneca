/* Copyright (c) 2015 Richard Rodger, Contributors */
'use strict'

var _ = require('lodash')
var Code = require('code')
var Lab = require('lab')
var Seneca = require('..')

var lab = exports.lab = Lab.script()
var describe = lab.describe
var it = lab.it
var expect = Code.expect

var testopts = { log: 'test' }

describe('prior', function () {
  lab.beforeEach(function (done) {
    process.removeAllListeners('SIGHUP')
    process.removeAllListeners('SIGTERM')
    process.removeAllListeners('SIGINT')
    process.removeAllListeners('SIGBREAK')
    done()
  })
  it('add-general-to-specific', function (done) {
    Seneca(testopts)
      .add('a:1', order_called(3))
      .add('a:1,b:1', order_called(2))
      .add('a:1,b:1,c:1', order_called(1))

      .act('a:1,b:1,c:1', function (err, out) {
        expect(err).to.not.exist()
        expect(out.order).to.deep.equal([1, 2, 3])
        done()
      })
  })

  it('add-strict-general-to-specific', function (done) {
    Seneca(_.extend({ strict: { add: true } }, testopts))
      .add('a:1', order_called(3))
      .add('a:1,b:1', order_called(2))
      .add('a:1,b:1,c:1', order_called(1))

      .act('a:1,b:1,c:1', function (err, out) {
        expect(err).to.not.exist()
        expect(out.order).to.deep.equal([1])
        done()
      })
  })

  it('add-specific-to-general', function (done) {
    Seneca(testopts)
      .add('a:1,b:1,c:1', order_called(1))
      .add('a:1,b:1', order_called(2))
      .add('a:1', order_called(3))

      .act('a:1,b:1,c:1', function (err, out) {
        expect(err).to.not.exist()
        expect(out.order).to.deep.equal([1])
        done()
      })
  })

  it('add-strict-specific-to-general', function (done) {
    Seneca(_.extend({strict: {add: true}}, testopts))
      .add('a:1,b:1,c:1', order_called(1))
      .add('a:1,b:1', order_called(2))
      .add('a:1', order_called(3))

      .act('a:1,b:1,c:1', function (err, out) {
        expect(err).to.not.exist()
        expect(out.order).to.deep.equal([1])
        done()
      })
  })

  it('add-general-to-specific-alpha', function (done) {
    Seneca(testopts)
      .add('a:1', order_called(4))
      .add('a:1,c:1', order_called(3))
      .add('a:1,b:1', order_called(2))
      .add('a:1,b:1,c:1', order_called(1))

      .act('a:1,b:1,c:1', function (err, out) {
        expect(err).to.not.exist()
        expect(out.order).to.deep.equal([1, 2, 4])
        done()
      })
  })

  it('add-general-to-specific-reverse-alpha', function (done) {
    Seneca(testopts)
      .add('a:1', order_called(4))
      .add('a:1,b:1', order_called(3))
      .add('a:1,c:1', order_called(2))
      .add('a:1,b:1,c:1', order_called(1))

      .act('a:1,b:1,c:1', function (err, out) {
        expect(err).to.not.exist()
        expect(out.order).to.deep.equal([1, 3, 4])
        done()
      })
  })

  it('add-strict-default', function (done) {
    Seneca(testopts)
      .add('a:1', order_called(2))
      .add('a:1,b:1', order_called(1))
      .act('a:1,b:1', function (err, out) {
        expect(err).to.not.exist()
        expect(out.order).to.deep.equal([1, 2])

        this
          .add('c:1', order_called(2))
          .add('c:1,d:1,strict$:{add:true}', order_called(1))
          .act('c:1,d:1', function (err, out) {
            expect(err).to.not.exist()
            expect(out.order).to.deep.equal([1])
            done()
          })
      })
  })

  it('add-strict-true', function (done) {
    Seneca(_.extend({strict: {add: true}}, testopts))
      .add('a:1', order_called(2))
      .add('a:1,b:1', order_called(1))
      .act('a:1,b:1', function (err, out) {
        expect(err).to.not.exist()
        expect(out.order).to.deep.equal([1])

        this
          .add('c:1', order_called(2))
          .add('c:1,d:1,strict$:{add:false}', order_called(1))
          .act('c:1,d:1', function (err, out) {
            expect(err).to.not.exist()
            expect(out.order).to.deep.equal([1, 2])
            done()
          })
      })
  })
})

function order_called (order) {
  return function (msg, respond) {
    msg.order = msg.order || []
    msg.order.push(order)
    this.prior(msg, function (err, out) {
      respond(err, out || this.util.clean(msg))
    })
  }
}
