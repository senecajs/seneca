// /* Copyright (c) 2013-2015 Richard Rodger */
"use strict";


var assert = require('assert')


var seneca_module = require('..')
var common = require('../lib/common')


var gex = require('gex')
var Lab = require('lab')


var testopts = {log:'silent'}
var lab      = exports.lab = Lab.script()
var describe = lab.describe
var it       = lab.it

function orderCalled(order) {
  return function(args, done) {
    args.order = args.order || [];
    args.order.push(order);
    this.prior(args, done)
  }
}

describe('prior call order', function() {

  describe('strict.add: false', function() {
    var testopts = {
      log : 'silent',
      strict: { add: false }
    }

    it('order defined: 3, 2, 1', function(done) {
      var si  = seneca_module(testopts)

      si.add('a:1', orderCalled(3))
      si.add('a:1,b:1', orderCalled(2))
      si.add('a:1,b:1,c:1', orderCalled(1))

      si.act('a:1,b:1,c:1', function(err, out){
        console.trace();
        assert.eql(out.order, [1, 2, 3])
        done(err)
      })
    })

    it('order defined: 1, 2, 3', function(done) {
      var si  = seneca_module(testopts)

      si.add('a:1,b:1,c:1', orderCalled(1))
      si.add('a:1,b:1', orderCalled(2))
      si.add('a:1', orderCalled(3))

      si.act('a:1,b:1,c:1', function(err, out){
        assert.eql(out.order, [1, 2, 3])
        done(err)

      })
    })

    it('order defined: 1, 3, 2', function(done) {
      var si  = seneca_module(testopts)

      si.add('a:1,b:1,c:1', orderCalled(1))
      si.add('a:1', orderCalled(3))
      si.add('a:1,b:1', orderCalled(2))

      si.act('a:1,b:1,c:1', function(err, out){
        assert.eql(out.order, [1, 2, 3])
        done(err)
      })
    })
  })
})
