/* Copyright (c) 2011-2013 Richard Rodger */
"use strict";


var fs = require('fs')
var util = require('util')

var nid   = require('nid')
var _     = require('underscore')
var async = require('async')


function nil(){
  _.each(arguments,function(arg){
    if( _.isFunction(arg) ) {
      return arg()
    }
  })
}



module.exports = function( options ) {
  var name = 'util'
  var pluginseneca = this


  options = this.util.deepextend({
    limit: { parallel: 11 }
  },options)


  // legacy cmd
  this.add({role:name,cmd:'quickcode'},cmd_quickcode)
  
  this.add({role:name,cmd:'generate_id'},cmd_generate_id)

  this.add(
    {role:name,cmd:'ensure_entity'},
    { required$:['pin','entmap'],
      pin:{type$:'object'},
      entmap:{type$:'object'} }, ensure_entity)

  this.add({role:name,cmd:'define_sys_entity'},cmd_define_sys_entity)



  function cmd_quickcode(args,done){
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
  }


  // cache nid funcs up to length 64
  var nids = []
  
  // TODO: allow specials based on ent canon: name,base,zone props
  function cmd_generate_id(args,done){
    var actnid, length = args.length || 6
    if( length < 65 ) {
      actnid = nids[length] || (nids[length]=nid({length:length}))
    }
    else {
      actnid = nid({length:length})
    }

    done(null,actnid())
  }




  function ensure_entity(args,done){
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
  }


  
  function cmd_define_sys_entity(args,done) {
    var seneca = this
    var list = args.list || [_.pick(args,['entity','zone','base','name','fields'])]

    //console.dir(list)
    
    var sys_entity = seneca.make$('sys','entity')

    function define(entry,next) {
      if( _.isString(entry) ) {
        entry = seneca.util.parsecanon(entry)
      }
      else if( _.isString(entry.entity) ) {
        var fields = entry.fields
        entry = seneca.util.parsecanon(entry.entity)
        entry.fields = fields
      }

      //console.dir(entry)

      var entq = {zone:entry.zone,base:entry.base,name:entry.name}
      sys_entity.load$(entq,function(err,ent){
        if(err) return next(err);

        if( void 0 == entry.fields ) {
          entry.fields = []
        }

        (ent?nil:sys_entity.save$)(entry,function(err,ent){
          return next(err,ent)
        })
      })
    }

    async.mapLimit( args.list || [], options.limit.parallel, define, done )
  }




  // TODO: needs own plugin, and more generic than just util
  var browser_js

  return {
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
  }
}


