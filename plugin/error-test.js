/* Copyright (c) 2012-2013 Richard Rodger */

"use strict";


module.exports = function(seneca,options,done) {

  seneca.add({role:'error-test'},function(args,cb){
    if( 'fail' == args.how ) {
      throw seneca.fail('error_code1')
    }
    else if( 'msg' == args.how ) {
      throw seneca.fail('an error message')
    }
    else if( 'errobj' == args.how ) {
      throw new Error('an Error object')
    }
    else if( 'str' == args.how ) {
      throw('a string error')
    }
    else if( 'obj' == args.how ) {
      throw({error:'an object'})
    }
    else cb()
  })

  done(null,{name:'error-test'})
}

