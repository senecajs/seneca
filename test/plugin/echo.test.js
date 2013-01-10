/* Copyright (c) 2010-2012 Ricebridge */

"use strict"


var events = require('events')

var assert = require('chai').assert

var seneca = require('../..')



describe('plugin.echo', function() {

  it('happy', function() {
    var si = seneca({log:{map:[{type:'init',handler:seneca.loghandler.stream(process.stdout)}]}})
    si.use('echo')

    si.act({role:'echo',baz:'bax'},function(err,out){
      assert.isNull(err)
      assert.equal(''+{baz:'bax'},''+out)
      //console.dir(out)
    })
  })
  
  
  it('options', function() {
    var printevents = new events.EventEmitter()
    printevents.on('log',function(data){ console.log(data) })

    var si = seneca({log:{map:[{type:'init',handler:seneca.loghandler.emitter(printevents)}]}})
    si.use('echo',{inject:{foo:'bar'}})

    si.act({role:'echo',baz:'bax'},function(err,out){
      assert.isNull(err)
      assert.equal(''+{baz:'bax',foo:'bar'},''+out)
      //console.dir(out)
    })
  })
})