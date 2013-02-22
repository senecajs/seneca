/* Copyright (c) 2011-2013 Richard Rodger */
"use strict";

var nid = require('nid')
var _   = require('underscore')


module.exports = function(opts,cb) {
  var name = 'util'

  // legacy cmd
  this.add({role:name,cmd:'quickcode'},function(args,cb){
    args.len = args.length || args.len
    var len      = args.len ? parseInt(args.len,10) : 8
    var alphabet = args.alphabet || '0123456789abcdefghijklmnopqrstuvwxyz'
    var curses   = args.curses
    
    var nidopts = {}
    if( len ) nidopts.length = len;
    if( alphabet ) nidopts.alphabet = alphabet;
    if( curses ) nidopts.curses = curses;

    var actnid = nid(nidopts)

    cb(null,actnid())
  })


  // cache nid funcs up to length 64
  var nids = []
  
  // TODO: allow specials based on ent canon: name,base,zone props
  this.add({role:name,cmd:'generate_id'},function(args,cb){
    var actnid, length = args.length || 6
    if( length < 65 ) {
      actnid = nids[length] || (nids[length]=nid({length:length}))
    }
    else {
      actnid = nid({length:length})
    }

    cb(null,actnid())
  })


  cb(null,{
    name:name,
    service: function(req,res,next) {
      // FIX: needs proper cache headers etc
      if( '/js/util/browser.js' == req.url ) {
        res.sendfile(__dirname+'/browser.js',function(err){
          if( err ) return seneca.fail('unable to deliver browser.js')
        })
      }
      else next();
    }
  })
}


