# Legacy and compatibility reference

Seneca 4 keeps a number of Seneca 3 names and behaviours for
compatibility. They are listed here so that code using them can be
recognized and updated; new code should use the Seneca 4 equivalents.
Most are deprecated: they report a deprecation warning when used (see
[Deprecation warnings](#deprecation-warnings)) and are removed in
Seneca 5. See also [Migrate from Seneca 3](../how-to/migrate-from-seneca-3.md).

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
| `seneca.next_act` | none | Removed. |
| `seneca.closed` | `seneca.flags.closed` | Set to true by `close()`. |
| `seneca.export('util')` | `seneca.export('basic')` | `util` is mapped to `basic`. |

## Static properties

| Legacy | Notes |
| ------ | ----- |
| `Seneca.loghandler` | Removed. Use the `logger` option. |
| `Seneca.util.flatten(list, prop)` | Flattens a linked list of objects by property. |
| `Seneca.util.deepextend` | Alias of `Seneca.util.deep`. |
| `Seneca.util.Gubu` | Alias of `Seneca.util.Shape` (Shape is the renamed successor of Gubu). |

## Options

| Option | Notes |
| ------ | ----- |
| `legacy.builtin_actions: true` | Register `role:seneca,cmd:ping`, `role:seneca,cmd:stats`, `role:seneca,cmd:close`, `role:seneca,info:fatal` and `role:seneca,get:options` alongside the `sys:seneca` actions. A direct call of `role:seneca,cmd:close` emits the `close` event as in Seneca 3. |
| `legacy.meta: true` | Attach meta data to messages as `msg.meta$` and pass it to transport client `send` functions, as Seneca 3 transports expect. |
| `legacy.error` | Forced to false; the Seneca 3 error format is not available. |
| `legacy.actdef`, `action_signature`, `error_codes`, `fail`, `logging`, `meta_arg_remove`, `options`, `rules`, `timeout_string`, `top_plugins`, `transport` | Seneca 3 flags, removed. Accepted and ignored so that Seneca 3 configurations load. |
| `legacy: false` | Sets all legacy flags to false. |
| `deathdelay` | Replaced by `death_delay`; used as `death_delay` when that is not set. |
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

## Actions and events

* Action definitions carry the compiled message shape as `shape`; `gubu`
  is an alias.
* The `act-err-4` event is emitted alongside `act-err` with the same
  arguments. It previewed the Seneca 4 layout in Seneca 3.32.

## Deprecation warnings

Each deprecated name or behaviour reports a deprecation the first time it
is used in a process, on two channels:

* a Node.js `DeprecationWarning` with a `SENECA_DEP_*` code, so that
  `node --trace-deprecation` shows where it is used,
  `--throw-deprecation` makes it an error, and `--no-deprecation` hides
  it;
* a warn-level Seneca log entry `{ kind: 'notice', case: 'DEPRECATED',
  code, notice }`.

The option `debug: { deprecation: false }` turns both off.

| Code | Reported when | Use instead |
| ---- | ------------- | ----------- |
| `SENECA_DEP_FINDACT` | `seneca.findact` is called | `seneca.find` |
| `SENECA_DEP_HASACT` | `seneca.hasact` is called | `seneca.find(pattern, { exact: false })`, or `seneca.has(pattern)` for an exact pattern |
| `SENECA_DEP_ACT_IF` | `seneca.act_if` is called | `seneca.act` inside an `if` |
| `SENECA_DEP_FINDPINS`, `SENECA_DEP_PINACT` | `seneca.findpins` or `seneca.pinact` is called | `seneca.list` |
| `SENECA_DEP_PLUGINS` | `seneca.plugins()` is called | `seneca.list_plugins()` |
| `SENECA_DEP_FINDPLUGIN` | `seneca.findplugin` is called | `seneca.find_plugin` |
| `SENECA_DEP_HASPLUGIN` | `seneca.hasplugin` is called | `seneca.has_plugin` |
| `SENECA_DEP_CLOSED` | `seneca.closed` is read | `seneca.flags.closed` |
| `SENECA_DEP_EXPORT_UTIL` | `seneca.export('util')` | `seneca.export('basic')` |
| `SENECA_DEP_UTIL_DEEPEXTEND` | `seneca.util.deepextend` is called | `seneca.util.deep` |
| `SENECA_DEP_UTIL_FLATTEN` | `seneca.util.flatten` is called | none |
| `SENECA_DEP_UTIL_GUBU` | `seneca.util.Gubu` is read | `seneca.util.Shape` or `seneca.valid` |
| `SENECA_DEP_ACTDEF_GUBU` | the `gubu` property of an action definition is read | `shape` |
| `SENECA_DEP_ACT_ERR_4` | a listener is added for `act-err-4` | `act-err` |
| `SENECA_DEP_DEATHDELAY` | the `deathdelay` option is set | `death_delay` |
| `SENECA_DEP_LEGACY_ERROR` | the `legacy.error` option is set | nothing; it has no effect |
| `SENECA_DEP_LEGACY_FLAG` | a removed Seneca 3 `legacy.*` flag is set (once per flag) | nothing; it has no effect |
| `SENECA_DEP_ROLE_SENECA` | a `role:seneca` builtin action is called (`legacy.builtin_actions`; once per pattern) | the `sys:seneca` action |
| `SENECA_DEP_LEGACY_CLOSE_HOOK` | `close()` calls a plugin's close hook on `role:seneca,cmd:close` (once per plugin) | `this.destroy(fn)` or a prior on `sys:seneca,cmd:close` |
| `SENECA_DEP_PLUGIN_INIT` | a plugin definition object names its function `init` (once per plugin) | `define` |
| `SENECA_DEP_PROMISIFY` | the `promisify` plugin (seneca-promisify) is loaded | nothing; promises are built in |

Actions can also be marked deprecated with the `deprecate$` pattern
directive; calling one logs a `DEPRECATED` entry with its notice.
