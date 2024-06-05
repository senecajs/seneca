/* Copyright © 2019-2022 Richard Rodger and other contributors, MIT License. */


import { autoincr } from './common'

// useful when defining services!
// note: has EventEmitter.once semantics
// if using .on('ready',fn) it will be be called for each ready event
function make_ready(root: any) {
  var private$ = root.private$

  // List of pending ready calls
  private$.next_ready_id = autoincr()
  private$.ready_list = []

  return {
    api_ready,
    clear_ready: clear_ready.bind(root),
    execute_ready,
  }
}


// TODO should callback with plugin errs, or throw them!
function api_ready(this: any, ready_func: any) {
  const self = this

  if (ready_func) {
    setTimeout(run_ready, self.private$.ge.options.interval)
  }
  else {
    const lastCleared = self.root.private$.cleared
    return new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        if (lastCleared < self.root.private$.cleared) {
          clearInterval(interval)
          resolve(self)
        }
      }, self.private$.ge.options.interval)
    })
  }

  function run_ready() {
    const private$ = self.root.private$

    const ready_call = function() {
      ready_func.call(self)
    }

    var ready_name =
      (null == ready_func.name ||
        '' === ready_func.name ||
        'ready' === ready_func.name
        ? 'ready_'
        : ready_func.name + '_ready_') + private$.next_ready_id()

    Object.defineProperty(ready_call, 'name', { value: ready_name })

    if (private$.ge.isclear()) {
      execute_ready(self, ready_call)
    } else {
      private$.ready_list.push(ready_call)
    }
  }

  return self
}


// Called by GateExecutor when clear.
function clear_ready(this: any) {
  const root = this
  const private$ = root.private$

  // Increment each time so that awaited ready can
  // return once a subsequent clear point is reached.
  private$.cleared = (private$.cleared || 0) + 1

  root.emit('ready')
  execute_ready(root, private$.ready_list.shift())

  if (private$.ge.isclear()) {
    while (0 < private$.ready_list.length) {
      execute_ready(root, private$.ready_list.shift())
    }
  }
}


function execute_ready(instance: any, ready_func: any) {
  if (null == ready_func) return
  var opts = instance.options()

  try {
    instance.log.debug({ kind: 'ready', case: 'call', name: ready_func.name })
    ready_func()
  } catch (ready_err: any) {
    var err = instance.error(ready_err, 'ready_failed', {
      message: ready_err.message,
    })

    if (opts.errhandler) {
      opts.errhandler.call(instance, err)
    }

    // Failure in a ready function is fatal as service
    // will not have started correctly
    else {
      instance.die(err)
    }
  }
}


export { make_ready }
