/* Copyright (c) 2011-2012 Richard Rodger */


function UtilPlugin() {
  var self = {}
  self.name = 'util'

  self.init = function(seneca,opts,cb){

    seneca.add({role:self.name,cmd:'quickcode'},function(args,cb){
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

  
  self.service = function() {
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


  return self
}


module.exports = new UtilPlugin()

