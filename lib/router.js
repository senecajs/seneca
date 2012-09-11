/* Copyright (c) 2012 Richard Rodger */


var common = require('./common')

var _ = common._


function Router() {
  var self = {}

  var top = {}

  self.add = function( pat, data ) {
    var keys = _.keys(pat).sort()

    var keymap = top
    var valmap

    for( var i = 0; i < keys.length; i++ ) {
      var key = keys[i]
      var val = pat[key]

      valmap = keymap[key] || (keymap[key]={})
      keymap = valmap[val] || (valmap[val]={})
    }

    if( data && keymap ) {
      keymap.__data__ = data
    }
  }


  self.find = function( pat ) {
    delete pat.__data__
    var keys = _.keys(top)
    var data = null

    var keymap = top
    var valmap

    for( var i = 0; i < keys.length; i++ ) {
      var key = keys[i]
      var val = pat[key]

      valmap = keymap[key]

      if( val && keymap && keymap[key] && valmap && valmap[val] ) {
        keymap = valmap[val]

        if( keymap ) {
          keys = _.keys(keymap)
          i = -1
          data = keymap.__data__ || data
        }
      }
    }

    return data
  }

  return self
}


exports.Router = Router