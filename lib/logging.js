/* Copyright (c) 2013 Richard Rodger, MIT License */
/* jshint node:true, asi:true, eqnull:true */
"use strict";


var fs   = require('fs')
var util = require('util')

var _      = require('underscore')
var gex    = require('gex')
var patrun = require('patrun')

var common = require('./common')


function multiplexhandler(a,b) {
  if( a.multiplex ) {
    a.multiplex.push(b)
    a.code = a.code+';'+b.code
    return a
  }
  else {
    var multiplex = [a,b]
    var fn = function() {
      var args = common.arrayify(arguments)
      _.each(multiplex,function(childfn){
        try {
          childfn.apply(null,args)
        }
        catch( e ) {
          console.error(e+args)
        }
      })
    }
    fn.multiplex = multiplex
    fn.code = a.code+';'+b.code
    return fn
  }
}


/*

logspec.map:
- list of mappings from log props to handler functions
- e.g.:
  makelogrouter({map:[
    {level:'info',type:'init',handler:function(){...}},
    {level:'info',type:'plugin',plugin:'red',handler:function(){...}},
  ]}) 
- the handler functions are called with arguments:
  date,level,type,[plugin,tag],case,data

- only matching log entries will be triggered
- log props are 
    level: log severity, always one of 'debug', 'info', 'warn', 'error', 'fatal'
    type:  log type - a short semantic code
    plugin: plugin base name
    tag:    plugin tag
    case:   string identifying task, activity or subtype

- the basic types are:
    init: init operations
    status: periodic status reports
    plugin: plugin logs
    error:  error logs
    and others to be added over time

- property values can be multivalued:
    type: "init,error"
    - this is just a convenience - it's the same as having multiple entries

- log levels can specified directly or via:
  - all: this includes all log levels
  - foo+: the + suffix includes all levels above the indicated one, inclusively
    e.g.: warn+ -> warn,error,fatal
    - the order is fixed as: 'debug', 'info', 'warn', 'error', 'fatal'
  - log levels are fixed


- command line arg format
  --seneca.log=level:warn
  "--seneca.log=plugin:foo bar" // space works as val separator
  --seneca.log=level:info,type:plugin,handler:print

  --seneca.log.quiet - no print output
  --seneca.log.all - print everything
  --seneca.log.print - print everything

*/


var makelogrouter = exports.makelogrouter = function( logspec ) {
  var map = []

  if( null == logspec || 
      (_.isArray(logspec)  && 0 === logspec.length) || 
      (_.isObject(logspec) && 0 === _.keys(logspec).length) ) 
  {
    map = [{level:'info+',handler:'print'}]
  }
  else if( _.isString( logspec ) ) {
    map = [logspec]
  }
  else if( _.isArray( logspec ) ) {
    map = logspec
  }
  else if( _.isObject( logspec ) ) {
    map = logspec.map ? logspec.map : [logspec]
  }

  //console.log( 'MAKE', logspec, map )
  
  var logrouter = new patrun()

  _.each(map,function(entry){
    if( _.isString(entry) ) {
      var entries = shortcut(entry)
      entries.forEach( function(entry) {
        makelogroute(entry,logrouter)
      })
    }
    else if( entry ) {
      makelogroute(entry,logrouter)
    }
  })

  return logrouter
}



function shortcut( spec ) {
  if( spec && (spec.print || spec.all || 'print'==spec || 'all'==spec) ) {
    return [{level:'all',handler:handlers.print}]
  }
  else if( spec && 
           (spec.quiet || 'quiet'===spec || spec.silent || 'silent'==spec) ) {
    return [];
  }
  else if( _.isString(spec) ) {
    var entries = []
    parse_command_line(spec,entries,{shortcut:false})
    return entries
  } 
  else return [];
}



// entry = single entry, from map:[]
var makelogroute = exports.makelogroute = function(entry,logrouter) {
  //console.log('RAW-ENTRY',entry)

  var propnames = ['level','type','plugin','tag','case']
  var loglevels = ['debug', 'info', 'warn', 'error', 'fatal']

  // convenience
  if( !entry.level ) {
    entry.level = 'all'
  }

  if( !entry.handler ) {
    entry.handler = handlers.print
  }

  var routes = []

  _.each(propnames,function(pn){
    var valspec = entry[pn]

    if( valspec ) {
      // vals can be separated by either comma or space, comma takes precedence
      // spaces are useful for command line, as comma is used up
      var vals = valspec.replace(/\s+/g,' ').split(/[, ]/)
      _.map(vals,function(val){ return val.replace(/\s+/g,'') })
      vals = _.filter(vals,function(val){ return ''!==val })

      if( 'level'==pn ) {
        var newvals = []
        _.each(vals,function(val){
          if( 'all' == val ) {
            newvals = newvals.concat(loglevels)
          }
          else if( val.match(/\+$/) ) {
            val = val.substring(0,val.length-1).toLowerCase()
            newvals = newvals.concat(loglevels.slice(loglevels.indexOf(val)))
          }
          else {
            newvals.push(val.toLowerCase())
          }
        })


          vals = _.uniq(newvals)
        _.each(vals,function(level){
          if( -1==loglevels.indexOf(level) ) {
            throw new Error('unknown log level: '+level+', must be one of debug, info, warn, error, fatal')
          }
        })
      }

      var newroutes = []

      _.each(vals,function(val){
        if( 0 === routes.length ) {
          var newroute = {}
          newroute[pn]=val
          newroutes.push(newroute)
        }
        else {
          _.each(routes,function(route){
            var newroute = common.copydata(route)
            newroute[pn]=val
            newroutes.push(newroute)
          })
        }
      })

      routes = newroutes
    }
  })
    
  
  _.each(routes,function(route){
    var routestr = util.inspect(route)

    var handler = entry.handler
    if( handler ) {
      handler.routestr = routestr
    }

    if( 'print' === handler ) {
      handler = handlers.print
    }

    // must match exact route
    var prev = logrouter.findexact(route)

    if( !handler ) {
      if( prev ) {
        var remove = true
        if( prev.multiplex ) {
          // FIX: this doesn't really work - could pop anything
          prev.multiplex.pop()
          remove = (0 === prev.multiplex.length)
        }
        if( remove ) {
          logrouter.remove(route)
        }
      }
    } 
    else {
      if( prev ) {
        handler = multiplexhandler(prev,entry.handler)
        handler.routestr = routestr
      }

      if( entry.regex ) {
        handler = make_regex_handler(entry.regex,handler)
      }

      logrouter.add(route,handler)
    }
  })
}


function make_regex_handler( regex, handler ) {
  if( !_.isRegExp( regex ) ) {
    var re_str   = ''+regex
    var re_flags = ''
    var rere = /^\/(.*)\/([im]?)$/.exec(re_str)
    if( rere ) {
      re_str   = rere[1]
      re_flags = rere[2]
    }
    regex = new RegExp( re_str, re_flags )
  }

  return function() {
    var pretty = handlers.pretty.apply(null,common.arrayify(arguments)).join('\t')
    if( regex.test( pretty ) ) {
      return handler.apply( this, arguments )
    }
  }
}



var handlers = exports.handlers = {}

handlers.pretty = function() {
  var args = common.arrayify(arguments)
  args[2] = args[2].toUpperCase()

  var argstrs = []
  args.forEach(function(a){
    argstrs.push(
      (null==a)?a:
        'string'==typeof(a)?a:
        _.isDate(a)?(a.toISOString()):
        _.isObject(a)?common.owndesc(a,3,true):a
    )
  })

  return argstrs
}

handlers.silent = function silent() {
  // does nothing!
}

handlers.print = function print() {
  console.log( handlers.pretty.apply(null,common.arrayify(arguments)).join('\t') )
}

handlers.stream = function stream(outstream,opts) {
  opts = opts||{}
  return function() {
    var args = common.arrayify(arguments)
    outstream.write('json'==opts.format ? JSON.stringify(args)+'\n' : handlers.pretty.apply(null,args).join('\t')+'\n' )
  }
}

handlers.emitter = function emitter(outemitter) {
  return function() {
    var args = common.arrayify(arguments)
    outemitter.emit('log',args)
  }
}

handlers.file = function file(filepath,opts) {
  opts = opts||{}
  var ws = fs.createWriteStream(filepath,{flags:opts.flags||'a'})
  return handlers.stream(ws,opts)
}


// TODO: HTTP logging as per node-logentries



var makelogfuncs = exports.makelogfuncs = function(target) {

  function makelogger(level) {
    return function() { 
      var args = common.arrayify(arguments)
      args.unshift(level)
      target.log.apply(target,args)
    } 
  }

  target.log.debug = makelogger('debug')
  target.log.info  = makelogger('info')
  target.log.warn  = makelogger('warn')
  target.log.error = makelogger('error')
  target.log.fatal = makelogger('fatal')
}


var makelog = exports.makelog = function( logrouter, identifier ) {

  var log = function(level,type) {
    var args = common.arrayify(arguments,2)
    args.unshift(type)
    args.unshift(level)
    args.unshift(identifier)
    args.unshift(new Date())
    var routing = {
      level:  args[2],
      type:   args[3],
      plugin: args[4],
      tag:    args[5],
      case:   args[6]
    }

    var handler = logrouter.find(routing)

    if( handler ) {
      if( _.isFunction(args[args.length-1]) ) {
        var logvals = args[args.length-1]()
        args = args.slice(0,args.length-1).concat(logvals)
      }

      try {
        handler.apply(null,args)
      }
      catch( e ) {
        console.error( e+args )
      }
    }
  }

  makelogfuncs({log:log})

  return log
}



function parse_command_line( spec, logmaps, flags ) {
  flags = flags || {}

  if( flags.shortcut ) {
    var shortentries = shortcut(spec)

    //console.log('SE',shortentries)

    if( 0 < shortentries.length ) {
      shortentries.forEach( function(shortentry) {
        logmaps.push(shortentry)
      })
      return;
    }
  }


  if( _.isArray(spec) ){
    spec.forEach(function(specentry){
      parse_command_line(specentry,logmaps)
    })
    return;
  }


  // parse: level=,type=,plugin=,tag=,case=,handler=
  // handler can be print,file:path

  var keys = {level:1,type:1,plugin:1,tag:1,'case':1,handler:1,regex:1}
  var entry = {}
  var parts = (''+spec).split(',')
  _.each(parts,function(part){
    var kvm = part.match(/^(.*?):(.*)$/)
    var kv = kvm ? [ kvm[1], kvm[2] ] : ['']

    if( 0 < kv[0].length ) {
      var key = kv[0]
      if( 'handler' == key ) {
        var handler = kv.slice(1).join(':')
        var m
        if( 'print' == handler ) {
          entry[key]=handlers.print
        }
        else if( (m = /^file:(\/\/)?(.*)$/.exec(handler)) ) {
          entry[key]=handlers.file(m[2])
        }
      }
      else if( keys[key] ) {
        if( entry[key] ) {
          entry[key] += ','+kv[1]
        }
        else {
          entry[key]=kv[1]
        }
      }
    }
  })
  

  if( 0 < _.keys(entry).length ) {

    // print by default
    if( entry && !entry.handler ) {
      entry.handler = handlers.print
    }
  
    logmaps.push(entry)
  }
}


exports.parse_command_line = parse_command_line;



exports.log_act_in = function( instance, actid, actmeta, args ) {
  if( actmeta.sub ) return;

  instance.log.debug(
    'act',
    actmeta.plugin_name,
    actmeta.plugin_tag,
    'IN',
    actid,
    actmeta.argpattern,
    function() {
      return [
        actmeta.descdata ? actmeta.descdata(args) : common.descdata(args),
        args.entry$ ? args.entry$ : 'ENTRY',
        'A;'+actmeta.id, 
        args.gate$ ? 'GATE' : '-'
      ]
    })
}


exports.log_act_out = function( instance, actid, actmeta, args, result ) {
  if( actmeta.sub ) return;

  instance.log.debug(
    'act',
    actmeta.plugin_name,
    actmeta.plugin_tag,
    'OUT',
    actid,
    actmeta.argpattern,
    function() {
      return _.flatten( [ 
        _.flatten([ 
          actmeta.descdata ? 
            actmeta.descdata(result.slice(1)) : 
            common.descdata(result.slice(1)) ], 
                  true), 
        args.entry$ ? args.entry$ : 'EXIT',
        'A;'+actmeta.id,
        args.gate$ ? 'GATE' : '-'
      ])
    })
}


exports.log_act_err = function( instance, actid, actmeta, args, err ) {
  instance.log.error(
    'act',
    err.details.plugin.name || '-',
    err.details.plugin.tag  || '-',
    'OUT',
    actid,
    err.details.pattern     || '-', 
    ( actmeta.descdata ? 
      actmeta.descdata(args) : common.descdata(args) ),
    args.entry$ ? args.entry$ : 'ENTRY',
    'A;'+actmeta.id, 
    args.gate$ ? 'GATE' : '-',
    err.message,
    err.code,
    common.descdata(err.details),
    err.stack 
  )

}


exports.log_act_cache = function( instance, actid, actmeta, args ) {
  instance.log.debug(
    'act',
    actmeta.plugin_name,
    actmeta.plugin_tag,
    actid,
    'CACHE',
    function() {
      return [actmeta.descdata ? 
              actmeta.descdata(args) : 
              common.descdata(args), 
              'A='+actmeta.id]
    })
}


exports.log_exec_err = function( instance, err ) {
  err.details        = err.details || {}
  err.details.plugin = err.details.plugin || {}

  instance.log.error( 
    'act',
    err.details.plugin.name || '-',
    err.details.plugin.tag  || '-',
    err.details.id          || '-',
    err.details.pattern     || '-', 
    err.message,
    err.code,
    common.descdata(err.details),
    err.stack )
}


exports.log_act_not_found = function( instance, err ) {
  err.details = err.details || {}
  err.details.plugin = err.details.plugin || {}

  instance.log.error(
    'act',
    err.details.plugin.name || '-',
    err.details.plugin.tag  || '-',
    err.details.id          || '-',
    err.details.pattern     || '-', 
    err.message,
    err.code,
    common.descdata(err.details),
    err.stack )
}
