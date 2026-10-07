# Message lifecycle and architecture

This page explains what happens between `seneca.act(msg, callback)` and
the callback. Knowing the pipeline makes the options, directives and
hooks in the reference predictable.

## Overview

```
act(msg) ──► Meta ──► executor queue ──► inward pipeline ──► action
                                                              │
callback ◄── outward pipeline ◄── reply(err, result) ◄────────┘
```

1. **Submission.** `act` parses the message (Jsonic string plus object),
   merges the instance's `fixedargs`, and builds a *Meta* object from
   the message directives: identifiers, timeout, gate, fatal, local,
   custom data, parents. Directives are then removed from the message
   that the action will see.
2. **Queueing.** The message is handed to the instance's executor
   (the `gate-executor` module) as a unit of work with the meta
   timeout. The executor runs work in submission order and enforces
   gates: a gated unit (`gate$`) must complete before later units
   start. `direct` calls skip the queue and run on the calling stack.
3. **Inward processing.** When the unit runs, Seneca finds the action
   definition for the message (or the prior named by the meta data)
   and creates an *action delegate*: a delegate of the instance that
   knows the plugin, the message and the meta data, and whose
   `fixedargs` carry the transaction id. The inward pipeline then
   runs; it may stop the message early (not found, default result,
   closed instance, validation failure, cached result, too many
   parents).
4. **Action.** The action function is called with the message, a
   `reply` function and the meta data, with the action delegate as
   `this`. Messages the action submits become *child messages*: they
   inherit the transaction id and custom meta data and record the
   action as a parent.
5. **Outward processing.** When the action replies (or throws, or times
   out), the outward pipeline runs: it validates the result, records
   statistics and history, merges reply meta data, traces, publishes to
   subscriptions, emits `act-out`, and converts errors into the form
   callers see.
6. **Callback.** The caller's callback runs with the action delegate as
   `this`, unless the error handler claimed the error. A throwing
   callback is itself reported as an `act_callback` error.

## The pipelines

The inward and outward pipelines are [Ordu](https://github.com/rjrodger/ordu)
task lists, exposed as `seneca.order.inward` and `seneca.order.outward`.
Tasks run synchronously in order; each may return an operation such as
`stop` with an error or a result. `seneca.inward(fn)` and
`seneca.outward(fn)` append tasks; the `order.*.debug` options print the
task execution. The default tasks are:

| Inward task | Purpose |
| ----------- | ------- |
| `inward_msg_modify` | Apply the action's `fixed$` properties and `custom$` meta data. |
| `inward_closed` | Reject messages on a closed instance (unless `closing$`). |
| `inward_act_cache` | Return the recorded result for a repeated message id. |
| `inward_act_default` | Reply with `default$` (or `{}` when `strict.find` is false) when no action matched. |
| `inward_act_not_found` | Fail with `act_not_found` when no action matched. |
| `inward_act_stats` | Count the call. |
| `inward_validate_msg` | Validate the message against the action's rules. |
| `inward_warnings` | Log `deprecate$` warnings. |
| `inward_msg_meta` | Fill in pattern, action, plugin, parents, custom data and explanation on the meta object. |
| `inward_limit_msg` | Enforce `limits.maxparents`. |
| `inward_prepare_delegate` | Attach the plugin, shared object, `reply` and `explain` to the action delegate. |
| `inward_sub` | Call inbound subscriptions. |
| `inward_announce` | Emit `act-in`. |

| Outward task | Purpose |
| ------------ | ------- |
| `outward_make_error` | Rebuild `Error` objects from error-shaped results (transports). |
| `outward_act_stats` | Count completion or failure, record timing. |
| `outward_act_cache` | Record the result in the history. |
| `outward_res_object` | Enforce `strict.result`. |
| `outward_res_entity` | Convert `entity$` results when the entity plugin is present. |
| `outward_msg_meta` | Merge custom meta data from the reply. |
| `outward_trace` | Record trace descriptors on the message and its parent. |
| `outward_sub` | Call outbound subscriptions. |
| `outward_announce` | Emit `act-out` and log `OUT`. |
| `outward_act_error` | Turn failures into the caller-visible error, log `ERR`, emit `act-err`, call the error handler, or die for `fatal$` messages. |

The `add` method is also a pipeline (`seneca.order.add`) whose tasks
apply translations, resolve the prior, extract validation rules, and
register the action in the router. Plugin loading is the fourth
pipeline (`seneca.order.plugin`).

## Identifiers and tracing

Every message has an identifier `mi/tx`: `mi` identifies the message
and `tx` the transaction, which is shared by all messages in a call
tree. Callers may set them (`id$`, `tx$`) to correlate work or to make a
message idempotent: a repeated identifier within the history window
returns the recorded result.

The meta data records the chain of parent messages (`meta.parents`) and,
as children reply, a tree of trace descriptors (`meta.trace`). The
`explain$` directive collects a richer explanation of the processing
into an array. Together with the structured log entries (`act/IN`,
`act/OUT`, `act/ERR`), these make it possible to follow a request across
actions, plugins and processes.

## Delegates

A delegate is created with `Object.create(instance)`, so it has every
method of the instance and shares its actions, plugins, options,
executor and events, but has its own `fixedargs`, `fixedmeta`,
`context`, identifier (`did`) and log context. Seneca uses delegates
for plugins (so that actions know their plugin) and for action
executions (so that `this` inside an action knows the current message).
Application code uses `seneca.delegate()` to carry request-scoped data,
and `seneca.gate()` and `seneca.fix()` return specialized delegates.

## Timeouts and the executor

Each unit of work carries a timeout (the `timeout` option or
`timeout$`). The executor checks in-flight work periodically and, when
the timeout passes, replies to the caller with an `action_timeout` error
and releases the unit. A late reply from the action is ignored. The
executor's check interval runs only while work is in flight, so an idle
instance keeps no timers alive except the history pruning timer, which
is unreferenced.

## History

The history records in-flight messages (`seneca.status().history.log`)
keyed by identifier until their timeout passes. It serves the message
cache, `seneca.reply()` for transports, and debugging. It is pruned on
an interval (`history.interval`) and can be disabled (`history.active`).

## Closing

`close()` waits for the queue to clear (bounded by `close_delay`), marks
the instance closed, runs the close action through the normal pipeline
(so plugin `destroy` stages and close hooks are ordinary prior
actions), and then removes listeners and timers. A fatal error does the
same through `seneca.die`, then exits the process.
