/* Copyright (c) 2011 Ricebridge */

var common  = require('../../common');

var eyes    = common.eyes;
var util    = common.util;
var assert  = common.assert;
var _       = common._;
var uuid    = common.uuid;


var postmark = require('postmark')


function PostmarkProvider(seneca,opts) {
  var self = this
  
  console.log('postmark key '+opts.postmark.key)
  var pm = postmark(opts.postmark.key)


  self.make = function(args) {
    var spec = {
      from: opts.from,
      replyto: opts.from,

      to: args.to,
      code: args.code
    }

    return spec
  }

  self.send = function(spec,cb) {
    console.log('send spec'+JSON.stringify(spec))
    var pmspec = {
      "From": spec.from, 
      "To": spec.to, 
      "Subject": spec.subject, 
      "TextBody": spec.text,
      "ReplyTo": spec.from,
      "Tag": spec.code
    }

    try {
      console.log('PMSEND'+JSON.stringify(pmspec))
      pm.send( pmspec )
      cb(null)
    }
    catch( e ) {
      cb(e)
    }

  }

}


module.exports = PostmarkProvider




