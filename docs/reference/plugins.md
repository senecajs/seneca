# Plugin definition reference

A plugin is a function that adds actions (and optionally other
behaviour) to a Seneca instance. This page specifies what `seneca.use`
accepts, what a definition function may do and return, how plugin
options are resolved, and the plugin lifecycle. For a guided
introduction see the tutorial [Writing a plugin](../tutorials/writing-a-plugin.md).

## `seneca.use(plugin, [options])`

`plugin` is one of:

| Form | Example | Name and tag |
| ---- | ------- | ------------ |
| function | `seneca.use(function shop(options) { ... })` | The function name (`shop`). Anonymous functions are not allowed. |
| object | `seneca.use({ name: 'shop', tag: 'eu', define: fn, defaults: {...} })` | From the object. `init` is accepted as a legacy alias of `define`. |
| module name | `seneca.use('shop')` | Resolved with `require` in this order: `seneca-shop`, `@seneca/shop`, `shop`. The name is the plugin name. |
| relative path | `seneca.use('./shop.js')` | Resolved relative to the calling module. |
| tagged name | `seneca.use('shop$eu')` | Name `shop`, tag `eu`. |

Names must match `/^[a-zA-Z@][a-zA-Z0-9.~_\-/]*$/` (or be a file path) and
tags `/^[a-zA-Z0-9.~_-]+$/`; both are limited to 1024 characters. The
name `request` is mapped to `@seneca/request`.

`options` is the plugin options object; it may contain the directives
`init$`, `defined$`, `inited$` and `tag$` (see
[Message directives](message-directives.md#directives-in-plugin-options)).

`use` returns the instance and schedules the load; plugins load one at a
time in the order of the `use` calls, and `seneca.ready()` fires when
all of them have loaded. Loading errors are fatal.

## The definition function

```js
function shop(options) {
  // `this` is a delegate of the Seneca instance, specific to this plugin
  this.add('role:shop,cmd:get', function (msg, reply) { ... })
  this.message('role:shop,cmd:put', async function (msg) { ... })

  return {
    exports: { ... },
  }
}

shop.defaults = { currency: 'EUR', timeout: Number }
shop.errors = { no_item: 'Item <%=id%> not found.' }
```

The function receives the resolved options and may be `async` (the
load waits for the returned promise). Inside it, `this` is the *plugin
delegate*, which has the full instance API plus:

| Member | Purpose |
| ------ | ------- |
| `this.add`, `this.message` | Add actions; their definitions record the plugin name and tag. |
| `this.init(fn)` | Register an init function `function (done) { ... done(err) }` as the action `role:seneca,plugin:init,init:<name>[,tag:<tag>]`, run once after definition. |
| `this.prepare(asyncFn)` | Register an async init stage on the same init action. Several `prepare` calls form a prior chain: the last one registered runs first. |
| `this.destroy(asyncFn)` | Register an async close stage on `sys:seneca,cmd:close`. Stages run in reverse order of registration across all plugins. |
| `this.depends(name, deps)` | Fatal `plugin_required` error if any of `deps` (array or further string arguments) is not loaded yet (`seneca-` prefixed names match too). |
| `this.export(key)` | Read other plugins' exports. |
| `this.fail(code, details)`, `this.error(code, details)` | Create errors using the plugin's `errors` map (falling back to Seneca's codes). |
| `this.plugin` | The plugin record: `name`, `tag`, `fullname`, `options`, `meta`, `shared`, `prepare`, `destroy`, `loading`. |
| `this.shared` | An object shared by the definition function and all of the plugin's actions (`this.shared` inside actions). |
| `this.context` | `{ name, tag, full, plugin }`. |
| `this.log` | Logs with `plugin_name` and `plugin_tag` set. |
| `this.die` | Fatal error with plugin context. |

Definition functions with two parameters are rejected
(`unsupported_legacy_plugin`).

### Return value

The definition function may return nothing, a string (the plugin name),
or a meta data object:

| Property | Effect |
| -------- | ------ |
| `name` | Rename the plugin. |
| `tag` | Set the tag. |
| `exports` (or `exportmap`) | Object of values made available as `seneca.export('<name>/<key>')` and `seneca.export('<name>$<tag>/<key>')`. |
| `export` | Value returned by `seneca.export('<name>')` instead of the plugin record. |
| `extend.action_modifier` | Function `(actdef) => void` called for every action added afterwards on the instance. |
| `extend.logger` | Logger function added to the current logger (or replacing it when `logger.replace` is true). |
| `order.plugin` | Ordu task or array of tasks added to the plugin loading pipeline. |
| `service` | Legacy: a function kept as `plugin.service`. |

A returned function is treated as `{ service: fn }`.

### Static properties of the definition function

| Property | Purpose |
| -------- | ------- |
| `defaults` | Default options. An object of defaults and [Gubu](https://github.com/rjrodger/gubu) shapes (`{ currency: 'EUR', timeout: Number }`), a prepared Gubu shape, or a function `({ valid, Joi }) => shape`. The resolved options are validated against it (`invalid_plugin_option` is fatal) unless `valid.plugin` is false. A Joi schema (object with `$_root`) is deep merged without validation. |
| `errors` | Map of error code to message template for `this.fail` and `this.error`. Also accepted as `options.errors`. |
| `preload` | Function `(plugin) => meta` called with the root instance before the definition function, with the plugin record as argument. The returned meta may rename the plugin (`name`) and is merged like the definition's meta (so `preload` can provide `extend.logger`, which is how logger plugins work). |

## Option resolution

The options passed to the definition function are built from, in
increasing precedence:

1. `{ errors }` from the definition's `errors` property.
2. `options.plugin[<short name>]`, where the short name is the name
   without a `seneca-` prefix or the plugin name when the full name
   differs.
3. `options.plugin[<short name>$<tag>]`.
4. `options.plugin[<full name>]`.
5. `options.plugin[<full name>$<tag>]`.
6. The options object passed to `seneca.use(plugin, options)`.

The result is validated against `defaults` (defaults are applied) and
stored back as `options.plugin[<full name>]`, so `seneca.options()`
shows the resolved options of every loaded plugin. Directives (`init$`
and the others) are removed from the options passed to the definition
function.

## Lifecycle

For each `use` call, in order:

1. **load**: the plugin description is resolved (module, file or
   function). An ignored plugin (`seneca.ignore_plugin`, or `plugins: {
   name: false }`) stops here. With `system.plugin.load_once`, a plugin
   that is already loaded stops here.
2. **preload**: `defaults`, `errors` and `preload` are read; `preload`
   may rename the plugin.
3. **define**: a gated `role:seneca,plugin:define` message is
   submitted, so that no other plugin defines itself at the same time;
   options are resolved and validated; the definition function runs;
   its meta data is applied (`DEFINE` log entry); `options.defined$` is
   called.
4. **init**: unless `init$` is false, the init action
   `role:seneca,plugin:init,init:<name>[,tag:<tag>]` is called with
   `fatal$: true` (`INIT` log entry). It is defined by `this.init` and
   `this.prepare`; without them the default action replies at once.
   Errors are fatal (`plugin_init`); no reply within the timeout is
   `plugin_init_timeout`.
5. **complete**: `READY` log entry; `options.inited$` is called; the
   plugin options are printed when `debug.print.options` is set; the
   define message completes and the next plugin starts.

`seneca.ready(fn)` callbacks run when the action queue is empty, which
includes the completion of all plugins submitted so far.

## Inspecting plugins

| Method | Returns |
| ------ | ------- |
| `seneca.list_plugins()` | Map of full name to plugin record (including `root$` for top level actions). |
| `seneca.find_plugin(name, [tag])` | The plugin record, or undefined. |
| `seneca.has_plugin(name, [tag])` | Boolean. |
| `seneca.ignore_plugin(name, [tag], [ignore = true])` | Prevent (or allow again) loading of the plugin; returns the instance. |
| `seneca.export(key)` | A plugin export; `'name'`, `'name/key'`, `'name$tag'`, `'name$tag/key'`, and the builtin exports `options` and `transport/utils`. Unknown keys return undefined, or are fatal with `strict.exports`. |

Plugin records are also available as `seneca.plugin` inside the plugin's
actions, and action definitions carry `plugin_name`, `plugin_tag` and
`plugin_fullname` (see [Action definition](action-definition.md)).
