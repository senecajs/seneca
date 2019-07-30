/* Copyright © 2019 Richard Rodger and other contributors, MIT License. */
'use strict'

const Common = require('./common')

// useful when defining services!
// note: has EventEmitter.once semantics
// if using .on('ready',fn) it will be be called for each ready event
module.exports = function make_ready(root) {
  var private$ = root.private$

  // List of pending ready calls
  private$.next_ready_id = Common.autoincr()
  private$.ready_list = []

  return {
    api_ready,
    clear_ready: clear_ready.bind(root),
    execute_ready
  }
}

function api_ready(ready) {
  var self = this
  var private$ = self.root.private$

  if ('function' === typeof ready) {
    setImmediate(function register_ready() {
      var ready_call = function() {
        ready.call(self)
      }

      var ready_name =
        (null == ready.name || '' === ready.name || 'ready' === ready.name
          ? 'ready_'
          : ready.name + '_ready_') + private$.next_ready_id()

      Object.defineProperty(ready_call, 'name', { value: ready_name })

      if (private$.ge.isclear()) {
        execute_ready(self, ready_call)
      } else {
        private$.ready_list.push(ready_call)
      }
    })
  }

  return self
}

function clear_ready() {
  const root = this
  var private$ = root.private$

  root.emit('ready')
  execute_ready(root, private$.ready_list.shift())

  if (private$.ge.isclear()) {
    while (0 < private$.ready_list.length) {
      execute_ready(root, private$.ready_list.shift())
    }
  }
}

function execute_ready(instance, ready_func) {
  if (null == ready_func) return
  var opts = instance.options()

  try {
    instance.log.debug({ kind: 'ready', case: 'call', name: ready_func.name })
    ready_func()
  } catch (ready_err) {
    var err = instance.error(ready_err, 'ready_failed', {
      message: ready_err.message
    })

    if (opts.errhandler) {
      opts.errhandler.call(instance, err)
    } else {
      throw err
    }
  }
}
