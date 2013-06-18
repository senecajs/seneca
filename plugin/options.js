/* Copyright (c) 2012-2013 Richard Rodger */
"use strict";


var fs      = require('fs')
var util    = require('util')

var _       = require('underscore')
var request = require('request')

var name = 'options'

module.exports = function options( options,cb ) {
  var seneca  = this
  var from    = options.value$
  var ref     = {options:{}}
  var service


  seneca.add({init:name},function(args,done){
    
    if( from ) {
      if( from.match( /^http/i ) ) {
        request( from, function(err, res, body) {
          if( err ) return done(err);
          ref.options = _.isObject(body) ? body : JSON.parse(body)
          return finish()
        })
      }
      else if( from.match( /\.json$/i ) ) {
        fs.readFile( from, function(err,text) {
          if( err ) return done(err);
          ref.options = JSON.parse(text)
          return finish()
        })
      }
      else if( from.match( /\.js$/i ) ) {
        if( !from.match(/^\//) ) {
          from = './'+from
        }
        ref.options = seneca.context.module.require( from )
        return finish()
      }
    }
    else if( 0 < _.keys(options).length ) {
      ref.options = seneca.util.copydata(options)
      return finish()
    }
    else return finish();

    function finish() {
      try {
        var seneca_options = seneca.context.module.require('./seneca.options.js')
        ref.options = seneca.util.deepextend(seneca_options,ref.options)
      }
      catch(e) {
        // IGNORE, seneca.options.js is optional
      }

      var env = process.env['NODE_ENV']
      if( _.isString(env) ) {
        ref.options = seneca.util.deepextend(ref.options,ref.options[env])
      }


      ref.options = seneca.util.deepextend({
        admin:{
          local:false,
          prefix:'/admin'
        }
      },ref.options)


      service = seneca.httprouter(function(http){
        http.get(ref.options.admin.prefix+'/options',function(req,res){
          res.send(ref.options)
        })
      })

      seneca.log.debug('loaded',util.inspect(ref.options,false,null).replace(/[\r\n]/g,' '))

      done()
    }
  })


  seneca.add({role:name,cmd:'get'},function(args,cb){
    var options = ref.options

    var base = args.base || null
    var root  = base ? (options[base]||{}) : options 
    var val   = args.key ? root[args.key] : root

    val = seneca.util.copydata(val)

    cb(null,val)
  })
  

  var service_wrap = function(req,res,next) {
    if( service ) {
      service.call(this,req,res,next)
    }
    else next();
  }

  return {
    name:name,
    service:service_wrap
  }
}
