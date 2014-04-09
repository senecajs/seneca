/* Copyright (c) 2011-2014 Richard Rodger */
"use strict";


var fs   = require('fs')
var util = require('util')
var path = require('path')

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
  var seneca = this


  options = seneca.util.deepextend({
    limit: { parallel: 11 }
  },options)


  // legacy cmd
  seneca.add({role:name,cmd:'quickcode'},cmd_quickcode)
  
  seneca.add({role:name,cmd:'generate_id'},cmd_generate_id)

  seneca.add({
    role:   name,
    cmd:    'ensure_entity',

    pin:    {required$:true},
    entmap: {object$:true,required$:true},
  }, ensure_entity)

  seneca.add({role:name,cmd:'define_sys_entity'},cmd_define_sys_entity)







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

    seneca.wrap(args.pin,function(args,done){
      var seneca = this
      seneca.util.recurse(
        _.keys(entmap),
        function(entarg,next){

          // ent id
          if( _.isString(args[entarg]) ) {
            entmap[entarg].load$( args[entarg], function(err,ent){
              if(err) return done(err)
              args[entarg]=ent
              return next(null,args)
            })
          }

          // ent JSON
          else if( _.isObject(args[entarg]) ) {
            
            // contains entity$ or $:{name,base,zone} 
            if( args[entarg].entity$ || args[entarg].$ ) {
              args[entarg] = entmap[entarg].make$(args[entarg]) 
              return next(null,args)
            }
          }

          else return next(null,args);

        },
        function(err,args) {
          if( err ) return done(err);
          return seneca.prior(args,done)
        }
      )
    })

    done()
  }


  
  function cmd_define_sys_entity(args,done) {
    var seneca = this
    var list = args.list || [_.pick(args,['entity','zone','base','name','fields'])]
    list = _.isArray(list) ? list : list.split(/\s*,\s*/)

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
      else if( _.isObject(entry) && entry.entity$ ) {
        entry = entry.canon$({object:true})
      }

      var entq = {zone:entry.zone,base:entry.base,name:entry.name}
      sys_entity.load$(entq,function(err,entity){
        if(err) return next(err);

        var save = false

        if( null == entity ) {
          entity = sys_entity.make$(entry)
          save = true
        }
        
        if( null == entity.fields ) {
          entity.fields = []
          save = true
        }

        if( save ) {
          entity.save$(function(err,ent){
            return next(err,ent)
          })
        }
        else return next(null,entity)
      })
    }

    async.mapLimit( list || [], options.limit.parallel, define, done )
  }



  var utilfuncs = {
    pathnorm: function( pathstr ) {
      return path.normalize( (null==pathstr) ? '' : ''+pathstr ).replace(/\/+$/,'')
    },
    deepextend: seneca.util.deepextend
  }


  return {
    name:name,
    export:utilfuncs
  }

}


