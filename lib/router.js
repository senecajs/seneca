/* Copyright (c) 2012 Richard Rodger */


var common = require('./common')


var util = common.util

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

      valmap = keymap.v
      if( valmap && key == keymap.k) {
        keymap = valmap[val] || (valmap[val]={})
      }
      else if( !keymap.k ) {
        keymap.k = key
        keymap.v = {}
        keymap = keymap.v[val] = {}
      }
      else {
        if( key < keymap.k ) {
          var curvalmap = keymap.v
          keymap.v = {}
          keymap.v[''] = {k:keymap.k,v:curvalmap}

          keymap.k = key
          keymap = keymap.v[val] = {}
        }
        else {
          valmap = keymap.v
          keymap = valmap[''] || (valmap['']={})
          i--
        }
      }
    }

    if( data && keymap ) {
      keymap.d = data
    }
  }


  self.find = function( pat ) {
    var keymap = top
    var data = null
    var key,valmap

    do {
      key = keymap.k

      if( keymap.v ) {
        var nextkeymap = keymap.v[pat[key]]
        if( nextkeymap ) {
          data   = nextkeymap.d
          keymap = nextkeymap
        }
        else {
          keymap = keymap.v['']
        }
      }
      else {
        keymap = null
      }
    }
    while( keymap )

    return data
  }


  self.remove = function( pat ) {
    var keymap = top
    var data = null
    var key,valmap
    var path = []

    do {
      key = keymap.k

      if( keymap.v ) {
        var nextkeymap = keymap.v[pat[key]]
        if( nextkeymap ) {
          path.push({km:keymap,v:pat[key]})
          data   = nextkeymap.d
          keymap = nextkeymap
        }
        else {
          keymap = keymap.v['']
        }
      }
      else {
        keymap = null
      }
    }
    while( keymap )

    if( data ) {
      //console.dir(path)
      var part = path[path.length-1]
      delete part.km.v[part.v]
    }
  }



  self.findall = function( pat ) {

    function descend(parentkey,keymap,match,checkkeys,acc) {
      //console.log('descend:'+parentkey+' keymap='+_.keys(keymap)+' match:'+JSON.stringify(match)+' checkkeys='+_.keys(checkkeys))
      delete checkkeys[parentkey]

      var key = keymap.k
      var found = false

      var val = pat[key]
      var valmap = keymap.v

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

      if( 0 == _.keys(checkkeys).length ) {
        //console.log('found:'+JSON.stringify(match))
        acc.push({match:match,data:keymap.d})
      }
    }

    var acc = []
    descend('',top,{},_.extend({},pat),acc)
    return acc
  }



  self.toString = function() {
    return util.inspect(top,false,null)
  }

  self.toJSON = function(indent) {
    return JSON.stringify(top,function(key,val){
      if( _.isFunction(val) ) return '[Function]'
      return val
    },indent)
  }

  return self
}


exports.Router = Router