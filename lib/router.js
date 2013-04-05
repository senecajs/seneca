/* Copyright (c) 2013 Richard Rodger */
"use strict";


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

    if( !_.isUndefined(data) && keymap ) {
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

    if( !_.isUndefined(data) ) {
      //console.dir(path)
      var part = path[path.length-1]
      delete part.km.v[part.v]
    }
  }



  // values can be veratim, glob, or array of globs
  self.findall = function( pat ) {
    function descend(keymap,match,missing,acc) {

      if( keymap.v ) {
        var key = keymap.k
        var gexval = gex( pat[key] )

        for( var val in keymap.v ) {
          var itermatch   = _.extend({},match)
          var itermissing = _.extend({},missing)

          if( gexval.on(val) ) {
            itermatch[key]=val
            delete itermissing[key]

            var nextkeymap = keymap.v[ val ]

            if( 0 == _.keys(itermissing).length && nextkeymap && nextkeymap.d ) {
              acc.push({match:itermatch,data:nextkeymap.d})
            }
            else if( nextkeymap && nextkeymap.v ) {
              descend(nextkeymap, _.extend({},itermatch), _.extend({},itermissing), acc)
            }
          }
        }

        var nextkeymap = keymap.v['']
        if( nextkeymap ) {
          descend(nextkeymap, _.extend({},itermatch), _.extend({},itermissing), acc)
        }
      }
    }

    var acc = []
    descend(top,{},_.extend({},pat),acc)
    return acc
  }



  self.toString = function(dstr) {
    dstr = _.isFunction(dstr) ? dstr : function(d){return '<'+d+'>'}

    function indent(o,d) {
      for(var i = 0; i < d; i++ ) {
        o.push(' ')
      }
    }

    function walk(n,o,d){
      o.push('\n')
      if( !_.isUndefined(n.d) ) {
        indent(o,d)
        o.push(dstr(n.d))
      }
      if( n.k ) {
        indent(o,d)
        o.push(n.k+':')
      }
      if( n.v ) {
        d++
        for( var p in n.v ) {
          o.push('\n')
          indent(o,d)
          o.push((p||'*')+' ->')
          walk(n.v[p],o,d+1)
        }
      }
    }
    var o = []
    walk(top,o,0)
    return o.join('')
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