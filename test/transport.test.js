/* Copyright (c) 2014-2015 Richard Rodger, MIT License */
"use strict";


// mocha transport.test.js

var util   = require('util')
var assert  = require('assert')

var common   = require('../lib/common')
var seneca   = require('..')

var gex   = require('gex')
var _     = require('lodash')
var async = require('async')


process.setMaxListeners(0)


function testact( args, done ) {
  var seneca = this
  setTimeout( function() {
    var out = seneca.util.clean(_.clone(args))
    out.bar = out.bar+1

    if( out.baz ) {
      out.qoo = out.qoo+10
      delete out.bar
    }

    done(null,out)
  },11)
}


describe('transport', function(){

  // TODO: test top level qaz:* : def and undef other pats


  it('transport-exact-single', function(fin){
    var tt = make_test_transport()

    seneca({tag:'srv',timeout:5555,log:'silent',debug:{short_logs:true}})
      .use( tt )
      .add('foo:1',function(args,done){

        // ensure action id is transferred for traceability
        assert.equal('aaa',args.meta$.id)
        testact.call(this,args,done)
      })
      .listen( {type:'test',pin:'foo:1'} )
      .ready(function(){

        var si = seneca({tag:'cln',timeout:5555,log:'silent',
                         debug:{short_logs:true}})
              .use( tt )
        
              .client( {type:'test', pin:'foo:1'} )
        
              .start(fin)

              .wait('foo:1,actid$:aaa')
              .step(function(out){
                assert.ok(1,out.foo)
                return true;
              })
        
              .end()
      })
  })


  it('transport-star', function(fin){
    var tt = make_test_transport()

    var server = seneca({timeout:5555,log:'silent',debug:{short_logs:true}})
          .use( tt )
          .add('foo:1',testact)
          .add('foo:2',testact)
          .listen( {type:'test',pin:'foo:*'} )
          .ready(function(){

            var si = seneca({timeout:5555,log:'silent',debug:{short_logs:true}})
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
                      assert.equal('act_not_found',err.code)            
                      done()
                    })
                  })

                  .end()
          })
  })


  it('transport-single-notdef', function(fin){
    var tt = make_test_transport()

    var server = seneca({timeout:5555,log:'silent',debug:{short_logs:true}})
          .use( tt )
          .add('foo:1',testact)
          .listen( {type:'test',pin:'foo:*'} )
          .ready(function(){

            var si = seneca({timeout:5555,log:'silent',debug:{short_logs:true}})
                  .use( tt )
                  .client( {type:'test', pin:'foo:1'} )

            si.act('foo:2',function(err){
              assert.ok(err.code,'act_not_found')

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
  })


  it('transport-pins-notdef', function(fin){
    var tt = make_test_transport()

    var server = seneca({timeout:5555,log:'silent',debug:{short_logs:true}})
          .use( tt )
          .add('foo:1',testact)
          .add('baz:2',testact)
          .listen( {type:'test',pins:['foo:1','baz:2']} )
          .ready(function(){

            var si = seneca({timeout:5555,log:'silent',debug:{short_logs:true}})
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
  })


  it('transport-single-wrap-and-star', function(fin){
    var tt = make_test_transport()

    var server = seneca({timeout:5555,log:'silent',debug:{short_logs:true}})
          .use( tt )
          .add('foo:1',testact)
          .add('qaz:1',testact)
          .listen( {type:'test',pin:'foo:1'} )
          .listen( {type:'test',pin:'qaz:*'} )
          .ready(function(){

            var si = seneca({timeout:5555,log:'silent',debug:{short_logs:true}})
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

            // foo:1 wins - it's more specific
                  .wait('foo:1,qaz:1,bar:1' )
                  .step(function(out){
                    assert.equal( 2, tt.outmsgs.length )
                    assert.deepEqual( {foo:1,qaz:1,bar:2}, out )
                    return true;
                  })

                  .wait('foo:2,qaz:1,bar:1')
                  .step(function(out){
                    assert.equal( 3, tt.outmsgs.length )
                    assert.deepEqual( {foo:2,qaz:1,bar:2}, out )
                    return true;
                  })

                  .end()
          })
  })


  it('transport-local-single-and-star', function(fin){
    var tt = make_test_transport()

    var server = seneca({timeout:5555,log:'silent',debug:{short_logs:true}})
          .use( tt )
          .add('foo:2,qaz:1',testact)
          .add('foo:2,qaz:2',testact)
          .listen( {type:'test',pin:'foo:2,qaz:*'} )
          .ready(function(){

            var si = seneca({timeout:5555,log:'silent',debug:{short_logs:true}})
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
  })


  it('transport-local-over-wrap', function(fin){
    var tt = make_test_transport()

    var server = seneca({timeout:5555,log:'silent',debug:{short_logs:true}})
          .use( tt )
          .add('foo:1',testact)
          .listen( {type:'test',pin:'foo:1'} )
          .ready(function(){

            var si = seneca({timeout:5555,log:'silent',debug:{short_logs:true}})
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
  })


  it('transport-local-prior-wrap', function(fin){
    var tt = make_test_transport()

    var server = seneca({timeout:5555,log:'silent',debug:{short_logs:true}})
          .use( tt )
          .add('foo:1',testact)
          .listen( {type:'test',pin:'foo:1'} )
          .ready(function(){


            var si = seneca({timeout:5555,log:'silent',debug:{short_logs:true}})
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


  it('transport-init-ordering', function(fin){
    var tt = make_test_transport()

    var inits = {}

    seneca({timeout:5555,log:'silent',debug:{short_logs:true}})
          .use( tt )
          .add('foo:1',testact)
          .use(function bar(){
            this.add('bar:1',testact)
            this.add('init:bar',function(a,d){inits.bar=1;d()})
          })

          .client()

          .add('foo:2',testact)
          .use(function zed(){
            this.add('zed:1',testact)
            this.add('init:zed',function(a,d){inits.zed=1;d()})
          })

          .listen()

          .add('foo:3',testact)
          .use(function qux(){
            this.add('qux:1',testact)
            this.add('init:qux',function(a,d){inits.qux=1;d()})
          })

      .ready(function(){
        assert.ok(inits.bar)
        assert.ok(inits.zed)
        assert.ok(inits.qux)

        this.close(fin)
      })
  })  


  it('transport-no-plugin-init', function(fin){
    var tt = make_test_transport()

    var inits = {}

    seneca({timeout:5555,log:'silent',debug:{short_logs:true}})
      .use( tt )
      .client()

      .add('foo:1',testact)
      .use(function bar(){
        this.add('bar:1',testact)
      })

      .listen()

      .add('foo:2',testact)
      .use(function zed(){
        this.add('zed:1',testact)
      })

      .ready(function(){
        this.
          start(fin)

         .wait('foo:1')
          .step(function(out){
            assert.equal(1,out.foo)
            return true;
          })

          .wait('bar:1')
          .step(function(out){
            assert.equal(2,out.bar)
            return true;
          })

          .wait('zed:1')
          .step(function(out){
            assert.equal(1,out.zed)
            return true;
          })

          .end(function(err){
            if(err) return fin(err);
            this.close(fin)
          })
      })
  })  

})



// A simple transport that uses async.queue as the transport mechanism
function make_test_transport() {

  test_transport.outmsgs  = []
  test_transport.queuemap = {}

  return test_transport;


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
        seneca.log.debug('listen', 'subscribe', topic+'_act', 
                         listen_options, seneca)

        test_transport.queuemap[topic+'_act'] = async.queue(function(data,done){
          tu.handle_request( seneca, data, listen_options, function(out) {
            if( null == out ) return done();

            test_transport.outmsgs.push(out)

            test_transport.queuemap[topic+'_res'].push(out)
            return done();
          })
        })
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

        test_transport.queuemap[topic+'_res'] = async.queue(function(data,done){
          tu.handle_response( seneca, data, client_options )
          return done();
        })

        send_done( null, function( args, done ) {
          if( !test_transport.queuemap[topic+'_act'] ) {
            return done(new Error('Unknown topic:'+topic+
                                  ' for: '+util.inspect(args)))
          }
          var outmsg = tu.prepare_request( seneca, args, done )
          test_transport.queuemap[topic+'_act'].push(outmsg)
        })
      }

      seneca.add('role:seneca,cmd:close',function( close_args, done ) {
        var closer = this
        closer.prior(close_args,done)
      })
    }
  }
}

