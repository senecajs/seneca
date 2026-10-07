# Plugins and composition

Plugins are how Seneca applications are assembled. This page explains
the model; the specification is in the
[Plugin definition reference](../reference/plugins.md).

## A plugin is a function that adds actions

```js
function shop(options) {
  this.add('role:shop,cmd:price', function (msg, reply) {
    reply({ price: options.base * msg.quantity })
  })
}

seneca.use(shop, { base: 2 })
```

Nothing more is required. The function's name is the plugin's name, the
options are resolved from several sources and validated, and `this` is
a delegate that tags every action with the plugin, so that logs,
statistics and errors can be attributed.

## Load order is part of the design

Plugins load one at a time, in the order of the `use` calls, even though
loading is asynchronous. Seneca enforces this with a *gated* message:
each plugin is defined inside a `role:seneca,plugin:define` message that
blocks later work until the plugin, including its initialization, has
completed. Consequences:

* A plugin can rely on plugins loaded before it (`this.depends`).
* A plugin that adds an action for a pattern an earlier plugin added
  becomes the current handler; the earlier one becomes its prior. Load
  order therefore determines who gets the first say, and
  `seneca.ready()` is the point after which all patterns are in place.
* Startup is deterministic, which makes failures reproducible.

## Initialization and shutdown

Plugins often need to connect to something before they can serve
messages. `this.init(fn)` (callback style) or `this.prepare(asyncFn)`
register initialization work that runs after the definition function
and before the next plugin loads; failures are fatal, because a service
whose plugins did not initialize is not a working service.
`this.destroy(asyncFn)` registers the reverse: shutdown stages that run
when the instance closes, in reverse order of registration.

Initialization is implemented as an ordinary action
(`role:seneca,plugin:init,init:<name>`) called with `fatal$`, which is
why `prepare` stages form a prior chain and why a plugin's init can call
other actions.

## Options and tags

Plugin options come from the plugin's `defaults`, the instance options
(`plugin.<name>`), and the `use` call, with later sources winning.
Defaults double as a validation shape, so misconfiguration fails at
startup with a clear message.

A plugin can be loaded more than once with different *tags*:
`seneca.use('store$primary', {...})` and `seneca.use('store$replica',
{...})`. Each tagged load is a separate plugin instance with its own
options and exports (`seneca.export('store$replica/db')`), while its
actions are usually distinguished by including the tag in their
patterns.

## Exports and shared state

A plugin may return `exports`, values made available to other plugins
and to the application through `seneca.export('name/key')`. This is the
sanctioned way to share objects (connections, helpers) that are not
messages. Within a plugin, `this.shared` is an object shared by the
definition function and all of its actions, and `this.plugin` is the
plugin record.

## Composition by priors

Because adding a pattern does not replace an existing action, plugins
compose: a caching plugin adds the same patterns as a store plugin and
calls `this.prior` on a miss; an audit plugin wraps patterns with
`seneca.wrap` and records every call; a test adds a pattern to stub a
dependency. None of these need to know how the original action is
implemented. The chain of priors is visible in the action definition
(`priorpath`), so the composition can be inspected.

## Delegates inside plugins

Every action runs with an action delegate as `this`. Inside a plugin's
actions, `this.plugin`, `this.shared`, `this.context` and `this.log`
refer to the plugin, and messages sent with `this.act` are recorded as
children of the current message. A plugin that handles web requests
might create further delegates per request (`this.delegate({ user })`)
so that every message in the request carries the user.

## Plugins and processes

Plugins do not know whether they run alone or with others, in one
process or several. The transport layer (`listen` and `client` with
pins) decides which patterns are served locally and which are sent to
other processes, so the same set of plugins can be deployed as a
monolith for development and as separate services in production. See
[Transport independence](transport-independence.md).
