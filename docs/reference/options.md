# Options reference

Every option accepted by `Seneca(options)` and `seneca.options(options)`,
with its default value and effect. Options are validated against this
shape with [Gubu](https://github.com/rjrodger/gubu) when `valid.option`
is true (the default): unknown keys and wrong types are reported as an
`invalid_options` error at construction time.

For how the sources of option values are combined (defaults, options
file, environment, command line) see
[Command line and environment](command-line-and-environment.md) and the
how-to guide [Configure options](../how-to/configure-options.md).

Values shown as `Gubu shape` describe the accepted type rather than a
fixed default.

## Top level

| Option | Default | Effect |
| ------ | ------- | ------ |
| `tag` | `'-'` | Instance tag. Appended to the instance identifier (`seneca.id`) and `seneca.tag`; used to tell instances apart in logs. `'-'` means untagged. |
| `timeout` | `22222` | Default action timeout in milliseconds. An action that has not replied in time produces an `action_timeout` error. Overridden per message with `timeout$`. |
| `idlen` | `12` | Length of the random identifiers generated for the instance and for messages. |
| `didlen` | `4` | Length of delegate identifiers (`seneca.did`). |
| `id$` | none | Fixed instance identifier instead of the generated one. |
| `default_plugins` | `{}` | Reserved; not read by Seneca 4. |
| `test` | `false` | Start in test mode (see `seneca.test()`): human readable logs at level `warn`, callpoints recorded, caller locations attached to messages. A string value is used as the log specification. |
| `quiet` | `false` | Start in quiet mode (see `seneca.quiet()`): logging off. |
| `log` | `'info'` level, JSON logger | Logging specification: a level name, level abbreviation, numeric level, logger name, logger function or logspec object. See [Logging](logging.md). |
| `logger` | none | Custom logger: a function `(entry) => void` called with the instance as `this`, a logger plugin, or the name of a builtin logger (`'flat'`, `'json'`, `'test'`). See [Logging](logging.md). |
| `death_delay` | `11111` | Milliseconds a fatal error waits for `close()` to finish before the process is terminated anyway (exit code 2). |
| `deathdelay` | `11111` | Legacy spelling. Overwritten by `death_delay` at construction; set `death_delay` instead. |
| `close_delay` | `22222` | Milliseconds `close()` waits for in-flight actions before closing anyway. |
| `errhandler` | none | Global error handler `(err, meta) => boolean`. Also set by `seneca.error(fn)` and `seneca.test(fn)`. A truthy return value marks the error as handled and suppresses the action callback. See [Handle errors](../how-to/handle-errors.md). |
| `from` | none | Path of an options file (`.js` or `.json`) to load. `Seneca('path')` is shorthand for `Seneca({ from: 'path' })`. |
| `module` | none | Module object (with a `require` method) used to resolve `seneca.options.js` and plugin names; defaults to the module that required Seneca. |
| `plugin` | `{}` | Options for plugins, keyed by plugin name (`plugin.foo`) or by name and tag (`plugin['foo$tag']`). See [Plugins](plugins.md#option-resolution). |
| `plugins` | `{}` | Plugins to load at startup: an object (keys are names, values are plugin descriptions; `false` ignores the plugin) or an array of plugin descriptions, each passed to `seneca.use()`. |
| `events` | `{}` | Event listeners registered before startup, keyed by event name: `log`, `ready`, `close` (and the act events, see note). See [Events](events.md). |
| `reload$` | none | Legacy: when passed to `seneca.options()`, options are recomputed from all sources instead of merged. |

Note on `events`: the keys `act_in`, `act_out` and `act_err` register
listeners for events with those underscore names, but the action events
are emitted as `act-in`, `act-out` and `act-err`, so those three keys
have no effect. Use `seneca.on('act-in', fn)` instead.

## `error`

| Option | Default | Effect |
| ------ | ------- | ------ |
| `error.identify` | `(e) => e instanceof Error` | Function that decides whether a value thrown or replied by an action is an error. Values that are not identified are wrapped in a new `Error` with their inspected form as message. |
| `error.capture` | `{}` | Reserved; not read by Seneca 4. |

## `valid`

| Option | Default | Effect |
| ------ | ------- | ------ |
| `valid.active` | `true` | Master switch for all validation. |
| `valid.message` | `true` | Validate messages against the rules of the matched action (Gubu shapes in the pattern, or an action `validate` property). Failures produce `act_invalid_msg`. |
| `valid.option` | `true` | Validate the instance options against this reference shape. |
| `valid.plugin` | `true` | Validate plugin options against the plugin's `defaults`. Failures produce `invalid_plugin_option`. |

## `debug`

| Option | Default | Effect |
| ------ | ------- | ------ |
| `debug.fragile` | `false` | Reserved for throwing errors from `seneca.act`; not read by Seneca 4. |
| `debug.undead` | `false` | Fatal errors do not terminate the process. The error handler is still called. For tests only. |
| `debug.print.options` | `false` | Print the resolved options to standard output at startup, and each plugin's options when it loads. Also enabled by `--seneca.print.options`. |
| `debug.print.fatal` | `'summary'` | Amount of detail in the fatal error report: `'summary'` or `'full'` (adds the error details, process path, process versions and the module list). |
| `debug.print.env` | `false` | Include the environment in a full fatal report. Off by default so that secrets are not printed. |
| `debug.print.err` | `false` | The flat logger also prints errors to standard error. |
| `debug.print.depth` | `2` | Object inspection depth for printed options, replies and log data. |
| `debug.act_caller` | `false` | Record the calling code location of each `act` call in `msg.caller$` (always on in test mode). |
| `debug.short_logs` | `false` | Shorten identifiers to 2 characters (the instance id becomes `xx/tag`). |
| `debug.callpoint` | `false` | Record the calling code location when actions are added and called (`actdef.callpoint`, log entries). Enabled by test mode. |
| `debug.deprecation` | `true` | Log a warning when an action marked with `deprecate$` is called. |
| `debug.argv` | `null` | Array used instead of `process.argv` when parsing `--seneca.*` arguments (the first two entries are skipped). For tests. |
| `debug.env` | `null` | Object used instead of `process.env` when reading `SENECA_*` variables. For tests. |
| `debug.datalen` | `333` | Maximum length of message and result data in log lines and error messages. |

## `strict`

| Option | Default | Effect |
| ------ | ------- | ------ |
| `strict.result` | `true` | An action result must be an object or array (or an `Error`, an entity, or an object with `force$`). Other values produce `result_not_objarr`. |
| `strict.fixedargs` | `true` | A delegate's fixed arguments override message properties of the same name. When false, message properties win. |
| `strict.fixedmeta` | none | Read by `delegate()` as the same rule for fixed meta data, but not part of the validated option shape: passing it to `Seneca()` is rejected as an unknown key, so it can only take effect when `valid.option` is false. |
| `strict.add` | `false` | When true, adding a pattern only overrides (becomes the prior of) an existing action with exactly the same pattern. When false, the most specific existing match becomes the prior. Overridden per pattern with `strict$: { add }`. |
| `strict.find` | `true` | When false, a message with no matching action gets an empty object result instead of an `act_not_found` error. |
| `strict.maxloop` | `11` | Reserved; not read by Seneca 4 (see `limits.maxparents`). |
| `strict.exports` | `false` | When true, `seneca.export(key)` for an unknown key is a fatal `export_not_found` error instead of returning `undefined`. |

## `history`

| Option | Default | Effect |
| ------ | ------- | ------ |
| `history.active` | `true` | Keep a history of in-flight messages so that duplicate message identifiers return the cached result and `seneca.reply()` can find waiting messages. |
| `history.prune` | `true` | Remove expired entries periodically. |
| `history.interval` | `100` | Pruning interval in milliseconds. |

## `trace`

| Option | Default | Effect |
| ------ | ------- | ------ |
| `trace.unknown` | `true` | Log messages with no matching pattern at level `warn` (false: `debug`). |
| `trace.invalid` | `false` | Log messages that fail validation at level `warn`. |
| `trace.act`, `trace.stack` | `false` | Reserved; not read by Seneca 4. |

## `stats`

| Option | Default | Effect |
| ------ | ------- | ------ |
| `stats.size` | `1024` | Number of samples kept per pattern for action timing statistics. |
| `stats.interval` | `60000` | Statistics calculation interval in milliseconds. |
| `stats.running` | `false` | Calculate timing statistics on the interval, not only on request. The interval timer is not stopped by `close()`, so a process using it must exit explicitly. |

## `status`

| Option | Default | Effect |
| ------ | ------- | ------ |
| `status.interval` | `60000` | Interval of the periodic status log entry (`kind: 'status'`, level `info`) in milliseconds. |
| `status.running` | `false` | Emit the periodic status log entry. |

## `system`

| Option | Default | Effect |
| ------ | ------- | ------ |
| `system.exit` | `(code) => process.exit(code)` | Function used to terminate the process after a fatal error or a close signal. Replace in tests to observe exit codes. |
| `system.close_signals.SIGHUP` | `false` | Close the instance and exit when the signal arrives. |
| `system.close_signals.SIGTERM` | `false` | As above. |
| `system.close_signals.SIGINT` | `false` | As above. |
| `system.close_signals.SIGBREAK` | `false` | As above. |
| `system.plugin.load_once` | `false` | Ignore a `use()` of a plugin (name and tag) that is already loaded. |
| `system.action.add` | `true` | Register the builtin `sys:seneca` actions. |

## `internal`

Reserved for objects and functions; the key is omitted when options are
logged or printed.

| Option | Default | Effect |
| ------ | ------- | ------ |
| `internal.print.log` | `null` | Function used instead of `console.log` for all printed output (log lines, printed options, `Seneca.util.print`). |
| `internal.print.err` | `null` | Function used instead of `console.error`. |
| `internal.logger` | none | Logger function; takes precedence over `logger` and `log.logger`. |
| `internal.module` | none | Module object used to resolve plugin names. |
| `internal.actrouter` | none | Replacement action router (a Patrun instance). |
| `internal.translationrouter` | none | Replacement router for `seneca.translate`. |
| `internal.subrouter` | none | Replacement subscription routers: `{ inward, outward }`. |

## `transport`

Defaults shared by `seneca.listen()` and `seneca.client()`. Transport
plugins add their own keys (for example `transport.web`, `transport.tcp`).
`host`, `path` and `protocol` have no default in core: the transport
plugin in use supplies them (seneca-transport listens on `0.0.0.0`, path
`/act`, protocol `http`, and connects to `127.0.0.1` when no host is
given). Set them here to apply one value to every listen and client
configuration.

| Option | Default | Effect |
| ------ | ------- | ------ |
| `transport.port` | `10101` | Default port. |
| `transport.host` | none | Default host, when set. |
| `transport.path` | none | Default HTTP path, when set. Not used by the TCP transport. |
| `transport.protocol` | none | Default protocol, when set. |

See [Transport](transport.md) for how a listen or client configuration
is resolved from these values.

## `limits`

| Option | Default | Effect |
| ------ | ------- | ------ |
| `limits.maxparents` | `33` | Maximum depth of the parent message chain. Deeper chains (usually an action calling itself) fail with `maxparents`. |

## `legacy`

`legacy: false` sets every entry to false; `legacy: true` leaves the
defaults.

| Option | Default | Effect |
| ------ | ------- | ------ |
| `legacy.error` | `false` | Always forced to false at startup; Seneca 4 error handling cannot be switched to the 3.x behaviour. |
| `legacy.meta` | `false` | Attach the meta data object to messages as `msg.meta$` and pass it to transport clients, as 3.x transports expect. |
| `legacy.builtin_actions` | `false` | Also register the 3.x `role:seneca` variants of the builtin actions. See [Builtin actions](builtin-actions.md). |

## `order`

Controls the [Ordu](https://github.com/rjrodger/ordu) task pipelines that
implement `add`, inward and outward message processing, and plugin
loading. Setting `debug: true` prints each task execution.

| Option | Default |
| ------ | ------- |
| `order.add.debug` | `false` |
| `order.inward.debug` | `false` |
| `order.outward.debug` | `false` |
| `order.use.debug` | `false` |

## `prior`

| Option | Default | Effect |
| ------ | ------- | ------ |
| `prior.direct` | `false` | Reserved; not read by Seneca 4. |

## Reading options at runtime

* `seneca.options()` returns the resolved options object.
* `seneca.options({ ... })` merges new values (deeply) and returns the
  result; `seneca.options({ ... }, true)` returns the instance for
  chaining. Changing `log` rebuilds the logger; changing `tag` updates
  the instance identifier.
* The builtin action `sys:seneca,get:options` returns options to callers
  (see [Builtin actions](builtin-actions.md)).
* `seneca.export('options')` returns the same object as `seneca.options()`.
