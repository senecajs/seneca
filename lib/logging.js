/* Copyright (c) 2013 Richard Rodger */


var common = require('./common')

var fs   = common.fs

var _   = common._
var gex = common.gex
var router = require('./router')


function multiplexhandler(a,b) {
  if( a.multiplex ) {
    a.multiplex.push(b)
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
  var map = logspec.map
  var logrouter = new router.Router()

  _.each(map,function(entry){
    makelogroute(entry,logrouter)
  })

  return logrouter
}


var makelogroute = exports.makelogroute = function(entry,logrouter) {
  var propnames = ['level','type','plugin','tag','case']
  var loglevels = ['debug', 'info', 'warn', 'error', 'fatal']

  // convenience
  if( !entry.level ) {
    entry.level = 'all'
  }

  var routes = []

  _.each(propnames,function(pn){
    var valspec = entry[pn]

    if( valspec ) {
      // vals can be separated by either comma or space, comma takes precedence
      // spaces are useful for command line, as comma is used up
      var vals = valspec.replace(/\s+/g,' ').split(/[, ]/)
      _.map(vals,function(val){ return val.replace(/\s+/g,'') })
      vals = _.filter(vals,function(val){ return ''!=val })


      if( 'level'==pn ) {
        var newvals = []
        _.each(vals,function(val){
          if( 'all' == val ) {
            newvals = newvals.concat(loglevels)
          }
          else if( val.match(/\+$/) ) {
            val = val.substring(0,val.length-1)
            newvals = newvals.concat(loglevels.slice(loglevels.indexOf(val)))
          }
          else newvals.push(val)
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
        if( 0 == routes.length ) {
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
    var handler = entry.handler

    if( 'print' === handler ) {
      handler = handlers.print
    }

    var prev = logrouter.find(route)

    if( !handler ) {
      if( prev ) {
        var remove = true
        if( prev.multiplex ) {
          prev.multiplex.pop()
          remove = 0 == prev.multiplex.length
        }
        if( remove ) {
          logrouter.remove(route)
        }
      }
    } 
    else {
      if( prev ) {
        handler = multiplexhandler(prev,entry.handler)
      }
      logrouter.add(route,handler)
    }
  })

}



var handlers = exports.handlers = {}

handlers.pretty = function() {
  var args = common.arrayify(arguments)
  args[1] = args[1].toUpperCase()

  var argstrs = []
  args.forEach(function(a){
    argstrs.push(
      null==a?a:
        'string'==typeof(a)?a:
        _.isDate(a)?(a.toISOString())://(a.getTime()%1000000):
        _.isObject(a)?common.owndesc(a,0):a
    )
  })

  return argstrs
}

handlers.print = function() {
  console.log( handlers.pretty.apply(null,common.arrayify(arguments)).join('\t') )
}

handlers.stream = function(stream,opts) {
  opts = opts||{}
  return function() {
    var args = common.arrayify(arguments)
    stream.write('json'==opts.format ? JSON.stringify(args)+'\n' : handlers.pretty.apply(null,args).join('\t')+'\n' )
  }
}

handlers.emitter = function(emitter) {
  return function() {
    var args = common.arrayify(arguments)
    emitter.emit('log',args)
  }
}

handlers.file = function(filepath,opts) {
  opts = opts||{}
  var ws = fs.createWriteStream(filepath,{flags:opts.flags||'a'})
  return handlers.stream(ws,opts)
}


// TODO: HTTP logging as per node-logentries



var makelogfuncs = exports.makelogfuncs = function(log) {

  function makelogger(level) {
    return function() { 
      var args = common.arrayify(arguments)
      args.unshift(level)
      log.apply(null,args)
    } 
  }

  log.debug = makelogger('debug')
  log.info  = makelogger('info')
  log.warn  = makelogger('warn')
  log.error = makelogger('error')
  log.fatal = makelogger('fatal')
}


var makelog = exports.makelog = function( logrouter ) {
  var log = function(level,type) {
    var args = common.arrayify(arguments,2)
    args.unshift(type)
    args.unshift(level)
    args.unshift(new Date())
    var routing = {
      level:  args[1],
      type:   args[2],
    }

    if( 'plugin' == type ) {
      routing.plugin = args[3]
      routing.tag    = args[4]
      routing.case   = args[6]
    }
    else {
      routing.case = args[3]
    }

    //console.dir(routing)

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

  makelogfuncs(log)

  return log
}



exports.parse_command_line = function parse_command_line( spec, logmaps ) {
  if( _.isArray(spec) ){
    spec.forEach(function(specentry){
      parse_command_line(specentry,logmaps)
    })
  }
  else if( spec.quiet ) {
    // empty map does the work!
  }
  else if( spec.print || spec.all ) {
    logmaps.push({level:'all',handler:handlers.print})        
  }
  else {
    // parse: level=,type=,plugin=,tag=,handler=
    // handler can be print,file:path

    var keys = {level:1,type:1,plugin:1,tag:1,'case':1,handler:1}
    var entry = {}
    var parts = (''+spec).split(',')
    _.each(parts,function(part){
      var kv = part.split(':')
      if( 2 <= kv.length ) {
        var key = kv[0]
        if( 'handler' == key ) {
          var handler = kv.slice(1).join(':')
          var m
          if( 'print' == handler ) {
            entry[key]=handlers.print
          }
          else if( m = /^file:(\/\/)?(.*)$/.exec(handler) ) {
            entry[key]=handlers.file(m[2])
          }
        }
        else if( keys[key] ) {
          entry[key]=kv[1]
        }
      }
    })
      
      // print by default
      if( !entry.handler ) {
        entry.handler = handlers.print
      }
    
    if( 0 < _.keys(entry).length ) {
      logmaps.push(entry)
    }
  }
}
