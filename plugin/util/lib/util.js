/* Copyright (c) 2011-2013 Richard Rodger */
"use strict";

var nid = require('nid')


module.exports = function(seneca,opts,cb) {
  var name = 'util'

  // legacy cmd
  seneca.add({role:name,cmd:'quickcode'},function(args,cb){
    args.len = args.length || args.len
    var len      = args.len ? parseInt(args.len,10) : 8
    var alphabet = args.alphabet || '0123456789abcdefghijklmnopqrstuvwxyz'
    var curses   = args.curses || ['\x66\x75\x63\x6B',
                                   '\x73\x68\x69\x74',
                                   '\x70\x69\x73\x73',
                                   '\x63\x75\x6E\x74',
                                   '\x6E\x69\x67\x67\x65\x72']
    
    var nidopts = {}
    if( len ) nidopts.length = len;
    if( alphabet ) nidopts.alphabet = alphabet;
    if( curses ) nidopts.curses = curses;

    var actnid = nid(nidopts)

    cb(null,actnid())
  })


  // cache nid funcs up to length 64
  var nids = []
  
  seneca.add({role:name,cmd:'generate_id'},function(args,cb){
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
    service: function() {
      return function(req,res,next) {
        // FIX: needs proper cache headers etc
        if( '/js/util/browser.js' == req.url ) {
          res.sendfile(__dirname+'/browser.js',function(err){
            if( err ) return si.fail('unable to deliver browser.js')
          })
        }
        else next();
      }
    }
  })
}


