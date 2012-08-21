/* Copyright (c) 2010-2012 Richard Rodger */

var common   = require('../lib/common');
var seneca   = require('../lib/seneca');

var E = common.E;

var eyes    = common.eyes
var assert  = common.assert
var gex     = common.gex

var logger = require('./logassert')


module.exports = {

  plugins: function() {

    // built-in

    seneca.init({logger:logger([]),plugins:['echo']},function(err,si){
      assert.isNull(err)

      si.act({on:'echo',baz:'bax'},function(err,out){
        assert.isNull(err)
        assert.equal(''+{baz:'bax'},''+out)
      })
    })



    seneca.init({logger:logger([]),plugins:['util']},function(err,si){
      assert.isNull(err)

      si.act({on:'util',cmd:'quickcode'},function(err,code){
        assert.isNull(err)
        assert.equal( 8, code.length )
        assert.isNull( /[ABCDEFGHIJKLMNOPQRSTUVWXYZ]/.exec(code) )
      })
    })



    // register

    function Mock1() {
      var self = {}
      self.name = 'mock1'
      self.plugin = function() {
        return self
      }
      self.init = function(si,opts,cb){
        si.add({on:self.name,cmd:'foo'},function(args,si,cb){
          cb(null,'foo:'+args.foo)
        })
        cb()
      }
      return self
    }

    seneca.register(new Mock1())

    seneca.init(
      {plugins:['mock1'], logger:logger()},
      function(err,si){
        assert.isNull(err)

        si.act({on:'mock1',cmd:'foo',foo:1},function(err,out){
          assert.equal('foo:1',out)
        })
      }
    )


    var mock1a = new Mock1()
    mock1a.name = 'mock1a'
    seneca.register(mock1a)

    seneca.init(
      {plugins:[mock1a], logger:logger()},
      function(err,si){
        assert.isNull(err)

        si.act({on:'mock1a',cmd:'foo',foo:1},function(err,out){
          assert.equal('foo:1',out)
        })
      }
    )


    // parent

    function Mock2() {
      var self = this
      self.name = 'mock2'
      self.plugin = function() {
        return self
      }
      self.init = function(si,opts,cb){
        si.add({on:'mock1',cmd:'foo'},function(args,si,cb){
          args.parent$(args,si,function(err,out){
            cb(null,'bar:'+out)
          })
        })
        cb()
      }
    }


    seneca.register(new Mock2())

    seneca.init(
      {plugins:[new Mock1(), new Mock2()], logger:logger()},
      function(err,si){
        assert.isNull(err)

        si.act({on:'mock1',cmd:'foo',foo:2},function(err,out){
          assert.equal('bar:foo:2',out)
        })
      }
    )


    seneca.init(
      {plugins:['echo'], logger:logger()},
      function(err,si){
        assert.isNull(err)

        si.act({on:'echo',cmd:'foo',bar:1},function(err,out){
          assert.equal( JSON.stringify({cmd:'foo',bar:1}), JSON.stringify(out) )
        })
      }
    )


    // require module

    seneca.init(
      {plugins:['mock3'], logger:logger()},
      function(err,si){
        assert.isNull(err)

        si.act({on:'mock3',cmd:'qaz',foo:3},function(err,out){
          assert.equal('qaz:3',out)
        })
      }
    )


  }


}