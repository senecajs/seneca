# Microservices with transports

In this tutorial you will take a plugin that runs in one process and
run it as a separate service that other processes call over HTTP,
without changing the plugin. The finished programs are in
[docs/examples/microservices](../examples/microservices/).

You should have completed [Getting started](getting-started.md).

## 1. Install a transport

Seneca core does not include network code. Transports are plugins; the
standard one, [seneca-transport](https://github.com/senecajs/seneca-transport),
provides HTTP and TCP:

```sh
npm install seneca seneca-transport
```

## 2. The plugin, in one process

Here is a small `shop` plugin, used locally:

```js
const Seneca = require('seneca')

function shop(options) {
  const prices = { apple: 0.5, pear: 0.75, ...options.prices }

  this.add('role:shop,cmd:price', function (msg, reply) {
    const price = prices[msg.item]
    if (null == price) {
      return reply(new Error('Unknown item: ' + msg.item))
    }
    reply({ item: msg.item, quantity: msg.quantity, total: price * msg.quantity })
  })
}

Seneca({ log: 'warn' })
  .use(shop)
  .act('role:shop,cmd:price,item:apple,quantity:3', Seneca.util.print)
// { item: 'apple', quantity: 3, total: 1.5 }
```

## 3. The service

Create `shop-service.js`. It loads the plugin and the transport, and
*listens* for messages matching a *pin*:

```js
const Seneca = require('seneca')

function shop(options) {
  const prices = { apple: 0.5, pear: 0.75, ...options.prices }

  this.add('role:shop,cmd:price', function (msg, reply) {
    const price = prices[msg.item]
    if (null == price) {
      return reply(new Error('Unknown item: ' + msg.item))
    }
    reply({ item: msg.item, quantity: msg.quantity, total: price * msg.quantity })
  })

  this.add('role:shop,cmd:list', function (msg, reply) {
    reply({ items: Object.keys(prices) })
  })
}

Seneca({ tag: 'shop' })
  .use(shop, { prices: { plum: 1.0 } })
  .use('seneca-transport')
  .listen({ type: 'web', port: 8260, pin: 'role:shop,cmd:*' })
  .ready(function () {
    console.log('shop service listening on port 8260 as ' + this.id)
  })
```

Start it in a terminal:

```sh
node shop-service.js
```

It prints a JSON log line for the `listen` registration and the
`hello` notice (this instance keeps the default `info` log level, which
is what you want for a service), then the ready message. The `tag`
option labels the instance in logs.

The pin `role:shop,cmd:*` says which messages this listener accepts:
any `role:shop` message with any `cmd`. The `*` is a glob.

## 4. The client

Create `shop-client.js` in a second terminal:

```js
const Seneca = require('seneca')

async function main() {
  const seneca = Seneca({ tag: 'client', log: 'warn' })
    .use('seneca-transport')
    .client({ type: 'web', port: 8260, pin: 'role:shop,cmd:*' })

  // Handle one case locally; everything else goes to the service through the prior
  seneca.add('role:shop,cmd:price', function (msg, reply) {
    if ('sample' === msg.item) {
      return reply({ item: 'sample', quantity: msg.quantity, total: 0 })
    }
    this.prior(msg, reply)
  })

  await seneca.ready()

  console.log(await seneca.post('role:shop,cmd:list'))
  console.log(await seneca.post('role:shop,cmd:price,item:apple,quantity:3'))
  console.log(await seneca.post('role:shop,cmd:price,item:sample,quantity:3'))

  await seneca.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
```

Run `node shop-client.js`:

```
{ items: [ 'apple', 'pear', 'plum' ] }
{ item: 'apple', quantity: 3, total: 1.5 }
{ item: 'sample', quantity: 3, total: 0 }
```

What happened:

* `seneca.client({ pin })` added an action for the pin whose job is to
  send matching messages to the service and wait for the reply. The
  client code calls `seneca.post` exactly as it would for a local
  action.
* The local `role:shop,cmd:price` action was added after the client,
  so it became the current handler for that pattern and the client
  action became its *prior*. It handles the `sample` item itself and
  passes everything else on with `this.prior`, which sends the message
  to the service. Priors work the same way whether the prior action is
  local or remote.
* The service's own log (the first terminal) shows each message it
  handled, with the client's instance id in the tracking headers.

One caution when combining glob pins with local patterns: adding a
*more specific* local pattern such as `role:shop,cmd:price,item:sample`
under the pin `role:shop,cmd:*` would route every `cmd:price` message
into that exact branch, and messages for other items would then match
nothing. Override the same pattern and use `prior`, as above, or give
the client explicit pins per command.

Stop the service with Ctrl-C when you are done.

## 5. What a message looks like on the wire

With the service running, send it a message with `curl`:

```sh
curl -s -X POST http://localhost:8260/act \
  -H 'Content-Type: application/json' \
  -d '{"role":"shop","cmd":"list"}'
```

The reply is JSON. The web transport accepts plain JSON messages; the
`meta$` property that Seneca clients add (identifiers, timing, tracing)
is optional. See the [message transport protocol](../reference/message-transport-protocol.md).

## 6. Splitting a system

The service and the client share no code except the message format.
This is what lets you decide the deployment shape separately from the
code:

* During development, load all plugins into one process (step 2).
* In production, run plugins in separate processes with `listen`, and
  point the processes that need them at them with `client` and pins.
* A client without a pin (`seneca.client({ port })`) sends *every*
  message the local instance cannot handle to the remote side, which is
  convenient for a thin front end.

The how-to guide [Use network transports](../how-to/use-network-transports.md)
covers TCP, several clients, overriding local actions, timeouts and
graceful shutdown.
