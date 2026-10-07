# Builtin actions reference

Every instance registers these actions at startup (option
`system.action.add`). The `sys:seneca` patterns are the Seneca 4
patterns; the `role:seneca` variants are added when
`legacy.builtin_actions` is true.

| Pattern | Legacy alias | Message properties | Reply |
| ------- | ------------ | ------------------ | ----- |
| `sys:seneca,cmd:ping` | `role:seneca,cmd:ping` | none | The result of `seneca.ping()`: `now`, `uptime`, `id`, `cpu`, `mem`, `act` (call counts) and `tr` (transport registrations). |
| `sys:seneca,cmd:stats` | `role:seneca,cmd:stats` | `summary` (default true), `pattern` | Action statistics. With `summary: false`, the per-pattern map `actmap` including timing statistics; with `pattern`, the statistics of that pattern only (`calls`, `done`, `fails`, `time`). The same function is available as `seneca.stats(msg)`. |
| `sys:seneca,cmd:close` | `role:seneca,cmd:close` | `closing$: true` | Emits the `close` event, then calls the legacy close pattern if any plugin registered one, then replies. Plugins extend it with priors (`seneca.destroy` does this). Called by `seneca.close()`. |
| `sys:seneca,info:fatal` | `role:seneca,info:fatal` | `err` | Notification sent by `seneca.die` before closing; replies with nothing. Subscribe with `seneca.sub('sys:seneca,info:fatal', fn)` to observe fatal errors. |
| `sys:seneca,get:options` | `role:seneca,get:options` | `base`, `key` | A copy of the options: all of them, the section named by `base`, or the value `key` within that section. Scalar values fail with `result_not_objarr` under `strict.result`; ask for the containing section instead. |
| `sys:seneca,on:point,point:start` | none | none | Marker message submitted at startup so that the first `ready` fires. |

## Transport actions

| Pattern | Message properties | Purpose |
| ------- | ------------------ | ------- |
| `role:transport,cmd:listen` | `config` | Called by `seneca.listen()`. Dispatches to `role:transport,hook:listen,type:<type>`, which a transport plugin provides. |
| `role:transport,cmd:client` | `config` | Called by `seneca.client()`. Dispatches to `role:transport,hook:client,type:<type>`, which must reply with a client object that has a `send(msg, reply, meta)` method. |

See [Transport](transport.md).

## Plugin lifecycle actions

| Pattern | Purpose |
| ------- | ------- |
| `role:seneca,plugin:define,name:<name>[,tag:<tag>],seq:<n>` | Gated message under which a plugin is defined; it completes when the plugin has loaded, which is what makes plugins load one at a time. |
| `role:seneca,plugin:init,init:<name>[,tag:<tag>]` | The plugin's initialization action, defined by `this.init(fn)` or `this.prepare(fn)` inside the plugin and called once after definition (unless the plugin option `init$` is false). Errors are fatal (`plugin_init`); a missing reply is reported as a fatal `action_timeout` (see [Error codes](error-codes.md)). |

See [Plugins](plugins.md).
