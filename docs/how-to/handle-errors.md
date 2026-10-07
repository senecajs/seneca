# Handle errors

How to report failures from actions, deal with them in callers, and set
up instance-wide handling. The model behind this is explained in
[The error model](../explanation/error-model.md); the codes are listed in
the [Error codes reference](../reference/error-codes.md).

## Report a failure from an action

Reply with an `Error`, or throw one:

```js
seneca.add('role:shop,cmd:price', function (msg, reply) {
  if (null == msg.item) return reply(new Error('item is required'))
  ...
})

seneca.message('role:shop,cmd:price', async function (msg) {
  if (null == msg.item) throw new Error('item is required')
  ...
})
```

Give errors a code so that callers can tell them apart. Define the
plugin's codes once:

```js
function shop(options) {
  this.add('role:shop,cmd:price', function (msg, reply) {
    if (null == prices[msg.item]) {
      return reply(this.error('unknown_item', { item: msg.item }))
    }
    ...
  })
}

shop.errors = {
  unknown_item: 'There is no item named <%=item%>.',
}
```

`this.error(code, details)` creates the error; `this.fail(code, details)`
creates and throws it. The message is built from the template and the
details; the error carries `code` and `details`. Outside a plugin, the
codes are Seneca's own (see the reference).

## Handle a failure in the caller

```js
seneca.act('role:shop,cmd:price,item:kiwi', function (err, result, meta) {
  if (err) {
    if ('unknown_item' === err.code) return reply({ price: null })
    return reply(err)
  }
  ...
})

try {
  await seneca.post('role:shop,cmd:price,item:kiwi')
} catch (err) {
  if ('unknown_item' !== err.code) throw err
}
```

The caller receives the error object the action produced. In the
callback form, `meta.err` describes the failure as Seneca saw it
(`act_execute`, with the pattern and message) and `meta.data` is the
original message.

## Act on every error in one place

```js
seneca.error(function (err, meta) {
  report(err, meta && meta.pattern)
})
```

The handler is called for action errors, timeouts, callback errors,
fatal errors and `ready` failures. Its return value matters: returning
a truthy value means "handled", and the caller's callback is then not
called (the `post` promise never settles). Return nothing unless that is
what you want. In tests, `seneca.test(done)` installs `done` as the
handler so that an unexpected error fails the test.

## Unknown messages

A message no action matches is an `act_not_found` error. Options:

```js
// supply a result for this message
seneca.act('role:shop,cmd:exotic', { default$: { price: null } }, cb)

// make every unmatched message reply with {}
Seneca({ strict: { find: false } })

// add a catch-all action
seneca.add('', function (msg, reply) { reply({ unhandled: true }) })
```

Set `trace: { unknown: false }` to stop the `warn` log entry for
unknown messages.

## Timeouts

An action that does not reply within `timeout` milliseconds (default
22222) fails with `action_timeout`; `err.details` has the timeout, the
pattern and the message. Set a different limit per instance or per
message:

```js
Seneca({ timeout: 5000 })
seneca.act('role:report,cmd:build', { timeout$: 60000 }, cb)
```

## Validation failures

Messages that violate the action's rules fail with `act_invalid_msg`;
`err.details.props` lists each failing property with `path`, `what`,
`type` and `value`. See [Validate messages and options](validate-messages-and-options.md).

## Fatal errors

Plugin definition and initialization failures, missing dependencies,
transport start-up failures and `ready` function exceptions are fatal:
Seneca logs a report, calls the error handler, closes the instance and
exits the process. To make a message's failure fatal, send it with
`fatal$: true`.

To test fatal paths without the process exiting:

```js
const seneca = Seneca({ debug: { undead: true } }).error((err) => { ... })
```

To change how the process exits (for example in a test), replace
`system.exit`:

```js
Seneca({ system: { exit: (code) => { exited = code } } })
```

A fatal error also sends `sys:seneca,info:fatal` before closing, which
can be observed with `seneca.sub('sys:seneca,info:fatal', fn)`.

## Errors in callbacks

If your `act` callback throws, the error is logged, emitted as `act-err`
with kind `callback`, wrapped as `act_callback`, and given to the error
handler. It does not reach the action.

## Errors across transports

The transport plugin decides how an error reply travels. Seneca's
transport helpers serialize the error object with its `message`, `code`
and `details`, but seneca-transport 8.3 does not deliver that detail:
over HTTP the client gets an error with the generic message `Response
Error: 500 Internal Server Error`, and over TCP the error reply is not
delivered and the caller times out. The service side logs the original
error (`act/ERR`), so check its logs for the cause; when callers need
the detail, reply with a result object that describes the failure
instead of an error. Remote callers cannot make a message fatal:
`fatal$` is removed from inbound messages.

## See what went wrong

Errors are logged at level `error` as `act/ERR` entries with the message,
the pattern and the stack. In test mode the stack trace and the calling
location are printed. The option `debug.print.err: true` makes the flat
logger print errors to standard error as well.
