/* Copyright (c) 2010-2014 Richard Rodger */

"use strict"


var _ = require('underscore')


module.exports = function echo( options ) {

  this.add({role:'echo'},function(args,cb){
    var exclude = _.extend({role:1},options.exclude||{})
    var out = _.omit(
      _.extend(args,options.inject||{}),
      _.filter(_.keys(args),function(n){return n.match(/\$$/)||exclude[n]})
    )

    function finish() { cb(null,out) }

    if( options.delay && _.isNumber( options.delay ) ) {
      setTimeout(finish,options.delay)
    }
    else finish();
  })


  this.act({role:'web',use:function(req,res,next){
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
  }})


  return { name:'echo' }
}
