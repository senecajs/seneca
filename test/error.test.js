/* Copyright (c) 2014 Richard Rodger, MIT License */
"use strict";


// mocha error.test.js

var util   = require('util')

var seneca   = require('..')
var common   = require('../lib/common')

var assert  = require('chai').assert
var gex     = require('gex')
var _ = require('underscore')


var testopts = {log:'silent'}



describe('seneca', function(){

  // error generators
  // ex:  param, exec, action, callback, ready
  // res: err

  // error receivers
  // caller, callback, errhandler


  it('act_not_found', act_not_found)

  it('param_caller', param_caller)

  it('exec_action_throw',        exec_action_throw)
  it('exec_action_throw_nolog',  exec_action_throw_nolog)
  it('exec_action_errhandler_throw',    exec_action_errhandler_throw)

  it('exec_action_result',       exec_action_result)
  it('exec_action_result_nolog', exec_action_result_nolog)
  it('exec_action_errhandler_result',   exec_action_errhandler_result)

  //it('exec_action',       exec_action)
  //it('exec_callback',     exec_callback)
  //it('exec_errhandler',   exec_errhandler)

  //it('action_callback',   action_callback)
  //it('action_errhandler', action_errhandler)

  //it('callback_errhandler', callback_errhandler)

  //it('ready', ready)


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


      // ~~ CASE: fragile; throws; err-logged
      si.options({debug:{fragile:true}})
      ctxt.errlog = null

      try {
        si.act('a:1',function(err,out){
          assert.fail()
        })
        assert.fail()
      }
      catch(e) {
        assert.equal('act_not_found',err.code)
        assert.equal('act_not_found',ctxt.errlog[9])
      }
        
      return fin();
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
    si.options({log:{map:[{level:'error+',handler:function(){
      ctxt.errlog = common.arrayify(arguments)
    }}]}})
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

})


