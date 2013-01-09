/* Copyright (c) 2013 Richard Rodger */


var common = require('./common')

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
  date,level,type,[plugin,tag],data

- only matching log entries will be triggered
- log props are 
    level: log severity, always one of 'debug', 'info', 'warn', 'error', 'fatal'
    type:  log type - a short semantic code
    plugin: plugin base name
    tag:    plugin tag

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

*/
var makelogrouter = exports.makelogrouter = function( logspec ) {
  var propnames = ['level','type','plugin','tag']
  var loglevels = ['debug', 'info', 'warn', 'error', 'fatal']

  var map = logspec.map
  var logrouter = new router.Router()

  _.each(map,function(entry){
    //console.dir(entry)

    var routes = []

    _.each(propnames,function(pn){
      var valspec = entry[pn]
      if( valspec ) {
        var vals = valspec.replace(/\s/g,'').split(',')

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
        //console.log(pn+'='+vals)

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
      
      //console.log('routes')
      //console.dir(routes)
    _.each(routes,function(route){
      var handler = entry.handler
      if( !handler ) {
        handler = common.noop
      } 
      var prev = logrouter.find(route)
      if( prev ) {
        handler = multiplexhandler(prev,entry.handler)
      }
      logrouter.add(route,handler)
    })
  })

  return logrouter
}
