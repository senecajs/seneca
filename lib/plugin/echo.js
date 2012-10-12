/* Copyright (c) 2010-2012 Richard Rodger */

var common  = require('../common');
var _       = common._;


module.exports = function echo( si,opts,cb ) {

  si.add({role:'echo'},function(args,cb){
      var out = _.omit(
        _.extend(args,opts.inject||{}),
        _.filter(_.keys(args),function(n){return n.match(/\$$/)})
      )

      cb(null,out)
  })


  cb( null, function(req,res,next){
    if( 0 == req.url.indexOf('/echo') ) {
      res.writeHead(200)
      res.end(req.url)
    }
    else next();
  })
}
