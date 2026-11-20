# Migrate from Seneca 3

How to move an application or plugin from Seneca 3.x to 4.x. The
[change log](../../CHANGES.md) lists every change by version; the
[Legacy reference](../reference/legacy.md) lists the compatibility
behaviours that remain.

## Requirements

Node.js 24 or later.

## Install a transport

Seneca 4 does not bundle seneca-transport. Add it where `listen` or
`client` is used:

```sh
npm install seneca-transport
```

```js
seneca.use('seneca-transport').listen(...)
```

## Builtin action patterns

The builtin actions use `sys:seneca`:

| Seneca 3 | Seneca 4 |
| -------- | -------- |
| `role:seneca,cmd:ping` | `sys:seneca,cmd:ping` |
| `role:seneca,cmd:stats` | `sys:seneca,cmd:stats` |
| `role:seneca,cmd:close` | `sys:seneca,cmd:close` |
| `role:seneca,info:fatal` | `sys:seneca,info:fatal` |
| `role:seneca,get:options` | `sys:seneca,get:options` |

Set `legacy: { builtin_actions: true }` to keep the `role:seneca`
variants while callers are updated. Plugins that add close hooks on
`role:seneca,cmd:close` keep working: Seneca 4 calls that pattern during
close when it exists. New close hooks should use `this.destroy(fn)` or a
prior on `sys:seneca,cmd:close`.

## Validation: Joi to Shape

Message and option validation uses [Shape](https://github.com/rjrodger/shape) (the successor of Gubu)
instead of Joi schemas. Replace Joi rules in patterns and plugin
`defaults`:

```js
// Seneca 3
seneca.add({ role: 'shop', cmd: 'price', item: Joi.string().required() }, action)

// Seneca 4
seneca.add({ role: 'shop', cmd: 'price', item: seneca.valid.Required(String) }, action)
```

Seneca 4 has no Joi support: Joi schemas in pattern rules or plugin
`defaults` are not recognized. Convert them to plain default objects or
Shape builders.

Shapes built with Gubu are not accepted either. A plugin whose
`defaults` were built with Gubu fails to load with
`plugin_gubu_shape`, and pattern rules built with Gubu fail with
`add_gubu_shape`. Build them with `seneca.valid` or `this.valid` (Shape),
or import the builders from the `shape` package. A `defaults` function
of `{ valid }` builds the shape with the builders Seneca passes in, so
the same plugin loads on Seneca 3.38 (Gubu) and Seneca 4 (Shape).

## Plugin versions

Plugins that built their options with Gubu have releases for Seneca 4:

| Plugin | Version for Seneca 4 | Earlier name |
| ------ | -------------------- | ------------ |
| Entities | `@seneca/entity` 29 | `seneca-entity` (up to 28) |
| In-memory store | `@seneca/mem-store` 10 | `seneca-mem-store` (up to 9) |
| Environment | `@seneca/env` 0.6 | |
| REPL | `@seneca/repl` 9.2 | |

Load the entity plugin and its store by their full names,
`seneca.use('@seneca/entity')` and `seneca.use('@seneca/mem-store')`.
Plugins that declare a peer dependency on `seneca-entity`, such as
seneca-transport 8.3, make npm install seneca-entity 28 and
seneca-mem-store 9 as well, and the short names `entity` and
`mem-store` find those first (see
[Manage plugins](manage-plugins.md#load-plugins)); they stop the
process on Seneca 4 with `plugin_gubu_shape`.

## Plugin definitions

* Definition functions take one argument, `options`, and use `this`.
  The Seneca 2 form `function (options, register)` is rejected
  (`unsupported_legacy_plugin`).
* In plugin description objects, name the definition function `define`
  (`init` still works).
* Plugin initialization: `this.init(fn)` still works; `this.prepare(asyncFn)`
  is the async form. Shutdown: `this.destroy(asyncFn)`.
* `seneca.export('util')` is mapped to `seneca.export('basic')`.

## Promises are built in

`seneca-promisify` is no longer needed. `seneca.message(pattern,
asyncFn)`, `seneca.post(msg)`, `await seneca.ready()`, `await
seneca.close()` and `await this.prior(msg)` are part of the core.

## Options

* Most `legacy.*` flags are gone; `legacy.meta` and
  `legacy.builtin_actions` remain, and `legacy: false` turns both off.
  The removed flags are still accepted, so Seneca 3 configurations load,
  but they are ignored and each one reports a deprecation.
* `deathdelay` is `death_delay`. `deathdelay` still works, as a deprecated
  alias.
* `debug.short_logs` (and `log.short`) no longer shorten identifiers. Seneca
  3 made all identifiers 2 characters long, so different messages could
  share an id, and a message with a repeated id is answered from the action
  history without running its action. The options are accepted and
  ignored, with a deprecation; the `flat` and `test` log formats print the
  first 6 characters of identifiers.
* `legacy.error` has no effect: errors always use the Seneca 4 format,
  where the caller receives the original error object and the error
  handler receives it with `meta$` attached.
* The meta data object is passed as the third argument of actions and
  callbacks; it is attached to messages as `msg.meta$` only with
  `legacy: { meta: true }`, which Seneca 3 transports need.

## Error text and logs

* Error messages no longer contain message or option values. A message
  is described by its pattern keys and the names of its other keys, for
  example `cmd:logn,sys:user (other keys: email, pass)`, and a
  validation failure by the property and the expected type. Code that
  matched on error text should check `err.code` and `err.details`.
* Values of secret-looking keys (names with words such as `password`,
  `secret`, `token`, `apikey` or `auth`) are redacted from log entries,
  the `log` event, error details, error replies to remote callers,
  printed options and fatal error reports. Add your own names with the
  `redact.keys` option.
* The transport type names `http` and `direct` still select the `web`
  transport, but are deprecated and log a warning: use `web`.

## Removed or renamed API

| Seneca 3 | Seneca 4 |
| -------- | -------- |
| `seneca.closed` | `seneca.flags.closed` (`closed` is a deprecated alias) |
| `seneca.next_act` | removed |
| `Seneca.loghandler` | removed; use the `logger` option |
| `seneca.findact`, `hasact`, `act_if`, `findpins`, `pinact`, `plugins`, `findplugin`, `hasplugin` | deprecated aliases; use `find`, `has`, `list`, `list_plugins`, `find_plugin`, `has_plugin` |
| `seneca.util.parsepattern` | removed |
| `seneca.util.Gubu` | `seneca.util.Shape` or `seneca.valid` (`Gubu` is a deprecated alias) |
| `act-err-4` event | `act-err`, which now has the same arguments (`act-err-4` is deprecated) |

## TypeScript

The declarations describe the API; before, instances were typed as
`any`.

* Import the factory with `import Seneca from 'seneca'` (ES modules, or
  CommonJS with `esModuleInterop`) or `import Seneca = require('seneca')`.
  The declarations use `export =`, matching the module's
  `module.exports`, so the default import also works from ES modules
  under `module: nodenext`.
* `Seneca()` returns `Seneca.Instance`, which is also `this` in actions
  and plugin definitions. Calls to methods that do not exist, or with
  arguments of the wrong type, no longer compile.
* Members that plugins add to instances (such as `seneca.make$` from
  seneca-entity) are not part of `Instance`. Declare them by augmenting
  it:

  ```ts
  declare module 'seneca' {
    interface Instance {
      make$(name: string): any
    }
  }
  ```

See [TypeScript](../reference/static-api-and-utilities.md#typescript).

## New in Seneca 4

* `seneca.direct(msg)` and `seneca.direct_prior(msg)` run an action
  synchronously.
* `seneca.prepare` and `seneca.destroy` for plugin lifecycle stages.
* The `sys:seneca,on:point` action.

`seneca.fix`, `seneca.translate`, `seneca.explain`, the `explain$`
directive, `seneca.valid` and `sys:seneca,get:options` arrived during
Seneca 3 and remain.

## Check your application

1. Update Node.js and dependencies; install seneca-transport if needed.
2. Run your tests and look for deprecation warnings. Each deprecated
   Seneca 3 name or behaviour in use is reported once per process as a
   Node.js `DeprecationWarning` with a `SENECA_DEP_*` code (run with
   `node --trace-deprecation` to see where it is used, or
   `--throw-deprecation` to fail on it) and as a `DEPRECATED` log entry.
   Also look for `UNKNOWN` entries with `--seneca.test`. See
   [Deprecation warnings](../reference/legacy.md#deprecation-warnings).
3. Grep for `role:seneca` patterns, `Joi`, `gubu`, `deathdelay`, `seneca.closed`
   and the removed API names.
4. Run your test suite with `debug.undead` off: plugin failures that
   were tolerated before are fatal in Seneca 4.
