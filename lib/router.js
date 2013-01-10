/* Copyright (c) 2012 Richard Rodger */


var common = require('./common')

var _   = common._
var gex = common.gex


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



  self.remove = function( pat ) {
    delete pat.__data__
    var keys = _.keys(top)

    var keymap = top
    var valmap

    var keypath = []

    for( var i = 0; i < keys.length; i++ ) {
      var key = keys[i]
      var val = pat[key]

      valmap = keymap[key]

      if( val && keymap && keymap[key] && valmap && valmap[val] ) {
        keymap = valmap[val]
        if( keymap ) {
          keypath.push(keymap)
          keys = _.keys(keymap)
          i = -1
        }
      }
    }
    
    for( var i = keypath.length-1; -1 < i; i--) {
      var keymap = keypath[i]
      var keycount = _.keys(keymap).length - (keymap.__data__?1:0)
      if( keycount <= 1 ) {
        delete keymap.__data__
      }
    }
  }


  self.findall = function( pat ) {

    function descend(parentkey,keymap,match,checkkeys,acc) {
      //console.log('descend:'+parentkey+' keymap='+_.keys(keymap)+' match:'+JSON.stringify(match)+' checkkeys='+_.keys(checkkeys))
      delete checkkeys[parentkey]

      var keys = _.keys(keymap)
      var found = false
      for( var i = 0; i < keys.length; i++ ) {
        var key = keys[i]
        var val = pat[key]
        var valmap = keymap[key]

        if( val && valmap ) {
          var gexval = gex(val)

          for( var v in valmap ) {
            if( gexval.on(v) ) {

              var newmatch = _.extend({},match)
              newmatch[key]=v

              var newcheckkeys = _.extend({},checkkeys)
              newcheckkeys[key]=1

              descend( key, valmap[v], newmatch, newcheckkeys, acc )
            }
          }
        }
      }

      if( 0 == _.keys(checkkeys).length ) {
        //console.log('found:'+JSON.stringify(match))
        acc.push({match:match,data:keymap.__data__})
      }
    }


    var acc = []
    descend('',top,{},_.extend({},pat),acc)
    return acc
  }


  self.toString = function() {
    return JSON.stringify(top)
  }

  return self
}


exports.Router = Router