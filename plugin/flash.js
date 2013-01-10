/* Copyright (c) 2012 Richard Rodger */

/*
Flash messages, can only be seen by next request
*/

var common  = require('../common');
var _       = common._;


module.exports = function echo( si,opts,cb ) {

  var flashent = si.make('sys','flash')

  
  if( !seneca.findact({role:'entity',cmd:'save',base:'sys',name:'flash'})) {
    seneca.register({ 
      name:'mem-store'
      tag:'flash',
      map:'/sys/flash':'*'
    })
  }


  si.add({role:'flash'},function(args,cb){
    var token = args.token 
    var key   = args.key 
    var val   = args.val || args.value

    var flash = flashent.make$()
    flash.key = key
    flash.val = val
    flash.token = token

    flash.save$(cb)
  })



  si.act({role:'browser',restype:'js'},function(args,cb){
    
  })


  cb( null, function(req,res,next){
    
    next()
  })
}
