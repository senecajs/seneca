/* Copyright (c) 2014-2015 Richard Rodger, MIT License */
"use strict";


// mocha error.test.js

var util   = require('util')
var assert = require('assert')

var seneca   = require('..')
var common   = require('../lib/common')

var gex = require('gex')


var testopts = {log:'silent'}

process.setMaxListeners(0)

describe('seneca', function(){


  it('act_not_found', act_not_found)

  it('param_caller', param_caller)

  it('exec_action_throw',             exec_action_throw)
  it('exec_action_throw_nolog',       exec_action_throw_nolog)
  it('exec_action_errhandler_throw',  exec_action_errhandler_throw)

  it('exec_action_result',            exec_action_result)
  it('exec_action_result_nolog',      exec_action_result_nolog)
  it('exec_action_errhandler_result', exec_action_errhandler_result)

  it('action_callback',   action_callback)


  it('ready_die', ready_die)

  it('legacy_fail', legacy_fail)



  function act_not_found(fin){
    var ctxt = {errlog:null}
    var si   = make_seneca(ctxt)

    // ~~ CASE: fire-and-forget; err-logged
    si.act('a:1')
    assert.equal('act_not_found',ctxt.errlog[9])

    // ~~ CASE: callback; default
    ctxt.errlog = null
    si.act('a:1,default$:{x:1}',function(err,out){
      assert.ok(null==err)
      assert.ok(null==ctxt.errlog)
      assert.ok(out.x)
    })

    // ~~ CASE: callback; no-default; err-result; err-logged
    si.act('a:1',function(err,out){
      assert.ok(null==out)
      assert.equal('act_not_found',err.code)
      assert.equal('act_not_found',ctxt.errlog[9])

      // ~~ CASE: callback; bad-default; err-result; err-logged
      si.act('a:1,default$:"foo"',function(err,out){
        assert.ok(null==out)
        assert.equal('act_default_bad',err.code)
        assert.equal('act_default_bad',ctxt.errlog[9])

        // ~~ CASE: fragile; throws; err-logged
        si.options({debug:{fragile:true}})
        ctxt.errlog = null

        try {
          si.act('a:1',function(err,out){
            assert.fail()
          })
          assert.fail()
        }
        catch(ex) {
          assert.equal('act_not_found',ex.code)
          assert.equal('act_not_found',ctxt.errlog[9])
        }
        
        return fin();
      })
    })
  }



  function param_caller(fin){
    var ctxt = {errlog:null}
    var si   = make_seneca(ctxt)

    si.ready(function(){
      si.add('a:1,b:{required$:true}',function(args,done){this.good({x:1})})
      
      // ~~ CASE: callback; args-invalid; err-result; err-logged
      si.act('a:1',function(err){
        assert.equal('act_invalid_args',err.code)
        assert.equal('act_invalid_args',ctxt.errlog[15])

        // ~~ CASE: callback; args-valid
        si.act('a:1,b:1',function(err,out){
          assert.ok(null==err)
          assert.equal(1,out.x)
          fin();
        })
      })
    })
  }



  function exec_action_throw(fin){
    var ctxt = {errlog:null,fin:fin,log:true,name:'throw'}
    var si   = make_seneca(ctxt)

    si.add('a:1',function(args,done){
      throw new Error('AAA')
    })

    test_action( si, ctxt )
  }


  function exec_action_result(fin){
    var ctxt = {errlog:null,fin:fin,log:true,name:'result'}
    var si   = make_seneca(ctxt)

    si.add('a:1',function(args,done){
      done(new Error('BBB'))
    })

    test_action( si, ctxt )
  }


  function exec_action_throw_nolog(fin){
    var ctxt = {errlog:null,fin:fin,log:false,name:'throw_nolog'}
    var si   = make_seneca(ctxt)

    si.add('a:1',function(args,done){
      var err = new Error('CCC')
      err.log = false
      throw err;
    })

    test_action( si, ctxt )
  }


  function exec_action_result_nolog(fin){
    var ctxt = {errlog:null,fin:fin,log:false,name:'result_nolog'}
    var si   = make_seneca(ctxt)

    si.add('a:1',function(args,done){
      var err = new Error('CCC')
      err.log = false
      done(err)
    })

    test_action( si, ctxt )
  }



  function exec_action_errhandler_throw(fin){
    var ctxt = {errlog:null}
    var si   = make_seneca(ctxt)

    si.options({
      errhandler:function(err){
        try {
          assert.equal('act_execute',err.code)
          assert.equal('a:1',err.details.pattern)
          assert.ok(-1 != err.message.indexOf('AAA'+aI))

          aI++

          if( 1 < aI ) return true;
          else fin();
        }
        catch(e) { 
          fin(e)
          return true;
        }
      }
    })


    var aI = 0
    si.add('a:1',function(args,done){
      throw new Error('AAA'+aI)
    })


    // ~~ CASE: action-throws; callback; errhandler-nostop
    si.act('a:1',function(err,out){

      // Need to use try-catch here as we've subverted the log
      // to test logging.
      try {
        assert.ok( null == out )
        assert.equal('act_execute',err.code)
        assert.equal('a:1',err.details.pattern)
        assert.equal('act_execute',ctxt.errlog[15])

        ctxt.errlog = null

        // ~~ CASE: action-throws; no-callback; errhandler-nostop
        si.on('act-err',function(args,err){
          if( 1 == aI ) {
            try {
              assert.equal(1,args.a)
              assert.equal('act_execute',err.code)
              assert.equal('a:1',err.details.pattern)
              assert.equal('act_execute',ctxt.errlog[15])

              // ~~ CASE: action-throws; callback; errhandler-stops
              ctxt.errlog = null
              si.act('a:1',function(err,out){
                try { assert.fail() } catch(e) { fin(e) }
              })
            }
            catch(e) { fin(e) }
          }
        })
        si.act('a:1')
        
      } 
      catch(e) { fin(e) }
    })
  }


  function exec_action_errhandler_result(fin){
    var ctxt = {errlog:null}
    var si   = make_seneca(ctxt)

    si.options({
      errhandler:function(err){
        try {
          assert.equal('act_execute',err.code)
          assert.equal('a:1',err.details.pattern)
          assert.ok(-1 != err.message.indexOf('AAA'+aI))

          aI++

          if( 1 < aI ) return true;
          else fin();
        }
        catch(e) { 
          fin(e)
          return true;
        }
      }
    })


    var aI = 0
    si.add('a:1',function(args,done){
      done(new Error('AAA'+aI))
    })


    // ~~ CASE: action-throws; callback; errhandler-nostop
    si.act('a:1',function(err,out){

      // Need to use try-catch here as we've subverted the log
      // to test logging.
      try {
        assert.ok( null == out )
        assert.equal('act_execute',err.code)
        assert.equal('a:1',err.details.pattern)
        assert.equal('act_execute',ctxt.errlog[15])

        ctxt.errlog = null

        // ~~ CASE: action-throws; no-callback; errhandler-nostop
        si.on('act-err',function(args,err){
          if( 1 == aI ) {
            try {
              assert.equal(1,args.a)
              assert.equal('act_execute',err.code)
              assert.equal('a:1',err.details.pattern)
              assert.equal('act_execute',ctxt.errlog[15])

              // ~~ CASE: action-throws; callback; errhandler-stops
              ctxt.errlog = null
              si.act('a:1',function(err,out){
                try { assert.fail() } catch(e) { fin(e) }
              })
            }
            catch(e) { fin(e) }
          }
        })
        si.act('a:1')
        
      } 
      catch(e) { fin(e) }
    })
  }


  function make_seneca( ctxt ) {
    var si = seneca(testopts)
    si.options({
      log:{map:[{level:'error+',handler:function(){
        ctxt.errlog = common.arrayify(arguments)
      }}]},
      trace: { unknown: 'error' }
    })
    return si;
  }



  function test_action( si, ctxt ) {

    // ~~ CASE: action; callback; no-errhandler
    si.act('a:1',function(err,out){

      // Need to use try-catch here as we've subverted the log
      // to test logging.
      try {
        assert.ok( null == out )
        assert.equal('act_execute', err.code, ctxt.name+'-A' )
        assert.equal('a:1', err.details.pattern, ctxt.name+'-B' )

        if( ctxt.log ) {
          assert.equal('act_execute', ctxt.errlog[15], ctxt.name+'-C' )
        }
        else {
          assert.ok( null == ctxt.errlog )
        }

        ctxt.errlog = null

        // ~~ CASE: action; no-callback; no-errhandler
        si.on('act-err',function(args,err){
          try {
            assert.equal(1,args.a)
            assert.equal('act_execute', err.code, ctxt.name+'-D' )
            assert.equal('a:1', err.details.pattern, ctxt.name+'-E' )

            if( ctxt.log ) {
              assert.equal('act_execute', ctxt.errlog[15], ctxt.name+'-F' )
            }

            ctxt.fin()
          }
          catch(e) { ctxt.fin(e) }
        })
        si.act('a:1')

      } 
      catch(e) { ctxt.fin(e) }
    })
  }



  function action_callback(fin){
    var ctxt = {errlog:null}
    var si   = make_seneca(ctxt)

    var log_it = true

    si.options({errhandler:function(err){
      assert.equal('act_callback', err.code, 'callback-G' )
      assert.equal('seneca: Action a:1 callback threw: DDD.',err.message)

      if( log_it ) {
        assert.equal('act_callback', ctxt.errlog[15], 'callback-H' )
      }
      else {
        assert.ok( null == ctxt.errlog )
        fin();
      }
    }})

    si.ready(function(){
      si.add('a:1',function(args,done){this.good({x:1})})
      

      setTimeout( function(){
        // ~~ CASE: action; callback; callback-throws; log
        si.act('a:1',function(err,out){
          assert.ok(out.x)
          throw new Error('DDD');
        })
      },20)

      setTimeout( function(){
        // ~~ CASE: action; callback; callback-throws; no-log
        si.act('a:1',function(err,out){
          assert.ok(out.x)
          var e = new Error('DDD')
          e.log = false
          log_it = false
          ctxt.errlog = null
          throw e;
        })
      },40)

    })
  }


  function ready_die(fin) {
    var si = seneca({
      log:'silent',
      debug:{undead:true},
      errhandler:function(err){
        try {
          assert.ok(err.foo)
          assert.equal('seneca: Ready function failed: EEE',err.message)
          fin()
        }
        catch(e){fin(e)}
      }
    })

    si.ready(function(){
      var e = new Error('EEE')
      e.foo = true
      throw e;
    })
  }


  function legacy_fail(fin) {
    var si = seneca({
      log:'silent',
    })

    si.options({errhandler:function(err){
      try {
        assert.equal('foo',err.code)
        assert.deepEqual({bar:1},err.details)
      }
      catch(e){fin(e)}
    }})

    var err = si.fail('foo',{bar:1})
    assert.equal('foo',err.code)
    assert.deepEqual({bar:1},err.details)


    si.options({errhandler:function(err){
      try {
        assert.equal('FOO',err.code)
        assert.deepEqual({BAR:1},err.details)
      }
      catch(e){fin(e)}
    }})

    var err = si.fail('FOO',{BAR:1},function(err){
      assert.equal('FOO',err.code)
      assert.deepEqual({BAR:1},err.details)
      setImmediate(fin)
    })

    assert.equal('FOO',err.code)
    assert.deepEqual({BAR:1},err.details)
  }

})


