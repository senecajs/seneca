/* Copyright (c) 2011-2013 Richard Rodger */
"use strict";


var fs = require('fs')
var util = require('util')

var nid = require('nid')
var _   = require('underscore')


module.exports = function(opts,register) {
  var name = 'util'
  var pluginseneca = this

  // legacy cmd
  this.add({role:name,cmd:'quickcode'},function(args,done){
    args.len = args.length || args.len
    var len      = args.len ? parseInt(args.len,10) : 8
    var alphabet = args.alphabet || '0123456789abcdefghijklmnopqrstuvwxyz'
    var curses   = args.curses
    
    var nidopts = {}
    if( len ) nidopts.length = len;
    if( alphabet ) nidopts.alphabet = alphabet;
    if( curses ) nidopts.curses = curses;

    var actnid = nid(nidopts)

    done(null,actnid())
  })


  // cache nid funcs up to length 64
  var nids = []
  
  // TODO: allow specials based on ent canon: name,base,zone props
  this.add({role:name,cmd:'generate_id'},function(args,done){
    var actnid, length = args.length || 6
    if( length < 65 ) {
      actnid = nids[length] || (nids[length]=nid({length:length}))
    }
    else {
      actnid = nid({length:length})
    }

    done(null,actnid())
  })




  this.add(
    {role:name,cmd:'ensure_entity'},
    { required$:['pin','entmap'],
      pin:{type$:'object'},
      entmap:{type$:'object'} },

    function(args,done){
      var entmap = args.entmap

      pluginseneca.wrap(args.pin,function(args,done){
        var seneca = this
        seneca.util.recurse(
          _.keys(entmap),
          function(entarg,next){
            //console.log('work entarg:'+entarg+' args:'+util.inspect(args))

            // ent id
            if( _.isString(args[entarg]) ) {
              entmap[entarg].load$( args[entarg], function(err,ent){
                if(err) return done(err)
                args[entarg]=ent
                return next(null,args)
              })
            }
            
            // ent JSON - contains $:{name,base,zone}
            else if( _.isObject(args[entarg]) && args[entarg].$ ) {
              args[entarg] = entmap[entarg].make$(args[entarg]) 
              return next(null,args)
            }
            
            else return next(null,args);
          },
          function(err,args) {
            //console.log('done: '+util.inspect(args))
            if( err ) return done(err);
            return seneca.parent(args,done)
          }
        )
      })

      done()
    })


  var browser_js

  register(null,{
    name:name,
    service: function(req,res,next) {

      function send() {
        res.writeHead(200)
        res.end(browser_js)
      }

      // FIX: needs proper cache headers etc
      if( '/js/util/browser.js' == req.url ) {
        if( browser_js ) {
          send()
        }
        else {
          fs.readFile(__dirname+'/browser.js',function(err,text){
            if( err ) {
              next(err)
            }
            browser_js = text
            send()
          })
        }

      }
      else next();
    }
  })
}


