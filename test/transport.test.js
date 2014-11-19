/* Copyright (c) 2014 Richard Rodger, MIT License */
"use strict";


// mocha transport.test.js

var util   = require('util')

var common   = require('../lib/common')
var seneca   = require('../lib/seneca')


var assert  = require('chai').assert
var gex     = require('gex')

var _ = require('underscore')

console.log(new Date().toISOString())

describe('transport', function(){

  // TODO: test top level qaz:* : def and undef other pats


  it('transport-star', function(fin){
    var tt = test_transport()
    var si = seneca({timeout:5555,log:'silent'})
          .use( tt )

          .client( {type:'test', pin:'foo:*'} )

          .start(fin)

          .wait('foo:1')
          .step(function(out){
            assert.ok(1,out.foo)
            return true;
          })

          .wait('foo:2')
          .step(function(out){
            assert.ok(2,out.foo)
            return true;
          })

          .wait(function(data,done){
            si.act('bar:1',function(err,out){
              assert.ok(!!err)
              assert.equal('act_not_found',err.seneca.code)
              assert.ok(!out)
              done()
            })
          })

          .end()
  })


  it('transport-single-notdef', function(fin){
    var tt = test_transport()
    var si = seneca({timeout:5555,log:'silent'})
          .use( tt )

          .client( {type:'test', pin:'foo:1'} )

    si.act('foo:2',function(err){
      assert.ok(!!err)

      this
        .start(fin)

        .wait('foo:1,bar:1' )
        .step(function(out){
          assert.equal( 1, tt.outmsgs.length )
          assert.deepEqual( {foo:1,bar:2}, out )
          return true;
        })

        .end()
    })
  })


  it('transport-pins-notdef', function(fin){
    var tt = test_transport()
    var si = seneca({timeout:5555,log:'silent'})
          .use( tt )

          .client( {type:'test', pins:['foo:1','baz:2']} )

    si.act('foo:2',function(err){
      assert.ok(!!err)

      this
        .start(fin)

        .wait('foo:1,bar:1' )
        .step(function(out){
          assert.equal( 1, tt.outmsgs.length )
          assert.deepEqual( {foo:1,bar:2}, out )
          return true;
        })

        .wait('baz:2,qoo:10' )
        .step(function(out){
          assert.equal( 2, tt.outmsgs.length )
          assert.deepEqual( {baz:2,qoo:20}, out )
          return true;
        })

        .end()
    })
  })


  it('transport-single-wrap-and-star', function(fin){
    var tt = test_transport()
    var si = seneca({timeout:5555,log:'silent'})
          .use( tt )
          .add( 'foo:1', function(args,done){done(null,args)})

          .client( {type:'test', pin:'foo:1'} )
          .client( {type:'test', pin:'qaz:*'} )

          .start(fin)

          .wait('foo:1,bar:1' )
          .step(function(out){
            assert.equal( 1, tt.outmsgs.length )
            assert.deepEqual( {foo:1,bar:2}, out )
            return true;
          })

          .wait('foo:2,qaz:1,bar:1')
          .step(function(out){
            assert.equal( 2, tt.outmsgs.length )
            assert.deepEqual( {foo:2,qaz:1,bar:2}, out )
            return true;
          })

          .end()
  })


  it('transport-local-single-and-star', function(fin){
    var tt = test_transport()
    var si = seneca({timeout:5555,log:'silent'})
          .use( tt )
          .add( 'foo:1', function(args,done){done(null,{foo:1,local:1})})

          .client( {type:'test', pin:'foo:2,qaz:*'} )

    si
      .start()

          .wait('foo:1,bar:1')
          .step(function(out){
            assert.equal( 0, tt.outmsgs.length )
            assert.deepEqual( {foo:1,local:1}, out )
            return true;
          })

          .wait('foo:2,qaz:1,bar:1')
          .step(function(out){
            assert.equal( 1, tt.outmsgs.length )
            assert.deepEqual( {foo:2,qaz:1,bar:2}, out )
            return true;
          })

          .wait('foo:2,qaz:2,bar:1')
          .step(function(out){
            assert.equal( 2, tt.outmsgs.length )
            assert.deepEqual( {foo:2,qaz:2,bar:2}, out )
            return true;
          })

          .end(fin)
  })


  it('transport-local-over-wrap', function(fin){
    var tt = test_transport()
    var si = seneca({timeout:5555,log:'silent'})
          .use( tt )

          .client( {type:'test', pin:'foo:1'} )

          .add( 'foo:1', function(args,done){done(null,{foo:1,local:1})})

          .start(fin)

          .wait('foo:1,bar:1' )
          .step(function(out){
            assert.equal( 0, tt.outmsgs.length )
            assert.deepEqual( {foo:1,local:1}, out )
            return true;
          })

          .end()
  })


  it('transport-local-prior-wrap', function(fin){
    var tt = test_transport()
    var si = seneca({timeout:5555,log:'silent'})
          .use( tt )

          .client( {type:'test', pin:'foo:1'} )

          .add( 'foo:1', function(args,done){
            args.local=1
            args.qaz=1
            this.prior(args,done)
          })

          .start(fin)

          .wait('foo:1,bar:1' )
          .step(function(out){
            assert.equal( 1, tt.outmsgs.length )
            assert.deepEqual( {foo:1,bar:2,local:1,qaz:1}, out )
            return true;
          })

          .end()
  })

})




function test_transport() {

  test_transport.outmsgs = []
  return test_transport

  function test_transport( options ) {
    var seneca = this

    var tu = seneca.export('transport/utils')

    seneca.add({role:'transport',hook:'listen',type:'test'}, hook_listen_test)
    seneca.add({role:'transport',hook:'client',type:'test'}, hook_client_test)

    function hook_listen_test( args, done ) {
      var seneca         = this
      var type           = args.type
      var listen_options = seneca.util.clean(_.extend({},options[type],args))

      tu.listen_topics( seneca, args, listen_options, function(topic) {
        seneca.log.debug('listen', 'subscribe', topic+'_act', listen_options, seneca)
      })


      seneca.add('role:seneca,cmd:close',function( close_args, done ) {
        var closer = this
        closer.prior(close_args,done)
      })


      seneca.log.info('listen', 'open', listen_options, seneca)

      done()
    }


    function hook_client_test( args, clientdone ) {
      var seneca         = this
      var type           = args.type
      var client_options = seneca.util.clean(_.extend({},options[type],args))

      tu.make_client( make_send, client_options, clientdone )

      function make_send( spec, topic, send_done ) {
        seneca.log.debug('client', 'subscribe', topic+'_res', client_options, seneca)

        send_done( null, function( args, done ) {

          var outmsg = tu.prepare_request( this, args, done )

          setTimeout( function() {
            test_transport.outmsgs.push(outmsg)

            var resmsg = _.clone(outmsg)
            resmsg.res = resmsg.act
            resmsg.res.bar = resmsg.res.bar+1

            if( resmsg.res.baz ) {
              resmsg.res.qoo = resmsg.res.qoo+10
              delete resmsg.res.bar
            }

            delete resmsg.act
            resmsg.kind = 'res'

            tu.handle_response( seneca, resmsg, client_options )
          },11)
        })
      }

      seneca.add('role:seneca,cmd:close',function( close_args, done ) {
        var closer = this
        closer.prior(close_args,done)
      })
    }
  }
}
