# Debug and inspect

How to see what an instance is doing: which patterns exist, how a
message was routed and processed, and how the instance is performing.

## See every message

```js
const seneca = Seneca().test('print')
```

```sh
node service.js --seneca.test --seneca.log=debug
```

Test mode logs each message as it enters (`act/IN`) and leaves
(`act/OUT` or `act/ERR`) an action, with the message id, the pattern,
the data and the action id (`plugin/function/number`). Errors include
the stack trace and the location of the `act` call that caused them.

## List patterns and find the handler

```js
seneca.list()                    // all patterns
seneca.list('role:shop,cmd:*')   // matching patterns
seneca.has('role:shop,cmd:price')
seneca.find('role:shop,cmd:price,item:apple')  // the action that would run
```

`find` returns the [action definition](../reference/action-definition.md):
`id`, `plugin`, `func`, `rules`, `priorpath` (the chain of overridden
actions) and `callpoint` (where it was added, in test mode).

## Explain a message

Ask for an explanation of one message with the `explain$` directive:

```js
const explain = []
const result = await seneca.post('role:shop,cmd:price,item:apple', { explain$: explain })
console.dir(explain, { depth: null })
```

The first entry describes the message (pattern, action, timing, flags,
custom data, parents); actions and their child actions can add entries
with `this.explain({ ... })` (a no-op when the message is not being
explained). To explain every message for a while:

```js
const captured = seneca.explain(true)
...
const explanations = seneca.explain(false)
```

## Follow a call tree

Every message has an id `mi/tx`; child messages share the transaction
id `tx`. In log entries the `idpath` field shows the transaction id
followed by the parent and message ids. The meta data (third argument of
actions and callbacks) has `parents` (the chain of calling actions) and
`trace` (child calls with timing).

Set your own transaction id to correlate work with external requests:

```js
seneca.act('role:shop,cmd:price,item:apple', { tx$: request.id }, cb)
```

## Find where a message came from

```js
Seneca({ debug: { act_caller: true, callpoint: true } })
```

`act_caller` attaches the calling code location to each message
(`caller$`, printed with errors), and `callpoint` records where actions
were added and called. Both are on in test mode.

## Statistics and status

```js
seneca.stats()                      // counts of calls, done, fails, cache hits
seneca.stats({ pattern: 'role:shop,cmd:price' })  // one pattern, with timing
seneca.status()                     // stats, in-flight message history, transport registrations
seneca.ping()                       // uptime, cpu, memory, counts
```

The same data is available to other processes through
`sys:seneca,cmd:stats` and `sys:seneca,cmd:ping`. Set
`status: { running: true }` to log a status line periodically.
`stats: { running: true }` computes timing statistics continuously, but
its timer is not stopped by `close()` (the process must exit explicitly).

## See the resolved options

```sh
node service.js --seneca.print.options
```

## Trace the processing pipelines

```js
Seneca({ order: { inward: { debug: true }, outward: { debug: true } } })
```

prints each task of the inward and outward pipelines as it runs (see
[Message lifecycle](../explanation/message-lifecycle.md)).
`order.add.debug` and `order.use.debug` do the same for `add` and plugin
loading.

## Unknown and invalid messages

Messages with no matching pattern are logged at level `warn`
(`act/UNKNOWN`); set `trace: { invalid: true }` to also warn about
messages that fail validation (`act/INVALID`).

## Fatal error reports

When the process dies, Seneca prints a report with the error, the
instance, the details and the stack. For more, set
`debug: { print: { fatal: 'full' } }`, and `debug: { print: { env: true } }`
to include the environment (off by default so that secrets stay out of
logs).
