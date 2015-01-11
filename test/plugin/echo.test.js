/* Copyright (c) 2010-2015 Richard Rodger, MIT License */
"use strict"


var assert = require('assert')

var events = require('events')

var seneca = require('../..')



describe('plugin.echo', function() {

  it('happy', function() {
    var si = seneca({log:{map:[{type:'init',
                                handler:seneca.loghandler.stream(process.stdout)}]}})
    si.use('echo')

    si.act({role:'echo',baz:'bax'},function(err,out){
      assert.isNull(err)
      assert.equal(''+{baz:'bax'},''+out)
    })
  })
  
  
  it('options', function() {
    var printevents = new events.EventEmitter()
    printevents.on('log',function(data){ console.log(data) })

    var si = seneca({log:{map:[{type:'init',
                                handler:seneca.loghandler.emitter(printevents)}]}})
    si.use('echo',{inject:{foo:'bar'}})

    si.act({role:'echo',baz:'bax'},function(err,out){
      assert.isNull(err)
      assert.equal(''+{baz:'bax',foo:'bar'},''+out)
    })
  })
})
