# Instance API reference

All methods are available on a Seneca instance (`const seneca = Seneca()`)
and on its delegates (`this` inside actions and plugins). Methods that
configure or register something return the instance so that calls can
be chained, except `decorate` and `depends`, which return `undefined`;
methods that look something up return the value found. Each entry
below states what it returns when it is not the instance.

Patterns and messages may be given as objects or as
[Jsonic](https://github.com/jsonicjs/jsonic) strings, optionally followed
by an object whose properties are merged in; see [Patterns](patterns.md).

Contents: [Actions and messages](#actions-and-messages) ·
[Extending actions](#extending-actions) · [Message flow](#message-flow) ·
[Lifecycle](#lifecycle) · [Errors and testing](#errors-and-testing) ·
[Plugins](#plugins) · [Inspection](#inspection) ·
[Transport](#transport) · [Other](#other)

## Actions and messages

### `add`

```js
seneca.add(pattern, [moreProps], [action], [actdef])
```

Add an action for a pattern.

* `pattern`: object or Jsonic string. Object or function valued
  properties are validation rules; `$` properties are directives.
* `action`: `function (msg, reply, meta) { ... }`, called with an action
  delegate as `this`. Call `reply(null, result)`, `reply(result)` (an
  object or array) or `reply(err)` (an `Error`) exactly once. Returning
  a value instead of replying is only meaningful for `direct` calls.
  Without an action, a placeholder action is added that replies with
  the message's `default$` value or `null`.
* `actdef`: extra properties for the [action definition](action-definition.md)
  (for example `desc`, `fixed$`, `custom$`, `strict$`).

If an action already exists for the pattern, it becomes the prior of
the new one (see [`prior`](#prior) and the option `strict.add`).

### `message`

```js
seneca.message(pattern, [moreProps], async function (msg, meta) { ... })
```

Add an action written as an async function. The resolved value is the
result; a rejection is an error reply. `this` is the action delegate.
Properties of the async function (such as `validate`) are copied to the
action.

### `act`

```js
seneca.act(msg, [moreProps], [callback])
```

Submit a message. The matching action runs asynchronously (on a later
tick, in submission order per instance). `callback(err, result, meta)`
is called once, with the action delegate as `this`. Without a callback
the message is fire-and-forget; errors are logged and passed to the
error handler. Directives on the message control processing (see
[Message directives](message-directives.md)).

### `post`

```js
const result = await seneca.post(msg, [moreProps])
```

Promise form of `act`: resolves with the result, rejects with the error.

### `direct`

```js
const result = seneca.direct(msg, [moreProps])
```

Run the matching action synchronously on the calling stack and return
the action function's return value. Only the return value is returned:
for a callback style action that calls `reply(result)`, `direct`
returns `undefined` (the reply still goes through outward processing and
to any callback). Write actions meant for direct calls so that they
`return` their result. Inward and outward processing still apply.
Equivalent to a message with `direct$: true`. Child messages submitted
by the action are asynchronous unless they are direct too.

### `prior`

```js
this.prior(msg, [reply])        // inside an action
const result = await this.prior(msg)
```

Call the action that the current action overrides, with the same
message (or a modified copy). With a callback behaves like `act`,
without one like `post`. When there is no prior, the reply is the
message's `default$` value or `null`. Calling `prior` outside an action
throws `no_prior_action`.

### `reply`

```js
const found = seneca.reply({ meta, err, out })
```

Deliver a reply to a message that is waiting in the history, identified
by `meta.id`. Returns true if the message was found. Used by transports
that receive responses separately from requests.

## Extending actions

### `wrap`

```js
seneca.wrap(pin, [actdef], wrapper)
```

Add `wrapper` as a new action for every existing pattern that matches
`pin` (a pattern or array of patterns, globs allowed; `''` matches all
patterns). The wrapper calls `this.prior(msg, reply)` to run the
original action.

### `fix`

```js
const fixed = seneca.fix(pattern, [fixedMsgProps], [customMeta])
fixed.add('cmd:a', action)
fixed.sub('cmd:a', fn)
```

Return a delegate whose `add` and `sub` calls prepend `pattern` to the
given patterns, merge `fixedMsgProps` into every message handled
(`fixed$`), and add `customMeta` to `meta.custom` (`custom$`).

### `translate`

```js
seneca.translate(from, to, [pick], [flags])
```

Route messages matching `from` to the pattern `to`. The forwarded
message is the original message's properties (all non-`$` properties,
or only the ones selected by `pick`) with `to`'s properties applied;
null values are dropped. `pick` is a comma separated string or array of
property names, where a leading `-` excludes a property, or an object
of name to boolean. Translations also apply to patterns later passed to
`add` and `sub` (unless `translate$: false`).

### `inward`, `outward`

```js
seneca.inward(function (spec) { ... })
seneca.outward(function (spec) { ... })
```

Add a processing step to the inward pipeline (before the action runs) or
the outward pipeline (after it replies). `spec.ctx` holds `seneca` (the
action delegate), `actdef`, `options`, `origmsg` and `callpoint`;
`spec.data` holds `meta`, `msg` and `reply` (inward) or `meta`, `msg`,
`res`, `err`, `out` (outward). A step may return nothing, or
`{ op: 'stop', out: { kind: 'error', code, info } }` to fail the message,
or `{ op: 'stop', out: { kind: 'result', result } }` to reply at once.
See [Message lifecycle](../explanation/message-lifecycle.md).

## Message flow

### `sub`

```js
seneca.sub(pattern, [moreProps], function (msg, result, meta) { ... })
```

Subscribe to messages that match `pattern` exactly (a message
`a:1,b:2` triggers subscriptions for `a:1`, `a:1,b:2` and `b:2`, but a
subscription for `a:1,x:1` does not fire for `a:1`). By default (or with
`in$: true`) the function is called before the action, with `result`
undefined; with `out$: true` it is called after the action with the
result (or error). Both can be combined. Subscription functions are
synchronous and must not throw (`sub_inward_action_failed`,
`sub_outward_action_failed`). Only the first message of a prior chain
is published.

### `gate`, `ungate`

```js
seneca.gate().act('a:1').act('a:2')   // a:2 waits for a:1
seneca.ungate()
```

`gate()` returns a delegate that sets `gate$: true` on every message, so
that messages submitted through it run one after another and later
messages on the instance wait for them. `ungate()` turns the flag off
on the instance it is called on.

### `delegate`

```js
const d = seneca.delegate([fixedargs], [fixedmeta])
```

Create a delegate: an object inheriting from the instance, with its own
`fixedargs` (properties merged into every message it submits; with
`strict.fixedargs` they override message properties), `fixedmeta`
(`custom`, `gate`, `fatal`, `local`, `direct`), `context` (a copy of the
parent's), `did` identifier and `toString()`. Delegates share actions,
plugins, options and events with the root instance. Seneca creates a
delegate for every action execution and every plugin.

## Lifecycle

### `ready`

```js
seneca.ready(function () { ... })   // this === seneca
await seneca.ready()                // resolves with the instance
```

Run a function once all queued work (plugin loading, in-flight messages)
has completed. Each call registers one callback; the `ready` event fires
every time the queue clears. A function that throws causes a fatal
`ready_failed` error unless an error handler is set.

### `close`

```js
seneca.close(function (err) { ... })
await seneca.close()
```

Close the instance: wait for in-flight messages (at most `close_delay`
milliseconds), mark the instance closed (new messages fail with
`closed`), run the `sys:seneca,cmd:close` action (which emits the
`close` event and runs plugin close hooks and `destroy` functions),
remove signal and event listeners, and stop the history and status
timers. Closing twice is harmless.

### `options`

```js
const opts = seneca.options()
seneca.options({ timeout: 5000 })
seneca.options({ timeout: 5000 }, true)   // returns the instance
```

Get the resolved options, or deep merge new values and return the
result. Changing `log` rebuilds the logger; changing `tag` updates the
instance id; `debug.callpoint` takes effect immediately. See
[Options](options.md).

### `use`

```js
seneca.use(plugin, [options])
```

Load a plugin. See [Plugin definition](plugins.md).

### `decorate`

```js
seneca.decorate(name, value)
```

Add a property (usually a function) to the root instance, available on
every delegate. The name must not start with `_`, must not already be
decorated, and must not shadow an existing property. Returns
`undefined` (not chainable).

### `prepare`, `destroy`

```js
this.prepare(async function () { ... })   // inside a plugin
this.destroy(async function () { ... })
```

Register asynchronous plugin initialization and shutdown stages. See
[Plugin definition](plugins.md#the-definition-function).

## Errors and testing

### `error`

```js
seneca.error(function (err, meta) { ... })   // set the global error handler
const err = seneca.error(code, [details])    // create an error
```

With a function: set `options.errhandler`, which is called for action
errors, callback errors, fatal errors and ready failures. A truthy return
value marks the error as handled: the action callback is then not
called. With a code: create a Seneca error (using the current plugin's
`errors` map when inside a plugin). See [Error codes](error-codes.md).

### `fail`

```js
seneca.fail(code, [details])          // throws
seneca.fail(condition, code, details) // throws when condition is true
```

Create and throw an error. With `details.throw$ === false` the error is
returned instead. The three argument form requires a boolean condition
(`fail_cond_must_be_bool`); more than three arguments is an error.

### `test`

```js
seneca.test([errhandler], [logspec])
```

Enter test mode: `test: true`, the `test` logger at level `warn` (or
`logspec`, for example `'print'` for `debug`), `debug.callpoint` on,
caller locations attached to messages, and `errhandler` installed if
given (typically the test's `done` callback). See
[Test Seneca code](../how-to/test-seneca-code.md).

### `quiet`

```js
seneca.quiet()
```

Turn logging off (level `none`). If test mode was requested from the
environment or command line it takes precedence.

### `explain`

```js
const captured = seneca.explain(true)   // start capturing all messages
const result = seneca.explain(false)    // stop and return the capture
```

Toggle top level explanation capture: while on, every message's
explanation array is pushed onto the returned array. Inside an action,
`this.explain(entry)` records an entry when the message is being
explained, and `this.explain()` returns the record function or
undefined. Per message explanation is requested with the `explain$`
directive. See [Debug and inspect](../how-to/debug-and-inspect.md).

## Plugins

| Method | Description |
| ------ | ----------- |
| `seneca.use(plugin, [options])` | Load a plugin. |
| `seneca.export(key)` | Get a plugin export (`'name'`, `'name/key'`, `'name$tag/key'`). |
| `seneca.depends(name, ...deps)` | Fatal error if a dependency is not loaded; returns `undefined` (not chainable). |
| `seneca.list_plugins()` | All plugin records by full name. |
| `seneca.find_plugin(name, [tag])` | One plugin record. |
| `seneca.has_plugin(name, [tag])` | Whether a plugin is loaded. |
| `seneca.ignore_plugin(name, [tag], [ignore])` | Prevent a plugin from loading. |

See [Plugin definition](plugins.md).

## Inspection

### `has`, `find`, `list`

```js
seneca.has(pattern)                 // exact pattern exists
seneca.find(pattern, { exact: true }) // action definition
seneca.list(pattern)                // matching patterns
```

See [Patterns](patterns.md#inspecting-patterns) and
[Action definition](action-definition.md).

### `status`, `stats`, `ping`

```js
seneca.status([{ stats: msg }])
seneca.stats([msg])
seneca.ping()
```

`status()` returns `{ stats, history: { total, log }, transport: {
register } }`, where `history.log` lists in-flight messages. `stats()` is
the builtin statistics action called directly (`msg.pattern` for one
pattern, `msg.summary: false` for all). `ping()` returns `now`, `uptime`,
`id`, `cpu`, `mem`, `act` counters and transport registrations `tr`.
See [Builtin actions](builtin-actions.md).

### `log`

`seneca.log(entry)`, `seneca.log.info(entry)` and the other level
methods create log entries; see [Logging](logging.md).

## Transport

### `listen`, `client`

```js
seneca.listen([config], [callback])
seneca.client([config])
```

Receive or send messages through a transport plugin. See
[Transport](transport.md).

## Other

| Method | Description |
| ------ | ----------- |
| `seneca.toString()` | `Seneca/<id>` (delegates append their fixed arguments). |
| `seneca.seneca()` | Returns the instance; a cheap way to check for a Seneca object (`isSeneca` is also true). |
| `seneca.on(event, fn)`, `once`, `emit`, `removeListener` | Node.js `EventEmitter` methods; see [Events](events.md). |
| `seneca.die(err)` | Trigger a fatal error: log, call the error handler, close and exit (unless `debug.undead`). |
| `seneca.util` | Utilities; see [Module exports and utilities](static-api-and-utilities.md). |
| `seneca.valid` | Gubu shape builders for validation rules and plugin defaults. |

Legacy aliases (`findact`, `hasact`, `act_if`, `findpins`, `pinact`,
`plugins`, `findplugin`, `hasplugin`) are listed in [Legacy](legacy.md).
