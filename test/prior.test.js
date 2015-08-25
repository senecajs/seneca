/* Copyright (c) 2015 Richard Rodger, Contributors */
"use strict";


var assert = require('assert')


var seneca = require('..')

var gex = require('gex')
var _   = require('lodash')
var Lab = require('lab')


var lab      = exports.lab = Lab.script()
var describe = lab.describe
var it       = lab.it


var testopts = {log:'test'}


describe('prior', function() {

  it('add-general-to-specific', function( fin ) {
    seneca(testopts)
      .error( fin )
      .add( 'a:1',         order_called(3) )
      .add( 'a:1,b:1',     order_called(2) )
      .add( 'a:1,b:1,c:1', order_called(1) )

      .act( 'a:1,b:1,c:1', function( err, out ) {
        assert.deepEqual( out.order, [1, 2, 3] )
        fin()
      })
  })

  it('add-strict-general-to-specific', function( fin ) {
    seneca( _.extend({strict:{add:true}},testopts) )
      .error( fin )
      .add( 'a:1',         order_called(3) )
      .add( 'a:1,b:1',     order_called(2) )
      .add( 'a:1,b:1,c:1', order_called(1) )

      .act( 'a:1,b:1,c:1', function( err, out ) {
        assert.deepEqual( out.order, [1] )
        fin()
      })
  })

  it('add-specific-to-general', function( fin ) {
    seneca(testopts)
      .error( fin )
      .add( 'a:1,b:1,c:1', order_called(1) )
      .add( 'a:1,b:1',     order_called(2) )
      .add( 'a:1',         order_called(3) )

      .act( 'a:1,b:1,c:1', function( err, out ) {
        assert.deepEqual( out.order, [1] )
        fin()
      })
  })

  it('add-strict-specific-to-general', function( fin ) {
    seneca( _.extend({strict:{add:true}},testopts) )
      .error( fin )
      .add( 'a:1,b:1,c:1', order_called(1) )
      .add( 'a:1,b:1',     order_called(2) )
      .add( 'a:1',         order_called(3) )

      .act( 'a:1,b:1,c:1', function( err, out ) {
        assert.deepEqual( out.order, [1] )
        fin()
      })
  })


  it('add-general-to-specific-alpha', function( fin ) {
    seneca(testopts)
      .error( fin )
      .add( 'a:1',         order_called(4) )
      .add( 'a:1,c:1',     order_called(3) )
      .add( 'a:1,b:1',     order_called(2) )
      .add( 'a:1,b:1,c:1', order_called(1) )

      .act( 'a:1,b:1,c:1', function( err, out ) {
        assert.deepEqual( out.order, [1, 2, 4] )
        fin()
      })
  })

  it('add-general-to-specific-reverse-alpha', function( fin ) {
    seneca(testopts)
      .error( fin )
      .add( 'a:1',         order_called(4) )
      .add( 'a:1,b:1',     order_called(3) )
      .add( 'a:1,c:1',     order_called(2) )
      .add( 'a:1,b:1,c:1', order_called(1) )

      .act( 'a:1,b:1,c:1', function( err, out ) {
        assert.deepEqual( out.order, [1, 3, 4] )
        fin()
      })
  })


  it('add-strict-default', function( fin ) {
    seneca(testopts)
      .error( fin )

      .add( 'a:1',         order_called(2) )
      .add( 'a:1,b:1',     order_called(1) )
      .act( 'a:1,b:1', function( err, out ) {
        assert.deepEqual( out.order, [1, 2] )

        this
          .add( 'c:1',                        order_called(2) )
          .add( 'c:1,d:1,strict$:{add:true}', order_called(1) )
          .act( 'c:1,d:1', function( err, out ) {
            assert.deepEqual( out.order, [1] )
            
            fin()
          })
      })
  })


  it('add-strict-true', function( fin ) {
    seneca( _.extend({strict:{add:true}},testopts) )
      .error( fin )

      .add( 'a:1',         order_called(2) )
      .add( 'a:1,b:1',     order_called(1) )
      .act( 'a:1,b:1', function( err, out ) {
        assert.deepEqual( out.order, [1] )

        this
          .add( 'c:1',                         order_called(2) )
          .add( 'c:1,d:1,strict$:{add:false}', order_called(1) )
          .act( 'c:1,d:1', function( err, out ) {
            assert.deepEqual( out.order, [1, 2] )
            
            fin()
          })
      })
  })

  

})


function order_called( order ) {
  return function( msg, respond ) {
    msg.order = msg.order || []
    msg.order.push(order)
    this.prior( msg, function( err, out ) {
      respond( err, out || this.util.clean(msg) )
    })
  }
}
