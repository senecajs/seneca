# Seneca documentation

The documentation follows the [Diátaxis](https://diataxis.fr/) structure:
four sections with four different jobs. Start with the tutorials if you
are new to Seneca; use the how-to guides for specific tasks; look things
up in the reference; read the explanations to understand the design.

## Tutorials

Learning oriented lessons that take you through building something,
step by step.

| Tutorial | What you build |
| -------- | -------------- |
| [Getting started](tutorials/getting-started.md) | Your first actions and messages, pattern specificity, promises, plugins, ready and close. |
| [Microservices with transports](tutorials/microservices-with-transports.md) | A plugin running as an HTTP service, and a client that calls it. |
| [Writing a plugin](tutorials/writing-a-plugin.md) | A complete plugin with options, validation, initialization, exports, errors and tests. |

The programs from the tutorials are in [examples](examples/).

## How-to guides

Task oriented recipes for people who already know the basics.

| Guide | Covers |
| ----- | ------ |
| [Configure options](how-to/configure-options.md) | Code, files, environment variables, command line, plugin options, runtime changes. |
| [Configure logging](how-to/configure-logging.md) | Levels, JSON and flat output, custom loggers, your own entries. |
| [Handle errors](how-to/handle-errors.md) | Error replies and codes, global handler, unknown messages, timeouts, fatal errors. |
| [Test Seneca code](how-to/test-seneca-code.md) | Test mode, failing on unexpected errors, stubbing actions, fatal paths. |
| [Extend actions with priors](how-to/extend-actions-with-priors.md) | Overriding patterns, calling the original, `wrap`, `strict.add`. |
| [Use promises and async actions](how-to/use-promises-and-async-actions.md) | `message`, `post`, `ready`, `close`, `prior`, `direct`. |
| [Validate messages and options](how-to/validate-messages-and-options.md) | Gubu rules in patterns, plugin defaults, instance options. |
| [Control message flow](how-to/control-message-flow.md) | Gates, timeouts, locality, fatal, defaults, custom meta data, idempotency, subscriptions, translation, hooks. |
| [Manage plugins](how-to/manage-plugins.md) | Loading, configuration, tags, dependencies, exports, ignoring, load order. |
| [Use network transports](how-to/use-network-transports.md) | seneca-transport over HTTP and TCP, pins, several services, local overrides, HTTPS. |
| [Debug and inspect](how-to/debug-and-inspect.md) | Message logs, pattern listing, explanations, tracing, statistics, pipeline tracing. |
| [Shut down gracefully](how-to/shut-down-gracefully.md) | `close`, plugin `destroy`, signals, fatal exits. |
| [Run in production](how-to/run-in-production.md) | Configuration per environment, logging, lifecycle, health, timeouts, security notes. |
| [Migrate from Seneca 3](how-to/migrate-from-seneca-3.md) | What changed in Seneca 4 and how to update. |
| [Create a release](how-to/create-a-release.md) | For maintainers: publishing Seneca itself with npm trusted publishing. |

## Reference

Information oriented descriptions of every part of Seneca.

| Reference | Describes |
| --------- | --------- |
| [Instance API](reference/api.md) | Every method on a Seneca instance. |
| [Module exports, instance properties and utilities](reference/static-api-and-utilities.md) | `Seneca()`, `Seneca.use/test/quiet/util/valid`, instance properties, `seneca.util`. |
| [Options](reference/options.md) | Every option with its default and effect. |
| [Command line and environment](reference/command-line-and-environment.md) | `--seneca.*` arguments, `SENECA_*` variables, options files, precedence. |
| [Patterns](reference/patterns.md) | Pattern syntax, matching rules, wildcards, pins, validation rules. |
| [Message directives and meta data](reference/message-directives.md) | Every `$` directive and every meta data field. |
| [Action definition](reference/action-definition.md) | The object returned by `seneca.find`. |
| [Plugin definition](reference/plugins.md) | What `use` accepts, the definition function, option resolution, lifecycle. |
| [Logging](reference/logging.md) | Levels, log specification, loggers, log methods, entry fields. |
| [Events](reference/events.md) | Events emitted by an instance, the `events` option, delegate hooks. |
| [Builtin actions](reference/builtin-actions.md) | `sys:seneca,*`, transport and plugin lifecycle actions. |
| [Error codes](reference/error-codes.md) | Error object properties and every error code. |
| [Transport](reference/transport.md) | `listen`, `client`, configuration resolution, routing, the plugin author API. |
| [Message transport protocol](reference/message-transport-protocol.md) | The wire format of messages and replies. |
| [Legacy and compatibility](reference/legacy.md) | Seneca 3 names and behaviours that remain. |
| [Feature index](reference/feature-index.md) | Every feature, A to Z, with where it is documented. |

## Explanation

Understanding oriented discussions of how Seneca works and why.

| Explanation | Topic |
| ----------- | ----- |
| [Why Seneca](explanation/why-seneca.md) | The ideas behind messages, patterns and plugins. |
| [Pattern matching](explanation/pattern-matching.md) | Patterns as filters, specificity, priors, why it suits services. |
| [Message lifecycle and architecture](explanation/message-lifecycle.md) | From `act` to callback: meta data, executor, pipelines, delegates, history. |
| [Plugins and composition](explanation/plugins-and-composition.md) | Load order, initialization, options and tags, exports, composition by priors. |
| [Transport independence](explanation/transport-independence.md) | Local first routing, pins, transports as plugins, what travels. |
| [The error model](explanation/error-model.md) | Action errors, fatal errors, callback errors, and where to handle each. |

## Other documents

* [Change log](../CHANGES.md)
* [Code of conduct](../CODE_OF_CONDUCT.md)
* [License](../LICENSE)
