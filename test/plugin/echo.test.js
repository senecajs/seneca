/* Copyright (c) 2010-2012 Ricebridge */

var seneca   = require('../../lib/seneca.js')
var common   = require('../../lib/common.js')

var eyes    = common.eyes
var assert  = common.assert
var gex     = common.gex




// echo is really a test of the plugin system
module.exports = {
  
  echo: function() {
    var si = seneca({log:'print',plugins:['echo']})

    si.act({role:'echo',baz:'bax'},function(err,out){
      assert.isNull(err)
      assert.equal(''+{baz:'bax'},''+out)
      //console.dir(out)
    })
  },

  echo_options: function() {
    var si = seneca({log:'print'})
    si.use('echo',{inject:{foo:'bar'}})

    si.act({role:'echo',baz:'bax'},function(err,out){
      assert.isNull(err)
      assert.equal(''+{baz:'bax',foo:'bar'},''+out)
      //console.dir(out)
    })
  }
  
}