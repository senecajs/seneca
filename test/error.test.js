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


  it('act_not_found',      act_not_found)

  it('param_caller',      param_caller)

  it('exec_action_simple', exec_action_simple)
  it('exec_action_errhandler', exec_action_errhandler)

  //it('exec_action',       exec_action)
  //it('exec_callback',     exec_callback)
  //it('exec_errhandler',   exec_errhandler)

  //it('action_callback',   action_callback)
  //it('action_errhandler', action_errhandler)

  //it('callback_errhandler', callback_errhandler)

  //it('ready', ready)


  function act_not_found(fin){
    var errlog

    var si = seneca(testopts)
    si.options({log:{map:[{level:'error+',handler:function(){
      errlog = common.arrayify(arguments)
    }}]}})

    // case: fire-and-forget; err-logged
    si.act('a:1')
    assert.equal('act_not_found',errlog[9])


    // case: callback; default
    errlog = null
    si.act('a:1,default$:{x:1}',function(err,out){
      assert.ok(null==err)
      assert.ok(null==errlog)
      assert.ok(out.x)
    })


    // case: callback; no-default; err-result; err-logged
    si.act('a:1',function(err,out){
      assert.ok(null==out)
      assert.equal('act_not_found',err.code)
      assert.equal('act_not_found',errlog[9])


      // case: fragile; throws; err-logged
      si.options({debug:{fragile:true}})
      errlog = null

      try {
        si.act('a:1',function(err,out){
          assert.fail()
        })
        assert.fail()
      }
      catch(e) {
        assert.equal('act_not_found',err.code)
        assert.equal('act_not_found',errlog[9])
      }
        
      return fin();
    })
  }



  function param_caller(fin){
    var errlog

    var si = seneca(testopts)
    si.options({log:{map:[{level:'error+',handler:function(){
      errlog = common.arrayify(arguments)
    }}]}})

    si.ready(function(){
      si.add('a:1,b:{required$:true}',function(args,done){this.good({x:1})})

      
      // case: callback; args-invalid; err-result; err-logged
      si.act('a:1',function(err){
        assert.equal('act_invalid_args',err.code)
        assert.equal('act_invalid_args',errlog[15])

        // case: callback; args-valid
        si.act('a:1,b:1',function(err,out){
          assert.ok(null==err)
          assert.equal(1,out.x)
          fin();
        })
      })
    })
  }



  function exec_action_simple(fin){
    var errlog

    var si = seneca(testopts)
    si.options({log:{map:[{level:'error+',handler:function(){
      errlog = common.arrayify(arguments)
    }}]}})

    si.add('a:1',function(args,done){
      throw new Error('AAA')
    })


    // case: action-throws; callback; no-errhandler
    si.act('a:1',function(err,out){
      // Need to use try-catch here as we've subverted the log
      // to test logging.
      try {
        assert.ok( null == out )
        assert.equal('act_execute',err.code)
        assert.equal('act_execute',errlog[15])

        errlog = null

        // case: action-throws; no-callback; no-errhandler
        si.on('act-err',function(args,err){
          try {
            assert.equal(1,args.a)
            assert.equal('act_execute',err.code)
            assert.equal('act_execute',errlog[15])
            fin()
          }
          catch(e) { fin(e) }
        })
        si.act('a:1')

      } 
      catch(e) { fin(e) }
    })
  }


  function exec_action_errhandler(fin){
    var errlog

    var si = seneca(testopts)
    si.options({
      log:{map:[{level:'error+',handler:function(){
        errlog = common.arrayify(arguments)
      }}]},
      errhandler:function(err){
        try {
          //console.log(err)
          // TODO: should be a seneca package error
          assert.equal('act_execute',err.code)
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


    // case: action-throws; callback; errhandler-nostop
    si.act('a:1',function(err,out){

      // Need to use try-catch here as we've subverted the log
      // to test logging.
      try {
        assert.ok( null == out )
        assert.equal('act_execute',err.code)
        assert.equal('act_execute',errlog[15])

        errlog = null

        // case: action-throws; no-callback; errhandler-nostop
        si.on('act-err',function(args,err){
          if( 1 == aI ) {
            try {
              assert.equal(1,args.a)
              assert.equal('act_execute',err.code)
              assert.equal('act_execute',errlog[15])

              // case: action-throws; callback; errhandler-stops
              errlog = null
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

})

