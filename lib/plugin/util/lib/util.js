/* Copyright (c) 2011 Ricebridge */

var common  = require('../../../common');

function UtilPlugin() {
  var self = this;
  self.name = 'util';

  self.init = function(seneca,opts,cb){

    seneca.add({on:self.name,cmd:'quickcode'},function(args,cb){
      var len      = args.len ? parseInt(args.len,10) : 8
      var alphabet = args.alphabet || '0123456789abcdefghijklmnopqrstuvwxyz'
      var curses   = args.curses || ['\x66\x75\x63\x6B',
                                     '\x73\x68\x69\x74',
                                     '\x70\x69\x73\x73',
                                     '\x63\x75\x6E\x74',
                                     '\x6E\x69\x67\x67\x65\x72']

      var numchars = alphabet.length

      var code = null
      while( cursed(code) ) {
        var time = new Date().getTime()
        var sb = []
        for(var i = 0; i < len; i++) {
          var c = Math.floor((time * Math.random()) % numchars)
          sb.push( alphabet[c] ) 
        }
        code = sb.join('')
      }


      function cursed(code) {
        if( code ) {
          for( var i = 0; i < curses.length; i++ ) {
            if( -1 != code.indexOf(curses[i]) ) {
              return true
            }
          }
          return false
        }
        else {
          return true
        }
      }

      cb(null,code)
      
    })

    cb()
  }

}


exports.plugin = function() {
  return new UtilPlugin()
}

