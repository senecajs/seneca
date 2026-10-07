# Shut down gracefully

How to stop a Seneca process so that in-flight messages finish, plugins
release their resources, and the process exits.

## Close the instance

```js
await seneca.close()
// or
seneca.close(function (err) { ... })
```

`close()`:

1. waits for queued and in-flight messages to complete, up to
   `close_delay` milliseconds (default 22222);
2. marks the instance closed, so that new messages fail with `closed`;
3. runs the `sys:seneca,cmd:close` action, which emits the `close`
   event and runs every plugin's close stages;
4. removes event and signal listeners and stops internal timers.

After `close()` resolves, nothing in Seneca keeps the event loop alive.
If the process does not exit, something else (your own servers, timers
or connections) is still open.

## Release resources in plugins

Register shutdown work with `destroy`; stages run in reverse order of
registration, so the last plugin loaded shuts down first:

```js
function store(options) {
  let db
  this.prepare(async function () {
    db = await connect(options.url)
  })
  this.destroy(async function () {
    await db.end()
  })
}
```

Callback style plugins add a prior on the close action instead:

```js
this.add('sys:seneca,cmd:close', function (msg, reply) {
  db.end(() => this.prior(msg, reply))
})
```

Plugins written for Seneca 3 that hook `role:seneca,cmd:close` still
run: Seneca 4 calls that pattern too when an action exists for it.

## Close on process signals

Let Seneca close the instance and exit when the process is asked to
stop:

```js
Seneca({
  system: {
    close_signals: { SIGTERM: true, SIGINT: true },
  },
})
```

The process exits with code 0 after closing, or with code 1 if closing
reported an error. To run your own code first, handle the signal
yourself and call `close()`:

```js
process.on('SIGTERM', async () => {
  server.close()
  await seneca.close()
  process.exit(0)
})
```

## Bound the wait

If actions may hang, lower `close_delay` so that shutdown does not wait
for the full action timeout:

```js
Seneca({ close_delay: 5000 })
```

## Fatal errors

A fatal error closes the instance the same way and then exits with code
1, or with code 2 if closing takes longer than `death_delay` (default
11111 ms). Replace `system.exit` to intercept the exit in tests.

## Scripts and tests

Short scripts and tests must close every instance they create;
otherwise a plugin's sockets or timers keep the process alive. An
instance with no plugins and no in-flight work does not keep the process
alive on its own.
