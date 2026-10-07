# Configure logging

How to control what Seneca logs, where it goes, and how to add your own
entries. The details of levels, loggers and entry fields are in the
[Logging reference](../reference/logging.md).

## Set the level

```js
Seneca({ log: 'warn' })          // warnings and errors only
Seneca({ log: 'debug' })         // every action in and out
Seneca({ log: 'silent' })        // nothing
Seneca({ log: { level: 'info' } })
```

From outside the code:

```sh
node service.js --seneca.log=warn
node service.js --seneca.log.debug
SENECA_OPTIONS='log:warn' node service.js
```

At runtime: `seneca.options({ log: 'debug' })`.

The default level is `info`, which logs startup (`hello`), transport
registrations and the periodic status entry, but not individual
messages.

## Choose the output format

The default logger writes one JSON object per line, suitable for log
collectors. For reading in a terminal use the flat logger:

```js
Seneca({ log: 'flat' })
```

```sh
node service.js --seneca.log=flat
```

or test mode, whose compact format shows message ids, patterns and
results:

```js
Seneca().test('print')   // debug level, test logger
```

```sh
node service.js --seneca.test
```

## Send logs to your own logging library

Provide a logger function. It receives the entry object; `this` is the
Seneca instance:

```js
const pino = require('pino')()

const seneca = Seneca({
  log: 'info',
  logger: function (entry) {
    pino[entry.level_name === 'fatal' ? 'fatal' : entry.level_name](entry)
  },
})
```

Entries have `level_name` (`debug`, `info`, `warn`, `error`, `fatal`),
`kind` and `case` describing the event, `isot` and `when` for the time,
and event specific fields (`pattern`, `msg`, `res`, `err`, `duration`).
Only entries at or above the configured level reach the logger.

A logger can also be packaged as a plugin whose `preload` returns
`{ extend: { logger } }`; load it with `logger: require('my-logger')`.

## Redirect printed output

All builtin loggers print through `console.log`. To capture output
instead (for example in tests), replace the print functions:

```js
const lines = []
const seneca = Seneca({
  log: 'debug',
  internal: { print: { log: (line) => lines.push(line) } },
})
```

## Observe every entry without a logger

The `log` event fires for every entry, regardless of level:

```js
seneca.on('log', (entry) => {
  if ('ERR' === entry.case) alert(entry)
})
```

## Write your own entries

```js
seneca.log.info({ kind: 'order', case: 'PLACED', order_id: order.id })
seneca.log.warn('stock low', { item: 'apple' })   // becomes { data: [...] }
seneca.log.debug(...)
seneca.log.error(...)
```

Inside an action use `this.log`; the entry is then tagged with the
action's pattern and message id. Inside a plugin, entries carry the
plugin name.

## Tag instances

When several instances share a log stream, give each a tag:

```js
Seneca({ tag: 'orders' })
```

```sh
node service.js --seneca.tag=orders
```

The tag ends the instance id (`seneca_id` in every entry) and appears in
the test and flat formats.

## Trim or extend what is logged

| Goal | Option |
| ---- | ------ |
| Stop warnings for messages with no matching pattern | `trace: { unknown: false }` |
| Warn on messages that fail validation | `trace: { invalid: true }` |
| Longer data in log lines | `debug: { datalen: 1000 }` |
| Deeper object inspection | `debug: { print: { depth: 4 } }` |
| Print errors to stderr as well (flat logger) | `debug: { print: { err: true } }` |
| Periodic status line | `status: { running: true, interval: 60000 }` |
| Shorter identifiers | `debug: { short_logs: true }` |
| Silence deprecation warnings | `debug: { deprecation: false }` |
