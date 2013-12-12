/* Copyright (c) 2012-2013 Richard Rodger */
"use strict";


var fs      = require('fs')
var util    = require('util')
var exec    = require('child_process').exec

var _        = require('underscore')
var request  = require('request')
var nid      = require('nid')
var temp     = require('temp')
var optimist = require('optimist')


var name = 'options'


module.exports = function options( options ) {
  var seneca  = this
  var from    = options.value$ || options.from
  var ref     = {options:{}}
  var service


  if( from ) {

    // FIX, yeah fun, DELETE!!!

    // ... look away ... MUHAHA
    if( from.match( /^http/i ) ) {
      var tmp = temp.path({prefix:'seneca-options-'})
      fs.writeFileSync(tmp,'',{mode:384}) // 0600

      exec("node -e \"require('request')('"+from+"').pipe(require('fs').createWriteStream('"+tmp+"')).on('close',process.exit)\"",function(err){if(err){console.log(arguments)}})

      var start = new Date().getTime()
      while( true ) {
        var text = fs.readFileSync(tmp)
        try {
          ref.options = JSON.parse(text)
          fs.unlinkSync(tmp)
          break
        }
        catch(e) {
          if( (options.timeout || 3333) < new Date().getTime() - start ) {
            fs.unlinkSync(tmp)
            throw e
          }
        }
      }
    }
    else if( from.match( /\.json$/i ) ) {
      var text = fs.readFileSync( from )
      ref.options = JSON.parse(text)
    }
    else if( from.match( /\.js$/i ) ) {
      if( !from.match(/^\//) ) {
        from = './'+from
      }
      ref.options = seneca.context.module.require( from )
    }
  }
  else if( 0 < _.keys(options).length ) {
    ref.options = seneca.util.copydata(options)
  }

  try {
    var seneca_options = seneca.context.module.require('./seneca.options.js')
    ref.options = seneca.util.deepextend(seneca_options,ref.options)
  }
  catch(e) {
    // seneca.options.js is optional
    seneca.log.debug('not-loaded','optional','./seneca.options.js',e.message)
  }


  var env = process.env['NODE_ENV']
  if( _.isString(env) ) {
    ref.options.env = env
    ref.options = seneca.util.deepextend(ref.options,ref.options[env])
  }


  // these override previous sources
  var argvoptions = {}
  var argv = optimist.argv
  if( argv.seneca && _.isObject(argv.seneca.options) ) {
    argvoptions = argv.seneca.options 
  }



  ref.options = seneca.util.deepextend({
    admin:{
      local:false,
      prefix:'/admin'
    }
  },ref.options,argvoptions)


  // FIX: use role:web,use:service instead
  /*
  service = seneca.httprouter(function(http){
    http.get(ref.options.admin.prefix+'/options',function(req,res){
      res.send(ref.options)
    })
  })
   */

  seneca.log.debug('loaded',util.inspect(ref.options,false,null).replace(/[\r\n]/g,' '))




  seneca.add({role:name,cmd:'get'},function(args,cb){
    var options = ref.options
    
    var base = args.base || null
    var root  = base ? (options[base]||{}) : options 
    var val   = args.key ? root[args.key] : root

    val = seneca.util.copydata(val)

    cb(null,val)
  })



  return {
    name:name,
    //service:service,
    export:seneca.util.copydata(ref.options)
  }
}
