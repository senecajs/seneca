/* Copyright (c) 2013-2015 Richard Rodger, MIT License */
/* jshint node:true, asi:true, eqnull:true */

"use strict";

var fs   = require('fs')
var util = require('util')

var _      = require('lodash')
var patrun = require('patrun')
var jsonic = require('jsonic')

var error  = require('eraro')({package:'seneca',msgmap:ERRMSGMAP()})

var common = require('./common')


var start_time = Date.now()


var log_index = {
  level:  2,
  type:   3,
  plugin: 4,
  case:   5,
  act:    6,
  pin:    7
}

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
  if( spec && ( true === spec.print ||
                true === spec.all ||
                'print' === spec ||
                'all' === spec) ) {
    return [{level:'all',handler:handlers.print}]
  }
  else if( spec &&
           (spec.quiet ||
            'quiet' === spec ||
            spec.silent ||
            'silent' === spec) ) {
    return [];
  }
  else if( 'test' === spec ) {
    return [{level:'error+',handler:handlers.print}]
  }
  else if( _.isString(spec) ) {
    var logspec = {map:[]}
    parse_command_line(spec,logspec,{shortcut:false})
    return logspec.map
  }
  else return [];
}



// entry = single entry, from map:[]
var makelogroute = exports.makelogroute = function(entry,logrouter) {
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
            throw error('invalid_log_level', {level:level})
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

    if( 'print' === handler ) {
      handler = handlers.print
    }

    if( !_.isFunction( handler ) ) {
      throw error('handler_not_function', {entry:entry})
    }

    if( handler ) {
      handler.routestr = routestr
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

      else if( entry.act ) {
        handler = make_act_handler(entry.act,handler)
      }

      else if( entry.pin ) {
        handler = make_pin_handler(entry.pin,handler)
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


function make_act_handler( act, handler ) {
  return function() {
    if( -1 != (''+arguments[ log_index.act ]).indexOf( act ) ) {
      return handler.apply( this, arguments )
    }
  }
}


function make_pin_handler( pin, handler ) {
  pin = _.isObject(pin) ? pin : jsonic(pin)
  var pinstr = common.argpattern( pin )

  return function() {
    if( -1 != (''+arguments[ log_index.pin ]).indexOf(pinstr) ) {
      return handler.apply( this, arguments )
    }
  }
}



var handlers = exports.handlers = {}

handlers.pretty = function() {
  var args = common.arrayify(arguments)
  args[2] = args[2].toUpperCase()

  if( args[0].short$ ) {
    args[0] = ''+(args[0].getTime()-start_time)
    args[0] = '        '.substring(0,8-args[0].length)+args[0]
  }

  var argstrs = []
  args.forEach(function(a){
    var pstr = (null==a)?a:
          'string'==typeof(a)?a:
          _.isDate(a)?(a.toISOString()):
          //_.isObject(a)?common.owndesc(a,3,true):a
          _.isObject(a)?jsonic.stringify(a):a

    argstrs.push(pstr)
  })

  return argstrs
}

handlers.silent = function silent() {
  // does nothing!
}

handlers.print = function print() {
  var arr = handlers.pretty.apply(null,common.arrayify(arguments))
  console.log( [arr.slice(0,3).join(' ')].concat(arr.slice(3)).join('\t') )
}

handlers.stream = function stream(outstream,opts) {
  opts = opts||{}
  return function() {
    var args = common.arrayify(arguments)
    outstream.write('json'==opts.format ?
                    JSON.stringify(args)+'\n' :
                    handlers.pretty.apply(null,args).join('\t')+'\n' )
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


var makelog = exports.makelog = function( logspec, ctxt ) {
  var identifier = ctxt.id
  var start_time = ctxt.start
  var short      = ctxt.short || logspec.short

  var logrouter = makelogrouter( logspec )
  var timesince = 'since' == logspec.time

  var log = function(level,type) {
    var when = new Date()
    when.short$ = short

    var args = common.arrayify(arguments,2)

    args.unshift(type)
    args.unshift(level)
    args.unshift(identifier)
    args.unshift(when)

    var pluginref = args[ log_index.plugin ]
    pluginref = _.isString(pluginref) ? pluginref.trim() : pluginref
    
    var routing = {
      level:  args[ log_index.level ],
      type:   args[ log_index.type ],
      plugin: pluginref,
      case:   args[ log_index.case ]
    }

    var handler = logrouter.find(routing)

    if( handler ) {
      var lastval = args[args.length-1]
      if( _.isFunction(lastval) ) {
        var logvals = []
        try {
          logvals = lastval()
        }
        catch(e) {
          logvals = [e,e.stack]
        }
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

  log.router = logrouter

  return log
}



function parse_command_line( spec, logspec, flags ) {
  flags = flags || {}

  var logmaps = logspec.map

  if( flags.shortcut ) {
    if( 'short' === spec || true === spec.short ) {
      logspec.short = true
      if( 0 === logmaps.length ) {
        logmaps.push( {level:'info+',handler:'print'} )
      }
    }

    var shortentries = shortcut(spec)

    if( 0 < shortentries.length ) {
      shortentries.forEach( function(shortentry) {
        logmaps.push(shortentry)
      })
      return;
    }
  }


  if( _.isArray(spec) ){
    spec.forEach(function(specentry){
      parse_command_line(specentry,logspec)
    })
    return;
  }


  // parse: level=,type=,plugin=,tag=,case=,handler=
  // handler can be print,file:path

  var keys = {level:1,type:1,plugin:1,tag:1,'case':1,handler:1,regex:1,pin:1,act:1}
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


exports.log_act_in = function( instance, actinfo, actmeta,
                               args, prior_ctxt, act_callpoint )
{
  if( actmeta.sub ) return;

  var origin = (actinfo.info && actinfo.info.origin )

  instance.log.debug(
    'act',
    minlen(actmeta.plugin_fullname),
    'IN',
    actinfo.actid,
    actmeta.pattern,
    function() {
      return [
        actmeta.descdata ? actmeta.descdata(args) : jsonic.stringify(args),
        ( prior_ctxt.entry ?
          'ENTRY' :
          'PRIOR;'+(prior_ctxt.chain.slice(0,prior_ctxt.depth)).join(',') ),
        actmeta.id,
        origin ? 'LISTEN' : '-',
        origin || '-',
        args.gate$ ? 'GATE' : '-',
        args.caller$ || act_callpoint
      ]
    })
}


exports.log_act_out =
  function( instance, actinfo, actmeta, args, result, prior_ctxt, act_callpoint )
{
  if( actmeta.sub ) return;

  var accept = (actinfo.info && actinfo.info.accept ) 

  instance.log.debug(
    'act',
    minlen(actmeta.plugin_fullname),
    'OUT',
    actinfo.actid,
    actmeta.pattern,
    function() {
      return _.flatten( [
        ( actmeta.descdata ?
          actmeta.descdata(result[1]) :
          jsonic.stringify(result[1]) ),
        ( prior_ctxt.entry ?
          'EXIT' :
          'PRIOR;'+(prior_ctxt.chain.slice(0,prior_ctxt.depth)).join(',') ),
        actmeta.id,
        actinfo.listen ? 'LISTEN' : '-',
        accept || actinfo.listen || '-',
        actinfo.duration,
        args.gate$ ? 'GATE' : '-',
        args.caller$ || act_callpoint
      ])
    })
}


exports.log_act_err = function( instance, actinfo, actmeta,
                                args, prior_ctxt, err, act_callpoint )
{
  if( false === err.log ) return;

  // TODO err.log could be a log level

  instance.log.error(
    'act',
    minlen(actmeta.plugin_fullname || '-'),
    //actmeta.plugin_tag  || '-',
    'OUT',
    actinfo.actid,
    actmeta.pattern     || '-',
    actinfo.duration,
    ( actmeta.descdata ?
      actmeta.descdata(args) : jsonic.stringify(args) ),
    ( prior_ctxt.entry ?
      'ENTRY' :
      'PRIOR;'+(prior_ctxt.chain.slice(0,prior_ctxt.depth)).join(',') ),
    actmeta.id,
    args.gate$ ? 'GATE' : '-',
    err.message,
    err.code,
    jsonic.stringify(err.details),
    err.stack,
    args.caller$ || act_callpoint
  )

}


exports.log_act_cache = function( instance, actinfo, actmeta,
                                  args, prior_ctxt, act_callpoint )
{
  instance.log.debug(
    'act',
    minlen(actmeta.plugin_fullname || '-'),
    //actmeta.plugin_tag,
    'OUT',
    actinfo.actid,
    actmeta.pattern,
    'CACHE',
    ( prior_ctxt.entry ?
      'ENTRY' :
      'PRIOR;'+(prior_ctxt.chain.slice(0,prior_ctxt.depth)).join(',') ),
    function() {
      return [
        actmeta.descdata ?
          actmeta.descdata(args) :
          jsonic.stringify(args),
        'A='+actmeta.id,
        args.caller$ || act_callpoint
      ]
    })
}


exports.log_exec_err = function( instance, err ) {
  if( false === err.log ) return;

  err.details        = err.details || {}
  err.details.plugin = err.details.plugin || {}

  instance.log.error(
    'act',
    minlen(err.details.plugin.fullname || '-'),
    //err.details.plugin.tag  || '-',
    err.details.id          || '-',
    err.details.pattern     || '-',
    err.message,
    err.code,
    jsonic.stringify(err.details),
    err.stack )
}


exports.log_act_bad = function( instance, err, loglevel ) {
  if( false === err.log ) return;

  loglevel = loglevel || 'warn'
  if( 'ignore' == loglevel ) return;

  err.details = err.details || {}
  err.details.plugin = err.details.plugin || {}

  instance.log(
    loglevel,
    'act',
    minlen( (err.details.plugin.name || '-')+
            (err.details.plugin.tag ? '/'+err.details.plugin.tag : '')),
    err.details.id          || '-',
    err.details.pattern     || '-',
    err.message,
    err.code,
    jsonic.stringify(err.details),
    err.stack )
}


exports.make_delegate_log = function(actid,actmeta,instance) {

  var log     = actmeta.log
  var pattern = actmeta.pattern

  if( _.isFunction(log) ) {
    return function() {
      var args    = common.arrayify(arguments)
      var entries = [args[0],'ACT',actid,pattern].concat(args.slice(1))
      log.apply(this,entries)
    }
  }
  else {
    return function() {
      var args = common.arrayify(arguments)
      instance.log.apply(
        this,
        [args[0],'-','-','ACT',actid,pattern]
          .concat(args.slice(1)))
    }
  }
}


function minlen(s) {
  return (s && s.length < 8) ? s+'       ' : s
}

function ERRMSGMAP() {
  return {
    invalid_log_level: "Unknown log level: <%=level%>; must be one of "+
      "debug, info, warn, error, fatal."
  }
}
