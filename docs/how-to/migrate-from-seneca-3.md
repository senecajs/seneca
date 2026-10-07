# Migrate from Seneca 3

How to move an application or plugin from Seneca 3.x to 4.x. The
[change log](../../CHANGES.md) lists every change by version; the
[Legacy reference](../reference/legacy.md) lists the compatibility
behaviours that remain.

## Requirements

Node.js 22 or later (24 recommended).

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

## Validation: Joi to Gubu

Message and option validation uses Gubu shapes instead of Joi schemas.
Replace Joi rules in patterns and plugin `defaults`:

```js
// Seneca 3
seneca.add({ role: 'shop', cmd: 'price', item: Joi.string().required() }, action)

// Seneca 4
seneca.add({ role: 'shop', cmd: 'price', item: seneca.valid.Required(String) }, action)
```

Plugin `defaults` written as Joi schemas are deep merged without
validation; convert them to plain default objects or Gubu shapes.

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
* `deathdelay` is `death_delay`.
* `legacy.error` has no effect: errors always use the Seneca 4 format,
  where the caller receives the original error object and the error
  handler receives it with `meta$` attached.
* The meta data object is passed as the third argument of actions and
  callbacks; it is attached to messages as `msg.meta$` only with
  `legacy: { meta: true }`, which Seneca 3 transports need.

## Removed or renamed API

| Seneca 3 | Seneca 4 |
| -------- | -------- |
| `seneca.closed` | `seneca.flags.closed` |
| `seneca.next_act` | removed |
| `Seneca.loghandler` | removed; use the `logger` option |
| `seneca.findact`, `hasact`, `act_if`, `findpins`, `pinact`, `plugins`, `findplugin`, `hasplugin` | still available as aliases; prefer `find`, `has`, `list`, `list_plugins`, `find_plugin`, `has_plugin` |
| `seneca.util.parsepattern` | removed (undefined) |

## New in Seneca 4

* `seneca.direct(msg)` runs an action synchronously.
* `seneca.prepare` and `seneca.destroy` for plugin lifecycle stages.
* `seneca.fix`, `seneca.translate`, `seneca.explain` and the `explain$`
  directive.
* `seneca.valid` (Gubu) for validation shapes.
* `sys:seneca,get:options` and `sys:seneca,on:point` actions.

## Check your application

1. Update Node.js and dependencies; install seneca-transport if needed.
2. Run with `--seneca.test` and look for `DEPRECATED` and `UNKNOWN`
   entries.
3. Grep for `role:seneca` patterns, `Joi`, `deathdelay`, `seneca.closed`
   and the removed API names.
4. Run your test suite with `debug.undead` off: plugin failures that
   were tolerated before are fatal in Seneca 4.
