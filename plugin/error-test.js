/* Copyright (c) 2012-2013 Richard Rodger */

"use strict";


module.exports = function(seneca,options,done) {

  seneca.add({role:'error-test'},function(args,cb){
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

  done(null,{name:'error-test'})
}

