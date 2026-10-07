# Message directives and meta data

Properties whose name ends in `$` are *directives*: they control how
Seneca processes a message or defines an action, and they never take
part in pattern matching. `seneca.util.clean(obj)` returns a copy of an
object without them.

## Directives on messages

Set on the message passed to `act`, `post`, `direct` or `prior`
(as object properties, or inside the Jsonic string: `'a:1,timeout$:500'`).

| Directive | Type | Effect |
| --------- | ---- | ------ |
| `gate$` | boolean | Later messages submitted to the instance wait until this one completes. `seneca.gate()` returns a delegate that sets it on every message. |
| `fatal$` | boolean | An error from the action is fatal: `seneca.die` is called (the process exits unless `debug.undead`). Plugin definition and initialization messages use it. |
| `local$` | boolean | The message must be handled locally. A transport client action passes it on to its prior (the local action, if any) instead of sending it. |
| `direct$` | boolean | Execute the action synchronously on the calling stack, as `seneca.direct()` does. |
| `timeout$` | number | Timeout in milliseconds for this message, overriding the `timeout` option. |
| `default$` | object or array | Result to use when no action matches the message (instead of an `act_not_found` error). Any other type is an `act_default_bad` error. Also the value returned by `seneca.prior()` when there is no prior action. |
| `custom$` | object | Custom meta data, available as `meta.custom` in the action and in every child action, and merged back from replies. The same object reference is shared across the call tree. |
| `id$` | string `'mi'` or `'mi/tx'` | Message identifier (and transaction identifier). A repeated identifier within the history window returns the recorded result instead of running the action again. `actid$` is an alias. |
| `tx$` | string | Transaction identifier shared by all messages in a call tree (`meta.tx`). Delegates created for actions carry it in `fixedargs.tx$`. |
| `sync$` | boolean | Whether a reply is expected (`meta.sync`). Defaults to true when a callback is given. |
| `explain$` | array | Collect an explanation of the message's processing into the array. See [Debug and inspect](../how-to/debug-and-inspect.md). |
| `closing$` | boolean | Allow the message while the instance is closing (used by the close action). |
| `meta$` | object | Meta data of an inbound message from a transport (`meta$.id`, `.sync`, `.custom`, `.explain`, `.parents`, `.dflt`, `.closing`). Removed before the action runs. |
| `parents$`, `caller$`, `prior$`, `plugin$`, `remote$` | internal | Set by Seneca and transports; removed from the message before the action runs. `caller$` holds the calling code location when `debug.act_caller` or test mode is on. |

Jsonic strings parse `true`/`false` and numbers, so `'a:1,gate$:true'`
works as a directive.

## Directives on action patterns

Set in the pattern passed to `seneca.add` (or `seneca.message`), either
as pattern properties or in the optional action definition object.

| Directive | Type | Effect |
| --------- | ---- | ------ |
| `fixed$` | object or Jsonic string | Properties merged into every message handled by the action (`actdef.fixed`). |
| `custom$` | object or Jsonic string | Values merged into `meta.custom` of every message handled by the action (`actdef.custom`). |
| `strict$` | `{ add: boolean }` | Override `strict.add` for this pattern: `true` only makes an exactly matching existing action the prior; `false` makes the most specific existing match the prior. |
| `sub$` | boolean | Mark the action as a subscription: `IN` log entries are not written for it. |
| `client$` | boolean | Mark the action as a transport client (set by `seneca.client`). |
| `deprecate$` | string | Log a `DEPRECATED` warning with this text whenever the action is called (when `debug.deprecation` is on). |
| `translate$` | `false` | Do not apply `seneca.translate` rules to this pattern. |

Properties of a pattern whose values are objects or functions are not
matched; they are message validation rules (see
[Patterns](patterns.md#validation-rules)).

## Directives in subscriptions

In the pattern given to `seneca.sub`: `in$: true` (default) subscribes to
messages as they arrive, `out$: true` subscribes to results as they
leave, `translate$: false` skips translation. Subscribed functions
receive the message with `in$` or `out$` set to true.

## Directives in plugin options

In the options object passed to `seneca.use(plugin, options)`:

| Directive | Effect |
| --------- | ------ |
| `init$: false` | Do not run the plugin's init action. |
| `defined$: (plugin) => void` | Called when the definition function has run. |
| `inited$: (plugin) => void` | Called when initialization has completed. |
| `tag$` | Tag for the plugin instance when none is given otherwise. |

## Directives in error details

`seneca.fail(code, { ..., throw$: false })` returns the error instead of
throwing it.

## Markers on results

`strict.result` requires action results to be objects or arrays. An
object carrying `entity$`, `meta$` or `force$` is accepted as well;
`entity$` results are converted with `seneca.make$` when the entity
plugin is loaded.

## The meta data object

Every message has a meta data object, available as the third argument of
action functions (`(msg, reply, meta)`), the second argument of message
functions (`async (msg, meta)`), the third argument of `act` callbacks
(`(err, result, meta)`), and as `err.meta$` on action errors.

| Field | Meaning |
| ----- | ------- |
| `id` | Message identifier `mi/tx`. |
| `mi` | Message id part. |
| `tx` | Transaction id part. |
| `pattern` | Canonical pattern of the matched action. |
| `action` | Identifier of the matched action (`plugin/name/N`). |
| `plugin` | `{ name, tag, fullname }` of the plugin that defined the action. |
| `instance` | Identifier of the Seneca instance handling the message. |
| `tag` | Tag of that instance. |
| `seneca` | Seneca version. |
| `version` | Meta data format version (`'0.1.0'`). |
| `start`, `end` | Start and end times in milliseconds. |
| `timeout` | Effective timeout. |
| `sync` | Whether a reply is expected. |
| `gate`, `fatal`, `local`, `direct`, `closing` | Directive flags. |
| `remote` | True for a message that arrived over a transport. |
| `dflt` | The `default$` value, if any. |
| `custom` | Custom meta data (see `custom$`). |
| `prior` | Identifier of the prior action being called, when the message is a prior call. |
| `parents` | Trace descriptors of the parent messages, nearest first. Each descriptor is an array: `[pattern, id, instance, tag, version, start, end, sync, action]`. |
| `trace` | Trace descriptors of child messages, filled in as they reply: `{ desc, trace }`. |
| `caller` | Calling code location (test mode or `debug.act_caller`). |
| `client_pattern` | For transport client actions, the pattern the client was registered with. |
| `explain` | The explanation array when `explain$` was given. |
| `error` | True when the result is an error. |
| `err`, `err_trace` | The Seneca error description (`act_execute` and the chain of actions it passed through). |
| `empty` | True when a reply had no data (transports). |
| `sub`, `data` | Reserved. |
