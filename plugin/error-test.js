/* Copyright (c) 2012-2013 Richard Rodger */

"use strict";


module.exports = function(seneca,options,done) {

  seneca.add({role:'error-test'},function(args,cb){
    var seneca = this

    if( 'fail' == args.how ) {
      throw seneca.fail('error_code1')
    }
    else if( 'errobj' == args.how ) {
      throw new Error('an Error object')
    }
    else if( 'str' == args.how ) {
      throw('a string error')
    }
    else if( 'obj' == args.how ) {
      throw({bad:1})
    }
    else if( 'cb-err' == args.how ) {
      return cb(new Error('cb-err'))
    }
    else if( 'cb-fail' == args.how ) {
      return cb(seneca.fail('cb-fail'))
    }
    else if( 'cb-obj' == args.how ) {
      return cb({bad:2})
    }
    else if( 'cb-cb-err' == args.how ) {
      return cb(new Error('cb-cb-err'))
    }
    else cb()
  })

  done(null,{name:'error-test'})
}

