/* Copyright (c) 2014 Richard Rodger, MIT License */
/* jshint node:true, asi:true, eqnull:true */
"use strict";


var _     = require('underscore')
var async = require('async')
var error = require('eraro')({package:'executor'})


var common = require('./common')


// Create new Executor
// options:
//    * _trace_: true => built in tracing, function => custom tracing
function Executor( options ) {
  var self = this

  options = common.deepextend({
    timeout: 33333,
    trace:   false,
    stubs:   {Date:{}},
    error:   common.noop,
    msg_codes: {
      timeout:   'task-timeout',
      error:     'task-error',
      callback:  'task-callback',
      execute:   'task-execute',
      abandoned: 'task-abandoned'
    }
  },options)

  var set_timeout   = options.stubs.setTimeout   || setTimeout
  var clear_timeout = options.stubs.clearTimeout || clearTimeout
  var now           = options.stubs.Date.now     || Date.now

  var q = async.queue(work,1)

  var gated   = false
  var waiters = []

  var runtrace = !!options.trace
  self.tracelog = runtrace ? (_.isFunction(options.trace) ? null : []) : null

  var tr = !runtrace ? common.noop : (_.isFunction(options.trace) ? options.trace : function() {  
    var args = common.arrayify(arguments) 
    args.unshift(now())
    self.tracelog.push( args ) 
  })


  q.drain = function(){
    /* jshint boss:true */

    tr('ungate')
    gated = false

    var task = null
    while( task = waiters.shift() ) {
      work(task,task.cb)
    }
  }


  function work( task, done ) {
    tr('work',task.id,task.pattern)

    setImmediate( function(){
      var completed = false
      var timedout  = false

      if( done ) {
        var toref = set_timeout(function(){
          timedout = true
          if( completed ) return;

          tr('timeout',task.id,task.pattern)
          task.time.end = now()

          var err = new Error('[TIMEOUT]')
          err.timeout = true

          err = error(err,options.msg_codes.timeout,task)

          done(err);
        },options.timeout)
      }

      task.time = {start:now()}

      try {
        var task_start = Date.now()
        task.fn(function(err,out){
          completed = true
          if( timedout ) return;

          tr('done',task.id,task.pattern,Date.now()-task_start)
          task.time.end = now()

          if( toref ) {
            clear_timeout(toref)
          }

          if( err ) {
            err = error(err,options.msg_codes.error,task)
          }

          //console.log('EXEC',done)
          if( done ) {
            try {
              done(err,out);
            }
            catch(e) {
              options.error(error(e,options.msg_codes.callback,task))
            }
          }
        })
      }
      catch(e) {
        if( toref ) {
          clear_timeout(toref)
        }

        var et = error(e,options.msg_codes.execute,task)
        try {
          done(et);
        }
        catch(e) {
          options.error(et)
          options.error(error(e,options.msg_codes.abandoned,task))
        }
      }
    })
  }


  self.execute = function( task ) {
    if( task.gate ) {
      tr('gate',task.id,task.pattern)
      gated = true
      q.push(task, task.cb)
    }
    else if( gated && !task.ungate ) {
      tr('wait',task.id,task.pattern)
      waiters.push( task )
    }
    else {
      work( task, task.cb )
    }
  }

  
  return self
}



module.exports = function( options) {
  return new Executor(options)
}

