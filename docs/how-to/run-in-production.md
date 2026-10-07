# Run in production

How to configure and operate a Seneca process in a deployed
environment.

## Configuration per environment

Keep environment specific values out of the code. Load an options file
chosen by the environment, and allow overrides from the environment and
command line:

```js
const seneca = Seneca('./config/' + (process.env.NODE_ENV || 'development') + '.js')
```

```sh
SENECA_OPTIONS='plugin:{store:{url:"postgres://..."}}' node service.js --seneca.tag=orders-1
```

See [Configure options](configure-options.md).

## Logging

Leave the default JSON logger and the `info` level, so that each entry
is one JSON document that log collectors can parse. Tag each instance
(`tag` option or `--seneca.tag`) so that entries from different
processes can be told apart. Lower the level to `warn` on busy
services if `info` is too verbose; raise it to `debug` temporarily with
`--seneca.log=debug` when investigating. See
[Configure logging](configure-logging.md).

## Process lifecycle

Close the instance on termination signals so that in-flight messages
finish and transports release their sockets:

```js
Seneca({ system: { close_signals: { SIGTERM: true, SIGINT: true } } })
```

Fatal errors (a plugin that cannot initialize, a transport that cannot
bind) exit the process with code 1 after closing. Run the process under
a supervisor (systemd, a container orchestrator) that restarts it and
reports repeated failures. Do not set `debug.undead` in production. See
[Shut down gracefully](shut-down-gracefully.md).

## Health and metrics

* `seneca.ping()` and the action `sys:seneca,cmd:ping` return uptime,
  memory, CPU usage and message counts; expose the action through a
  transport (or call it from an HTTP health endpoint) for liveness
  checks.
* `sys:seneca,cmd:stats` returns call, completion and failure counts
  per pattern; with `stats: { running: true }` timing statistics are
  kept up to date.
* `status: { running: true }` logs a status entry every
  `status.interval` milliseconds.

## Timeouts

Set the instance `timeout` to a value appropriate for the slowest
expected action, and use `timeout$` on individual long running messages.
Timeouts protect callers; the timed-out action still runs to completion
in the background.

## Security notes

* Messages arriving over a transport cannot be fatal (`fatal$` is
  removed) but can be anything else: validate them with pattern rules
  and expose only the pins a service should serve.
* `debug.print.env` is off by default so that a fatal error report does
  not print the environment.
* Options printed with `--seneca.print.options` include plugin options;
  avoid it where output is captured by shared logs.

## Dependencies

Seneca runs on Node.js 22 or later. Pin plugin versions in
`package.json` and run `npm audit signatures` or your usual supply chain
checks as part of deployment.
