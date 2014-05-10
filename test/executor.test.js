/* Copyright (c) 2014 Richard Rodger, MIT License */
"use strict";


// mocha executor.test.js

var util = require('util')

var _ = require('underscore')
var assert  = require('chai').assert
var timerstub = require('timerstub')

var executor = require('../lib/executor')




describe('executor', function(){

  it('happy', function(fin) {

    var e0 = executor({
      trace:true,
      timeout:300,
      stubs:timerstub
    })

    var printlog = []
    
    function print(err,out){
      if( err ) return printlog.push('ERROR: '+err)
      printlog.push(''+out)
    }

    function mfn(a,d) {
      var f = function(cb){ 
        timerstub.setTimeout(function(){
          if( 'b'==a ) return cb(new Error('B'));
          cb(null,a)
        },d) 
      }
      return f
    }

    var start = timerstub.Date.now()
    e0.execute({id:'a',fn:mfn('a', 50),  cb:print})
    e0.execute({id:'b',fn:mfn('b', 50),  cb:print})
    e0.execute({id:'c',fn:mfn('cG',100), cb:print,gate:true})
    e0.execute({id:'d',fn:mfn('d', 50),  cb:print})

    timerstub.setTimeout( function(){
      e0.execute({id:'e',fn:mfn('eG', 100), cb:print,gate:true})
      e0.execute({id:'f',fn:mfn('fG', 100), cb:print,gate:true})
      e0.execute({id:'g',fn:mfn('g',  50),  cb:print})
      e0.execute({id:'h',fn:mfn('h',  50),  cb:print})

      e0.execute({id:'i',fn:mfn('i',350),cb:print})
    },200)

    timerstub.setTimeout( function(){
      e0.execute({id:'j',fn:mfn('j',50),cb:print})
      e0.execute({id:'k',fn:mfn('k',50),cb:print})
    },700)

    timerstub.setTimeout( function(){
      assert.equal("[ 'a',  'ERROR: Error: B',  'cG',  'd',  'eG',  'fG',  'g',  'h',  'ERROR: Error: [TIMEOUT]',  'j',  'k' ]",
                   util.inspect(printlog).replace(/\n/g,''))
      assert.equal( "0,work,a~0,work,b~0,gate,c~0,wait,d~0,work,c~50,done,a~50,done,b~100,done,c~100,ungate~100,work,d~150,done,d~200,gate,e~200,gate,f~200,wait,g~200,wait,h~200,wait,i~200,work,e~300,done,e~300,work,f~400,done,f~400,ungate~400,work,g~400,work,h~400,work,i~450,done,g~450,done,h~700,work,j~700,work,k~700,timeout,i~750,done,j~750,done,k", (_.map(e0.tracelog,function(entry){entry[0]=entry[0]-start;return entry.join()})).join('~') )
    },800)

    timerstub.wait(900,fin)
  })


  it('no-callback',function(fin){
    var e1 = executor({
      trace:true,
      timeout:300,
      stubs:timerstub
    })

    var t1 = false
    var start = timerstub.Date.now()
    e1.execute({id:'a',fn:function(done){t1=true;done()}})
    timerstub.wait(900,function(){
      assert.ok(t1)
      fin()
    })
  })


  it('ignore-gate',function(fin){
    var e1 = executor({
      trace:true,
      timeout:100,
      stubs:timerstub
    })

    var seq = ''


    e1.execute({id:'a',fn:function(done){seq+='a';done()}})
    e1.execute({id:'b',gate:true,fn:function(done){
      seq+='b'

      e1.execute({id:'c',ignoregate:true,fn:function(done2){
        seq+='c'

        done2()
        done()
      }})

      e1.execute({id:'d',gate:true,fn:function(done3){
        seq+='d'
        timerstub.setTimeout(done3,100)
      }})

      
    }})
    e1.execute({id:'e',fn:function(done){seq+='e';done()}})

    timerstub.wait(200,function(){
      assert.equal('abcde',seq)
      fin()
    })
  })

})
