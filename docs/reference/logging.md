# Logging reference

Seneca writes structured log entries. Each entry is a plain object; a
*logger* function turns entries into output. This page lists the log
levels, the ways to specify them, the builtin loggers, the methods that
create entries, and the fields entries carry.

## Levels

| Value | Name | Used for |
| ----- | ---- | -------- |
| 100 | `all` | Lowest level; selecting it logs everything. |
| 200 | `debug` | Action in/out, pattern added, plugin lifecycle, options changes. Default level of entries that do not specify one. |
| 300 | `info` | Startup notice (`hello`), listen and client registration, periodic status. Default output level. |
| 400 | `warn` | Unknown messages (`trace.unknown`), deprecated actions, invalid messages (`trace.invalid`). |
| 500 | `error` | Action errors, callback errors. |
| 600 | `fatal` | Fatal errors (see `seneca.die`). |
| 999 | `none` | Logging off. |

An entry is passed to the logger when its level is greater than or equal
to the current level (`options.log.live_level`). Levels are integers in
the range 100 to 999; values outside the table are allowed and kept as
numbers.

## Level abbreviations

| Abbreviation | Level |
| ------------ | ----- |
| `quiet`, `silent` | `none` |
| `any`, `all` | `all` |
| `print` | `debug` |
| `standard` | `info` |
| `test` | `warn` |

## The `log` option

The `log` option (and `--seneca.log`, `SENECA_OPTIONS='log:...'`) accepts:

| Form | Example | Meaning |
| ---- | ------- | ------- |
| level name | `log: 'warn'` | Set the level. |
| abbreviation | `log: 'silent'` | Set the level by abbreviation. |
| numeric level | `log: 300` or `log: '301'` | Set the level by value. |
| logger name | `log: 'flat'`, `log: 'json'` | Use a builtin logger; the level stays at its default (`info`). (`'test'` is a level abbreviation for `warn`, not a logger name; the test logger is selected with `logger: 'test'` or `seneca.test()`.) |
| function | `log: (entry) => ...` | Use a custom logger function. |
| object | `log: { level: 'warn', logger: fn }` | Full specification (see below). |

Any other string is a `bad_logspec_string` error; any other type is a
`bad_logspec` error.

The resolved specification is available as `seneca.options().log`:

```js
{
  level: 'info',          // current level name (or numeric string)
  live_level: 300,        // current level value
  default_level: 'debug', // level of entries without a level
  level_text: { 100: 'all', 200: 'debug', ... },
  text_level: { all: 100, debug: 200, ... },
  logger: [Function],
}
```

Passing `log` to `seneca.options({ log: 'debug' })` rebuilds the logger
and level at runtime.

## Loggers

A logger is a function `function (entry) {}` called with the Seneca
instance (or delegate) that produced the entry as `this`. Output should
go through `this.private$.print.log` so that the `internal.print.log`
option is honoured, as the builtin loggers do.

| Logger | Selected by | Output |
| ------ | ----------- | ------ |
| `json` (default) | default, `log: 'json'`, `logger: 'json'` | One JSON document per entry (circular references are made safe). Intended for log collection services. |
| `flat` | `log: 'flat'`, `logger: 'flat'` | One tab separated line per entry: ISO time, first 5 characters of the instance id, level (5 characters), kind, case, plugin, pattern, action, id path, data (truncated to `debug.datalen`), callpoint. |
| `test` | `seneca.test()`, `logger: 'test'` (not `log: 'test'`, which sets the level to `warn`) | Compact lines for reading test output: elapsed milliseconds, 2 characters of the instance id, tag, level, `kind/case`, then entry specific fields (action ids, patterns, results, stack traces for `ERR` entries). |

Custom loggers are given with the `logger` option (a function, a builtin
name, or a logger plugin), with `internal.logger`, or as `log.logger`.
A logger plugin is a plugin definition with a `preload` function that
returns `{ extend: { logger: fn } }`; plugins loaded with `use()` can
also provide `extend.logger` in their returned meta data, and are added
to the existing logger unless `logger.replace` is true. A two argument
function `(seneca, entry)` is accepted for compatibility.

`seneca.test()` switches to the `test` logger unless a logger was given
in the options.

## Creating entries

Every instance and delegate has `seneca.log`:

| Call | Entry |
| ---- | ----- |
| `seneca.log(entry)` | `entry` is an object; level defaults to `debug`. |
| `seneca.log('text', more...)` | `{ data: ['text', more...] }` at level `debug`. |
| `seneca.log.debug(entry)`, `seneca.log.info(...)`, `seneca.log.warn(...)`, `seneca.log.error(...)`, `seneca.log.fatal(...)`, `seneca.log.all(...)`, `seneca.log.none(...)` | As above, at the named level; non-object arguments become `{ data: [...] }`. |

`log` returns the instance. The `log` event is emitted for every entry,
whatever the level (see [Events](events.md)).

Inside an action, `this.log` is the action's delegate, so the entry is
annotated with the action and message identifiers.

## Entry fields

Fields added to every entry:

| Field | Meaning |
| ----- | ------- |
| `level` | Numeric level. |
| `level_name` | Level name. |
| `isot` | ISO 8601 time. |
| `when` | Time in milliseconds since the epoch. |
| `seneca_id` | Instance identifier. |
| `seneca_did` | Delegate identifier, when logged by a delegate. |
| `plugin_name`, `plugin_tag` | Plugin that logged the entry, when logged from a plugin. |

Fields added when logged inside an action: `kind: 'act'`, `actid`
(message id), `pattern`, `action` (action id), `idpath` (shortened
transaction and parent message ids).

Conventional fields used by Seneca's own entries:

| Field | Meaning |
| ----- | ------- |
| `kind` | Category: `act`, `add`, `plugin`, `ready`, `options`, `notice`, `listen`, `client`, `close`, `fatal`, `status`, `panic`. |
| `case` | Sub category, for example `IN`, `OUT`, `ERR`, `DEFAULT`, `UNKNOWN`, `INVALID`, `CACHE`, `DEPRECATED` for `act`; `ADD`, `SUB` for `add`; `DEFINE`, `INIT`, `READY`, `ignore` for `plugin`; `SET` for `options`; `INIT` for `listen` and `client`. |
| `msg`, `res`, `err`, `meta`, `actdef` | The message, result, error, meta data and action definition of an `act` entry. |
| `duration` | Milliseconds taken by the action (`OUT` and `ERR`). |
| `notice`, `code` | Message and code of an error or notice. |
| `callpoint` | Calling code location (when `debug.callpoint` is on). |
| `data` | Free form data (`seneca.log('...')`). |

Entries may also carry `depth$` (inspection depth for the flat logger)
and `maxlen$` (line length limit for the flat logger).

## Where output goes

Builtin loggers print with `console.log`, or with the function given as
`internal.print.log`. Fatal error reports and the flat logger's optional
error output (`debug.print.err`) use `console.error`, or
`internal.print.err`.

## Related options

`log`, `logger`, `test`, `quiet`, `debug.datalen`, `debug.print.depth`,
`debug.print.err`, `debug.short_logs`, `status.*`, `trace.unknown`,
`trace.invalid`, `internal.print.*`, `internal.logger`. See
[Options](options.md).
