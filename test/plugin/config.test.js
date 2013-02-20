/* Copyright (c) 2010-2013 Ricebridge */


"use strict";

var assert = require('chai').assert

var seneca = require('../..')()


seneca.use('config',{object:{foo:'bar'}})


describe('config', function() {

  it('get', function() {
    seneca.act({role:'config',cmd:'get',key:'foo'},function(err,val){
      assert.ok(null==err)
      assert.equal('bar',val)
    })
  })
})