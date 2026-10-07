# Events reference

A Seneca instance is a Node.js `EventEmitter` (`setMaxListeners(0)`).
Delegates share the listeners of their root instance, so `seneca.on(...)`
can be called on any instance or delegate.

| Event | Arguments | When |
| ----- | --------- | ---- |
| `log` | `(entry)` | Every log entry, before level filtering. See [Logging](logging.md). |
| `ready` | none | Each time the action queue becomes empty (so after startup, after each plugin finishes loading, and whenever all in-flight actions complete). Use `seneca.ready(fn)` for a one-time callback. |
| `close` | none | During `seneca.close()`, emitted by the builtin `sys:seneca,cmd:close` action before plugin close hooks run. |
| `act-in` | `(msg, null, meta)` | A message has passed inward processing and its action is about to run. |
| `act-out` | `(msg, result, meta)` | An action replied without error. |
| `act-err` | `('action', msg, meta, err)` or `('callback', msg, meta, err, result)` | An action failed (threw, replied an error, or timed out), or the caller's callback threw. |
| `act-err-4` | as `act-err`, first argument always `'callback'` | Emitted alongside `act-err`; reserved for a future argument layout. |
| `error` | `(err)` | Bound to `seneca.die`: emitting `error` is a fatal error. |

`seneca.close()` removes all listeners for `act-in`, `act-out`,
`act-err`, `act-err-4`, `ready`, `pin` and `after-pin` once the close
action has completed.

## The `events` option

Listeners can be registered before startup with the `events` option:

```js
Seneca({
  events: {
    log: (entry) => { ... },
    ready: () => { ... },
    close: () => { ... },
  },
})
```

The keys `act_in`, `act_out` and `act_err` are accepted by the option but
register listeners for events of those names, which are never emitted
(the action events use hyphens). Register them with
`seneca.on('act-in', fn)` instead.

## Delegate hooks

A delegate (for example one created with `seneca.delegate()` for a web
request) can define functions that are called for actions executed
through it, without going through the event emitter:

| Property | Called with |
| -------- | ----------- |
| `on_act_in(actdef, msg, meta)` | Before the action runs. |
| `on_act_out(actdef, result, meta)` | After a successful reply. |
| `on_act_err(actdef, result, meta)` | After an error. |

## Subscriptions

To observe messages by pattern rather than for the whole instance, use
`seneca.sub(pattern, fn)`; see [`sub`](api.md#sub) and
[Control message flow](../how-to/control-message-flow.md).
