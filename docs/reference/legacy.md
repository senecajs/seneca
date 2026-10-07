# Legacy and compatibility reference

Seneca 4 keeps a number of Seneca 3 names and behaviours for
compatibility. They are listed here so that code using them can be
recognized and updated; new code should use the Seneca 4 equivalents.
See also [Migrate from Seneca 3](../how-to/migrate-from-seneca-3.md).

## Instance method aliases

| Legacy | Use instead | Notes |
| ------ | ----------- | ----- |
| `seneca.findact(pattern)` | `seneca.find(pattern)` | Same function. |
| `seneca.hasact(pattern)` | `seneca.has(pattern)` | `hasact` is true when any action would handle the pattern (partial match); `has` requires an exact pattern. |
| `seneca.act_if(condition, ...actArgs)` | `if (condition) seneca.act(...)` | Calls `act` only when the boolean is true; returns the instance. |
| `seneca.findpins(...patterns)`, `seneca.pinact(...)` | `seneca.list(pattern)` | Lists the patterns matching the given patterns or pattern strings. |
| `seneca.plugins()` | `seneca.list_plugins()` | |
| `seneca.findplugin(name, tag)` | `seneca.find_plugin(name, tag)` | |
| `seneca.hasplugin(name, tag)` | `seneca.has_plugin(name, tag)` | |
| `seneca.next_act` | none | Removed; the property is undefined. |
| `seneca.closed` | `seneca.flags.closed` | Set to true by `close()`. |
| `seneca.export('util')` | `seneca.export('basic')` | `util` is mapped to `basic`. |

## Static properties

| Legacy | Notes |
| ------ | ----- |
| `Seneca.loghandler` | Removed; undefined. Use the `logger` option. |
| `Seneca.util.flatten(list, prop)` | Flattens a linked list of objects by property. |
| `Seneca.util.deepextend` | Alias of `Seneca.util.deep`. |

## Options

| Option | Notes |
| ------ | ----- |
| `legacy.builtin_actions: true` | Register `role:seneca,cmd:ping`, `role:seneca,cmd:stats`, `role:seneca,cmd:close`, `role:seneca,info:fatal` and `role:seneca,get:options` alongside the `sys:seneca` actions. A direct call of `role:seneca,cmd:close` emits the `close` event as in Seneca 3. |
| `legacy.meta: true` | Attach meta data to messages as `msg.meta$` and pass it to transport client `send` functions, as Seneca 3 transports expect. |
| `legacy.error` | Forced to false; the Seneca 3 error format is not available. |
| `legacy: false` | Sets all legacy flags to false. |
| `deathdelay` | Replaced by `death_delay`. |
| `reload$: true` | With `seneca.options({ reload$: true, ... })`, options are recomputed from all sources. |

## Plugin definitions

* The plugin definition function may be given as the `init` property of
  a plugin object; `define` is the Seneca 4 name.
* Definition functions with two parameters `(options, register)` are
  rejected with `unsupported_legacy_plugin`. Seneca 4 definition
  functions take `(options)` and use `this`.
* A definition function may return a function; it is stored as the
  plugin's `service` (Seneca 2 web service pattern).
* The plugin init pattern `init:<name>` of Seneca 3 is still used:
  `this.init(fn)` defines it.

## Close hooks

`seneca.close()` runs `sys:seneca,cmd:close`. If any action was added
for the Seneca 3 pattern `role:seneca,cmd:close` (as seneca-transport 8
does), that pattern is called as well, so Seneca 3 era close hooks still
run.

## Transport

`seneca.listen()` and `seneca.client()` default to `type: 'web'`, and
`options.transport` can hold per-type sections (`transport.web`,
`transport.tcp`) as in Seneca 3. The `transport/utils` export can be
replaced by a transport plugin (seneca-transport 8 provides its own).

## Results

`strict.result` does not apply to replies of the patterns
`cmd:generate_id`, `note:true`, `cmd:native` and `cmd:quickcode`, which
Seneca 3 plugins reply to with scalars. Errors whose original code starts
with `perm/` are passed through unchanged (seneca-perm).

## Entities

When the entity plugin is loaded (`seneca.make$` exists), results and
inbound transport messages carrying `entity$` are converted into entity
objects.
