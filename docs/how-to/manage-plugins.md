# Manage plugins

How to load, configure, combine and inspect plugins in an application.
The plugin definition itself is covered in
[Writing a plugin](../tutorials/writing-a-plugin.md) and the
[Plugin definition reference](../reference/plugins.md).

## Load plugins

```js
seneca.use(shop)                  // a function
seneca.use('seneca-entity')       // an npm module
seneca.use('entity')              // seneca-entity or @seneca/entity
seneca.use('./plugins/shop.js')   // a file
seneca.use({ name: 'shop', define: shop })
```

With options as the second argument: `seneca.use(shop, { currency: 'EUR' })`.

Plugins load in `use` order, one after another; `await seneca.ready()`
(or `seneca.ready(fn)`) marks the point where all of them are loaded.

## Load plugins from configuration

```js
Seneca({
  plugins: {
    entity: 'seneca-entity',
    shop: { name: 'shop', define: shop, options: { currency: 'EUR' } },
    debug: false,            // never load this plugin
  },
})
```

Each value is passed to `use`; `false` ignores the plugin even if code
calls `use` for it later. An array of plugin descriptions works too.

## Configure plugins

```js
Seneca({ plugin: { shop: { currency: 'EUR' } } })
```

See [Configure options](configure-options.md#configure-plugins).

## Load a plugin more than once

Use tags to load the same plugin with different options:

```js
seneca.use('store$primary', { url: primaryUrl })
seneca.use('store$replica', { url: replicaUrl })
seneca.use({ name: 'store', tag: 'archive', define: store }, { url: archiveUrl })
```

Each tagged plugin has its own options (`plugin['store$primary']`) and
exports (`seneca.export('store$primary/db')`). Its actions normally
include the tag in their patterns to stay distinguishable.

## Declare dependencies

Inside a plugin:

```js
function shop(options) {
  this.depends('shop', ['entity', 'tax'])
  ...
}
```

Loading fails (`plugin_required`) when a dependency has not been loaded
earlier.

## Share values between plugins

```js
// in the plugin
return { exports: { db } }

// elsewhere
const db = seneca.export('store/db')
```

Unknown export keys return `undefined`; set `strict: { exports: true }`
to make them fatal.

## Prevent a plugin from loading

```js
seneca.ignore_plugin('shop')
seneca.ignore_plugin('store', 'replica')
```

or `plugins: { shop: false }` in the options. A later `use` of the
plugin is logged and skipped.

## Avoid duplicate loads

```js
Seneca({ system: { plugin: { load_once: true } } })
```

A `use` of a plugin (name and tag) that is already loaded is ignored.

## Inspect loaded plugins

```js
seneca.list_plugins()           // { root$: {...}, shop: {...}, 'store$primary': {...} }
seneca.has_plugin('shop')
seneca.find_plugin('store', 'primary').options
```

## Order matters

A plugin that overrides another's patterns must load after it, so that
its actions become current and the earlier ones their priors. Put
infrastructure plugins (stores, transports) first and business plugins
after them; load test doubles last.
