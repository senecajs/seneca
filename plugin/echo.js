/* Copyright (c) 2010-2014 Richard Rodger */

"use strict"


var _ = require('underscore')


module.exports = function echo( options ) {

  this.add({role:'echo'},function(args,cb){
    var exclude = _.extend({role:1},opts.exclude||{})
    var out = _.omit(
      _.extend(args,opts.inject||{}),
      _.filter(_.keys(args),function(n){return n.match(/\$$/)||exclude[n]})
    )

    function finish() { cb(null,out) }

    if( opts.delay && _.isNumber( opts.delay ) ) {
      setTimeout(finish,opts.delay)
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
