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
or import the builders from the `shape` package.

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
* `legacy.error` has no effect: errors always use the Seneca 4 format,
  where the caller receives the original error object and the error
  handler receives it with `meta$` attached.
* The meta data object is passed as the third argument of actions and
  callbacks; it is attached to messages as `msg.meta$` only with
  `legacy: { meta: true }`, which Seneca 3 transports need.

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
