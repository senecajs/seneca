# Feature index

Every feature of Seneca 4, A to Z, with the reference page that
specifies it and, where one exists, the guide that shows how to use it.
Options are listed under their top level key in the
[Options reference](options.md) and are not repeated individually here.

| Feature | Reference | Guides |
| ------- | --------- | ------ |
| `act` (submit a message) | [API: act](api.md#act) | [Getting started](../tutorials/getting-started.md) |
| `act-in`, `act-out`, `act-err`, `act-err-4` events | [Events](events.md) | [Debug and inspect](../how-to/debug-and-inspect.md) |
| Action definition (`find` result, `priorpath`, `rules`) | [Action definition](action-definition.md) | [Debug and inspect](../how-to/debug-and-inspect.md) |
| Action modifiers (`extend.action_modifier`) | [Plugins: return value](plugins.md#return-value) | |
| `add` (define an action) | [API: add](api.md#add) | [Getting started](../tutorials/getting-started.md) |
| `argv` property, `--seneca.*` arguments | [Command line and environment](command-line-and-environment.md) | [Configure options](../how-to/configure-options.md) |
| Builtin actions (`sys:seneca,*`) | [Builtin actions](builtin-actions.md) | [Run in production](../how-to/run-in-production.md) |
| `caller$`, `debug.act_caller` | [Message directives](message-directives.md), [Options: debug](options.md#debug) | [Debug and inspect](../how-to/debug-and-inspect.md) |
| Callpoints (`debug.callpoint`) | [Options: debug](options.md#debug) | [Debug and inspect](../how-to/debug-and-inspect.md) |
| Catch-all pattern (`''`) | [Patterns: the empty pattern](patterns.md#the-empty-pattern) | [Handle errors](../how-to/handle-errors.md) |
| `client` (send messages to a remote instance) | [Transport](transport.md) | [Use network transports](../how-to/use-network-transports.md) |
| `close`, `close_delay`, `closing$`, `closed` error | [API: close](api.md#close), [Options](options.md#top-level) | [Shut down gracefully](../how-to/shut-down-gracefully.md) |
| Close signals (`system.close_signals`) | [Options: system](options.md#system) | [Shut down gracefully](../how-to/shut-down-gracefully.md) |
| `context` property | [Instance properties](static-api-and-utilities.md#instance-properties) | |
| `custom$`, `meta.custom` | [Message directives](message-directives.md) | [Control message flow](../how-to/control-message-flow.md) |
| `death_delay`, fatal exit codes | [Options](options.md#top-level), [Error codes](error-codes.md) | [Handle errors](../how-to/handle-errors.md) |
| `decorate` | [API: decorate](api.md#decorate) | |
| `default$`, `strict.find` | [Message directives](message-directives.md), [Options: strict](options.md#strict) | [Handle errors](../how-to/handle-errors.md) |
| `delegate`, `fixedargs`, `fixedmeta`, `did` | [API: delegate](api.md#delegate) | [Control message flow](../how-to/control-message-flow.md) |
| Delegate hooks (`on_act_in`, `on_act_out`, `on_act_err`) | [Events: delegate hooks](events.md#delegate-hooks) | |
| `depends` | [Plugins](plugins.md#the-definition-function) | [Manage plugins](../how-to/manage-plugins.md) |
| `deprecate$`, `debug.deprecation` | [Message directives](message-directives.md) | |
| `destroy` (plugin shutdown stages) | [API: prepare, destroy](api.md#prepare-destroy) | [Shut down gracefully](../how-to/shut-down-gracefully.md) |
| `die`, fatal errors, `debug.undead` | [Error codes](error-codes.md), [Options: debug](options.md#debug) | [Handle errors](../how-to/handle-errors.md), [The error model](../explanation/error-model.md) |
| `direct`, `direct$` | [API: direct](api.md#direct) | [Use promises and async actions](../how-to/use-promises-and-async-actions.md) |
| Entities (`entity$`, `make$`) | [Legacy: entities](legacy.md#entities) | |
| `error` (create errors, set the error handler), `errhandler` | [API: error](api.md#error), [Error codes](error-codes.md) | [Handle errors](../how-to/handle-errors.md) |
| Error codes and error object properties | [Error codes](error-codes.md) | [Handle errors](../how-to/handle-errors.md) |
| `error.identify` | [Options: error](options.md#error) | |
| `events` option | [Events: the events option](events.md#the-events-option) | |
| `explain`, `explain$` | [API: explain](api.md#explain), [Message directives](message-directives.md) | [Debug and inspect](../how-to/debug-and-inspect.md) |
| `export`, plugin exports | [Plugins](plugins.md#return-value) | [Manage plugins](../how-to/manage-plugins.md), [Writing a plugin](../tutorials/writing-a-plugin.md) |
| `fail`, `throw$` | [API: fail](api.md#fail) | [Handle errors](../how-to/handle-errors.md) |
| `fatal$` | [Message directives](message-directives.md) | [Control message flow](../how-to/control-message-flow.md) |
| `find`, `has`, `list` | [API: has, find, list](api.md#has-find-list), [Patterns](patterns.md#inspecting-patterns) | [Debug and inspect](../how-to/debug-and-inspect.md) |
| `fix`, `fixed$` | [API: fix](api.md#fix), [Message directives](message-directives.md) | [Control message flow](../how-to/control-message-flow.md) |
| `gate`, `ungate`, `gate$` | [API: gate, ungate](api.md#gate-ungate) | [Control message flow](../how-to/control-message-flow.md) |
| Gubu validation (`valid`, pattern rules) | [Patterns: validation rules](patterns.md#validation-rules) | [Validate messages and options](../how-to/validate-messages-and-options.md) |
| History and message cache (`history.*`, `id$`) | [Options: history](options.md#history), [Message directives](message-directives.md) | [Control message flow](../how-to/control-message-flow.md) |
| `id`, `tag`, `fullname`, `version`, `start_time` | [Instance properties](static-api-and-utilities.md#instance-properties) | |
| `id$`, `actid$`, `tx$` (message and transaction ids) | [Message directives](message-directives.md) | [Control message flow](../how-to/control-message-flow.md) |
| `ignore_plugin`, `plugins: { name: false }` | [Plugins: inspecting plugins](plugins.md#inspecting-plugins) | [Manage plugins](../how-to/manage-plugins.md) |
| `init` (plugin init callback) | [Plugins](plugins.md#the-definition-function) | [Writing a plugin](../tutorials/writing-a-plugin.md) |
| `init$`, `defined$`, `inited$`, `tag$` plugin option directives | [Message directives](message-directives.md#directives-in-plugin-options) | |
| `internal.*` options (print, logger, routers) | [Options: internal](options.md#internal) | [Configure logging](../how-to/configure-logging.md) |
| `inward`, `outward` hooks and pipelines | [API: inward, outward](api.md#inward-outward) | [Control message flow](../how-to/control-message-flow.md), [Message lifecycle](../explanation/message-lifecycle.md) |
| Jsonic message strings | [Patterns: writing patterns](patterns.md#writing-patterns) | [Getting started](../tutorials/getting-started.md) |
| Legacy aliases and options | [Legacy](legacy.md) | [Migrate from Seneca 3](../how-to/migrate-from-seneca-3.md) |
| `limits.maxparents` | [Options: limits](options.md#limits) | [Control message flow](../how-to/control-message-flow.md) |
| `listen` (receive messages) | [Transport](transport.md) | [Use network transports](../how-to/use-network-transports.md) |
| `local$` | [Message directives](message-directives.md) | [Use network transports](../how-to/use-network-transports.md) |
| `log`, log levels, loggers, log entries | [Logging](logging.md) | [Configure logging](../how-to/configure-logging.md) |
| `log` event | [Events](events.md) | [Configure logging](../how-to/configure-logging.md) |
| `message` (async action) | [API: message](api.md#message) | [Use promises and async actions](../how-to/use-promises-and-async-actions.md) |
| Meta data object (`meta`) | [Message directives: the meta data object](message-directives.md#the-meta-data-object) | [Debug and inspect](../how-to/debug-and-inspect.md) |
| `meta$` (transport meta data on messages), `legacy.meta` | [Message directives](message-directives.md), [Legacy](legacy.md) | |
| Options (`options()`, option sources, validation) | [Options](options.md), [Command line and environment](command-line-and-environment.md) | [Configure options](../how-to/configure-options.md) |
| Options files (`seneca.options.js`, `from`) | [Command line and environment: options files](command-line-and-environment.md#options-files) | [Configure options](../how-to/configure-options.md) |
| `order` pipelines (`add`, `inward`, `outward`, `plugin`), `order.*.debug` | [Options: order](options.md#order) | [Message lifecycle](../explanation/message-lifecycle.md) |
| Parents and traces (`meta.parents`, `meta.trace`) | [Message directives: the meta data object](message-directives.md#the-meta-data-object) | [Debug and inspect](../how-to/debug-and-inspect.md) |
| Pattern matching, specificity, wildcards | [Patterns](patterns.md) | [Pattern matching](../explanation/pattern-matching.md) |
| `ping` | [API: status, stats, ping](api.md#status-stats-ping) | [Run in production](../how-to/run-in-production.md) |
| Pins | [Patterns: pins](patterns.md#pins), [Transport](transport.md) | [Use network transports](../how-to/use-network-transports.md) |
| Plugin definition (function, object, name, tag, `define`, `defaults`, `errors`, `preload`) | [Plugins](plugins.md) | [Writing a plugin](../tutorials/writing-a-plugin.md) |
| Plugin lifecycle actions (`role:seneca,plugin:define`, `role:seneca,plugin:init`) | [Builtin actions](builtin-actions.md#plugin-lifecycle-actions) | |
| Plugin options and `plugin.*` option | [Plugins: option resolution](plugins.md#option-resolution) | [Configure options](../how-to/configure-options.md) |
| Plugin tags | [Plugins](plugins.md#senecauseplugin-options) | [Manage plugins](../how-to/manage-plugins.md) |
| `plugins` option | [Options](options.md#top-level) | [Manage plugins](../how-to/manage-plugins.md) |
| `post` (promise form of act) | [API: post](api.md#post) | [Use promises and async actions](../how-to/use-promises-and-async-actions.md) |
| `prepare` (plugin async init stages) | [API: prepare, destroy](api.md#prepare-destroy) | [Writing a plugin](../tutorials/writing-a-plugin.md) |
| `print.options`, `--seneca.print.options` | [Options: debug](options.md#debug), [Command line and environment](command-line-and-environment.md) | [Configure options](../how-to/configure-options.md) |
| `prior` | [API: prior](api.md#prior) | [Extend actions with priors](../how-to/extend-actions-with-priors.md) |
| `quiet` | [API: quiet](api.md#quiet) | [Test Seneca code](../how-to/test-seneca-code.md) |
| `ready`, `ready` event | [API: ready](api.md#ready), [Events](events.md) | [Getting started](../tutorials/getting-started.md) |
| `reply` (deliver a reply by message id) | [API: reply](api.md#reply) | |
| Result rules (`strict.result`, `force$`) | [Options: strict](options.md#strict), [Message directives](message-directives.md#markers-on-results) | |
| `seneca()` (self), `isSeneca`, `toJSON`, `toString` | [API: other](api.md#other), [Instance properties](static-api-and-utilities.md#instance-properties) | |
| `Seneca()` factory, `Seneca.use/test/quiet` | [Module exports](static-api-and-utilities.md#the-module) | |
| `seneca.util` / `Seneca.util` | [Utilities](static-api-and-utilities.md#senecautil) | |
| `stats`, `sys:seneca,cmd:stats`, `stats.*` options | [API: status, stats, ping](api.md#status-stats-ping), [Builtin actions](builtin-actions.md) | [Debug and inspect](../how-to/debug-and-inspect.md) |
| `status`, `status.*` options | [API: status, stats, ping](api.md#status-stats-ping), [Options: status](options.md#status) | [Debug and inspect](../how-to/debug-and-inspect.md) |
| `strict.*` options | [Options: strict](options.md#strict) | [Extend actions with priors](../how-to/extend-actions-with-priors.md) |
| `strict$`, `strict.add` | [Message directives](message-directives.md), [Options: strict](options.md#strict) | [Extend actions with priors](../how-to/extend-actions-with-priors.md) |
| `sub`, `sub$`, `in$`, `out$` | [API: sub](api.md#sub) | [Control message flow](../how-to/control-message-flow.md) |
| `sync$`, `meta.sync` | [Message directives](message-directives.md) | |
| `system.exit`, `system.plugin.load_once`, `system.action.add` | [Options: system](options.md#system) | [Shut down gracefully](../how-to/shut-down-gracefully.md), [Manage plugins](../how-to/manage-plugins.md) |
| `test` (test mode), `SENECA_TEST`, `--seneca.test` | [API: test](api.md#test), [Command line and environment](command-line-and-environment.md) | [Test Seneca code](../how-to/test-seneca-code.md) |
| `timeout`, `timeout$`, `action_timeout` | [Options](options.md#top-level), [Message directives](message-directives.md) | [Handle errors](../how-to/handle-errors.md) |
| `trace.unknown`, `trace.invalid` | [Options: trace](options.md#trace) | [Debug and inspect](../how-to/debug-and-inspect.md) |
| `translate`, `translate$` | [API: translate](api.md#translate) | [Control message flow](../how-to/control-message-flow.md) |
| `transport` options, configuration resolution | [Transport](transport.md), [Options: transport](options.md#transport) | [Use network transports](../how-to/use-network-transports.md) |
| `transport/utils` export, transport plugin hooks | [Transport: for transport plugin authors](transport.md#for-transport-plugin-authors) | |
| Transport protocol (`meta$` wire format) | [Message transport protocol](message-transport-protocol.md) | [Transport independence](../explanation/transport-independence.md) |
| `use` (load a plugin) | [API: use](api.md#use), [Plugins](plugins.md) | [Manage plugins](../how-to/manage-plugins.md) |
| `valid` (Gubu builders), `valid.*` options | [Module exports](static-api-and-utilities.md#the-module), [Options: valid](options.md#valid) | [Validate messages and options](../how-to/validate-messages-and-options.md) |
| `wrap` | [API: wrap](api.md#wrap) | [Extend actions with priors](../how-to/extend-actions-with-priors.md) |
