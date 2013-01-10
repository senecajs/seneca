/* Copyright (c) 2010-2012 Richard Rodger */

"use strict"


var _ = require('underscore')


module.exports = function echo( si,opts,cb ) {

  si.add({role:'echo'},function(args,cb){
    var exclude = _.extend({role:1},opts.exclude||{})
    var out = _.omit(
      _.extend(args,opts.inject||{}),
      _.filter(_.keys(args),function(n){return n.match(/\$$/)||exclude[n]})
    )

    cb(null,out)
  })


  cb( null, function(req,res,next){
    if( 0 == req.url.indexOf('/echo') ) {
      res.writeHead(200)
      var content = req.url

      // use connect.json() middleware to accept JSON data
      if( req.body ) {
        content = _.isObject(req.body) ? JSON.stringify(req.body) : ''+req.body
      } 
      res.end(content)
    }
    else next();
  })
}
