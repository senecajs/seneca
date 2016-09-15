/* Copyright (c) 2016 Richard Rodger and other contributors, MIT License */
'use strict'

// To test separately:
// $ ./node_modules/.bin/lab -v -P ward -t 100 -L -g ward

var Assert = require('assert')


module.exports = function (opts) {
  return new Ward(opts)
}


var wardI = -1


function Ward (opts) {
  var self = this
  ++wardI


  opts = opts || {}
  Assert('object' === typeof opts)

  opts.name = opts.name || 'ward' + wardI


  self.add = api_add
  self.process = api_process
  self.tasknames = api_tasknames
  self.toString = api_toString


  var tasks = []


  function api_add (task) {
    Assert('function' === typeof task)

    if (!task.name) {
      Object.defineProperty(task, 'name', {
        value: opts.name + '_task' + tasks.length
      })
    }

    tasks.push(task)
  }


  function api_process (ctxt, data) {
    for (var tI = 0; tI < tasks.length; ++tI) {
      var index$ = tI
      var taskname$ = tasks[tI].name

      ctxt.index$ = index$
      ctxt.taskname$ = taskname$

      var res = tasks[tI].call(null, ctxt, data)

      if (res) {
        res.index$ = index$
        res.taskname$ = taskname$
        res.ctxt$ = ctxt
        res.data$ = data
        return res
      }
    }
  }


  function api_tasknames () {
    return tasks.map(function (v) {
      return v.name
    })
  }


  function api_toString () {
    return opts.name + ':[' + self.tasknames() + ']'
  }

  return self
}
