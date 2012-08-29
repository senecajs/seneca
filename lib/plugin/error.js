/* Copyright (c) 2012 Richard Rodger */

var common  = require('../common');

var _ = common._;



function ErrorPlugin() {
  var self = this;
  self.name = 'error'
  self.role = 'fail'

  self.init = function(seneca,opts,done){

    seneca.add({on:'error'},function(args,cb){
      if( 'fail' == args.how ) {
        seneca.fail('error_code1',cb)
      }
      else if( 'msg' == args.how ) {
        seneca.fail('an error message',cb)
      }
      else if( 'errobj' == args.how ) {
        cb(new Error('an Error object') )
      }
      else if( 'str' == args.how ) {
        cb('a string error')
      }
      else if( 'obj' == args.how ) {
        cb({error:'an object'})
      }
      else cb()
    })

    done()
  }

  /*
  self.service = function(opts,cb) {
    return function(req,res,next){
      // TODO: fail in some way
    }
  }
  */
}


exports.plugin = function() {
  return new ErrorPlugin()
}

