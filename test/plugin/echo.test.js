/* Copyright (c) 2010-2011 Ricebridge */

var common   = require('common')
var Seneca   = require('seneca')

var eyes    = common.eyes
var assert  = common.assert
var gex     = common.gex

var logger = require('../logassert')



// echo is really a test of the plugin system
module.exports = {
  
  echo: function() {
    Seneca.init({logger:logger([]),plugins:['echo']},function(err,seneca){
      assert.isNull(err)

      seneca.act({on:'echo',baz:'bax'},function(err,out){
        assert.isNull(err)
        assert.equal(''+{baz:'bax'},''+out)
      })
    })
  },

  echo_options: function() {
    Seneca.init({logger:logger([]),plugins:[{
      name:'echo',
      options:{inject:{foo:'bar'}}
    }]},function(err,seneca){
      assert.isNull(err)

      seneca.act({on:'echo',baz:'bax'},function(err,out){
        assert.isNull(err)
        assert.equal(''+{baz:'bax',foo:'bar'},''+out)
      })
    })
  }
  
}