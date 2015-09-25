/* Copyright (c) 2013-2015 Richard Rodger */
"use strict";


var assert = require('assert')


var seneca_module = require('..')


var async    = require('async')
var gex      = require('gex')
var jsonic   = require('jsonic')
var Lab      = require('lab')


var testopts = {log:'silent'}
var lab      = exports.lab = Lab.script()
var describe = lab.describe
var it       = lab.it


describe('delegation', function(){

  it('happy', function(done) {
    var si  = seneca_module(testopts)
    si.add({c:'C'},function(args,cb){
      cb(null,args)
    })
    var sid = si.delegate({a$:'A',b:'B'})

    assert.ok(gex("Seneca/0.*.*/*").on(si.toString()))
    assert.ok(gex("Seneca/0.*.*/*/{b:B}").on(sid.toString()))

    si.act({c:'C'},function(err,out){
      assert.ok(gex("{c=C,*}").on( jsonic.stringify(out)))

      sid.act({c:'C'},function(err,out){
        assert.ok(gex("{c=C,a$=A,b=B,*}").on( jsonic.stringify(out)))
        done()
      })
    })
  })



  it('dynamic', function(done) {
    var si = seneca_module(testopts)
    si.add({c:'C'},function(args,cb){
      //console.log('C='+this)
      cb(null,args)
    })
    si.add({d:'D'},function(args,cb){
      //console.log('D='+this)
      this.act({c:'C',d:'D'},cb)
    })
    var sid = si.delegate({a$:'A',b:'B'})

    async.series([
      function (next) {
        si.act({c:'C'},function(err,out){
          assert.ok(gex("{c=C,actid$=*}").on( jsonic.stringify(out)))
          next()
        })
      },
      function (next) {
        si.act({d:'D'},function(err,out){
          assert.ok(gex("{c=C,d=D,actid$=*}").on( jsonic.stringify(out)))
          next()
        })
      },
      function (next) {
        sid.act({c:'C'},function(err,out){
          assert.ok(gex("{c=C,a$=A,b=B,actid$=*}").on( jsonic.stringify(out)))
          next()
        })
      },
      function (next) {
        sid.act({d:'D'},function(err,out){
          assert.ok(gex("{c=C,d=D,actid$=*,a$=A,b=B}").on( jsonic.stringify(out)))
          next()
        })
      }
    ], done)
  })


  it('logging.actid',function(done){
    var fail
    var si = seneca_module({
      log:{
        map:[{handler:function(){
        if( 'aaa'==arguments[6] ) {
          if('debug'!=arguments[1]) fail='aaa,debug';
          if('single'!=arguments[2]) fail='aaa,single';
        }
        else if( 'ppp'==arguments[6] ) {
          if('debug'!=arguments[1]) fail='ppp,debug';
          if('plugin'!=arguments[2]) fail='ppp,plugin';
        }
      }}]}
    })

    si.add({a:'A'},function(args,cb){
      this.log.debug('aaa')
      cb(null,args)
    })

    si.use(function(opts){
      this.add({p:'P'},function(args,cb){
        this.log.debug('ppp')
        cb(null,args)
      })
      return {name:'p1'}
    })


    si.act({a:'A'},function(err,out){
      assert.ok(gex("{a=A,*}").on( jsonic.stringify(out)))
      si.act({p:'P'},function(err,out){
        assert.ok(gex("{p=P,*}").on( jsonic.stringify(out)))

        if( fail ) {
          console.log(fail)
          assert.fail(fail)
        }

        done()
      })
    })
  })

  it('parent', function(done) {
    var si  = seneca_module(testopts)
    si.add({c:'C'},function(args,cb){
      //console.log('C='+this)
      args.a=1
      cb(null,args)
    })
    si.add({c:'C'},function(args,cb){
      this.parent(args,function(err,out){
        out.p=1
        cb(err,out)
      })
    })
    var sid = si.delegate({b:'B'})

    si.act({c:'C'},function(err,out){
      done()
    })
  })



  it('parent.plugin',function(done){
    var si = seneca_module(testopts)

    async.series([
      function (next) {
        si.use(function(opts){
          this.add({a:'A'},function(args,cb){
            this.log.debug('P','1')
            args.p1=1
            cb(null,args)
          })
          return {name:'p1'}
        })

        si.act({a:'A'},function(err,out){
          assert.ok(gex("{a=A,actid$=*,p1=1}").on( jsonic.stringify(out)))
          next()
        })
      },
      function (next) {
        si.use(function(opts){
          this.add({a:'A'},function(args,cb){
            this.log.debug('P','2a')

            this.parent(args,function(err,out){
              this.log.debug('P','2b')
              out.p2=1
              cb(err,out)
            })
          })
          return {name:'p2'}
        })

        si.act({a:'A'},function(err,out){
          assert.ok(gex("{a=A,actid$=*,p1=1,p2=1}").on( jsonic.stringify(out)))
          next()
        })
      },
      function (next) {
        si.use(function(opts){
          this.add({a:'A'},function(args,cb){
            this.log.debug('P','3a')

            this.parent(args,function(err,out){
              this.log.debug('P','3b')
              out.p3=1
              cb(err,out)
            })
          })
          return {name:'p3'}
        })

        si.act({a:'A'},function(err,out){
          assert.ok(gex("{a=A,actid$=*,p1=1,p2=1,p3=1}").on( jsonic.stringify(out)))
          next()
        })
      }
    ], done)
  })
})
