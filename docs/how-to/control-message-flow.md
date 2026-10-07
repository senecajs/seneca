# Control message flow

How to influence the processing of individual messages: ordering,
timeouts, locality, failure severity, defaults, shared context,
idempotency, observation, routing and hooks. Directives are documented
in the [Message directives reference](../reference/message-directives.md).

## Run messages in sequence

Messages on an instance normally run as soon as they are submitted. To
make later messages wait for one to complete, gate it:

```js
seneca.act('role:db,cmd:migrate', { gate$: true }, cb)   // everything after waits
seneca.gate().act('a:1').act('a:2').act('a:3')            // one after another
```

`seneca.gate()` returns a delegate whose messages are all gated.

## Set a timeout for one message

```js
seneca.act('role:report,cmd:build', { timeout$: 60000 }, cb)
```

## Keep a message local

```js
seneca.act('role:shop,cmd:price,item:apple', { local$: true }, cb)
```

A transport client action passes a `local$` message to its prior (the
local implementation) instead of sending it.

## Make a failure fatal

```js
seneca.act('role:config,cmd:load', { fatal$: true }, cb)
```

An error reply terminates the process (see [Handle errors](handle-errors.md)).

## Supply a default result

```js
seneca.act('role:shop,cmd:discount,item:apple', { default$: { discount: 0 } }, cb)
```

Used when no action matches; also what `this.prior` replies when there
is no prior action.

## Carry context through a call tree

`custom$` meta data is available to the action and to every child
action as `meta.custom`, and merged back from replies:

```js
seneca.act('role:order,cmd:place', { custom$: { user: user.id, request: req.id } }, cb)

seneca.add('role:stock,cmd:reserve', function (msg, reply, meta) {
  this.log.info({ user: meta.custom.user })
  ...
})
```

For request-scoped data on the instance itself, create a delegate:

```js
const request_seneca = seneca.delegate({ user$: user.id }, { custom: { request: req.id } })
request_seneca.act('role:order,cmd:place', cb)   // every message carries user$ and the custom data
```

## Make a message idempotent

Give the message an identifier. A repeated identifier within the
history window (until the message's timeout passes) returns the
recorded result without running the action again:

```js
seneca.act('role:payment,cmd:charge', { id$: paymentId, amount: 10 }, cb)
```

`tx$` sets only the transaction part of the id, for correlation.

## Observe messages without handling them

```js
seneca.sub('role:order,cmd:place', function (msg) { audit(msg) })                 // before the action
seneca.sub('role:order,cmd:place,out$:true', function (msg, result) { audit(result) }) // after it
```

Subscriptions match the pattern exactly (a subscription for `a:1` fires
for `a:1,b:2` as well). They run synchronously and must not throw.

## Route one pattern to another

```js
seneca.translate('role:shop,cmd:getPrice', 'role:shop,cmd:price')
seneca.translate('role:legacy,cmd:price', 'role:shop,cmd:price', 'item,quantity')
```

Messages for the first pattern are forwarded to the second. The third
argument selects which properties to forward (prefix a name with `-` to
exclude it).

## Add fixed properties to a group of actions

```js
seneca
  .fix('role:shop', { region: 'eu' }, { source: 'shop-plugin' })
  .add('cmd:price', action)   // pattern role:shop,cmd:price; msg.region is 'eu'; meta.custom.source set
  .add('cmd:list', action)
```

## Run an action synchronously

```js
const result = seneca.direct('role:util,cmd:slug,text:Hello')
```

## Hook into processing

```js
seneca.inward(function (spec) {
  if (spec.ctx.actdef && spec.ctx.actdef.pattern.startsWith('role:admin') && !spec.data.meta.custom.admin) {
    return { op: 'stop', out: { kind: 'error', code: 'not_allowed', info: {} } }
  }
})

seneca.outward(function (spec) {
  if (spec.data.res) spec.data.res.served_by = spec.ctx.seneca.id
})
```

Inward hooks run before the action, outward hooks after it; see
[Message lifecycle](../explanation/message-lifecycle.md) for the
pipeline and the `spec` contents.

## Prevent runaway recursion

An action that calls itself (directly or through others) is stopped
when the chain of parent messages exceeds `limits.maxparents` (default
33) with a `maxparents` error.
