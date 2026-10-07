# Use network transports

How to run actions in separate processes and connect them with
seneca-transport. The core transport API is described in the
[Transport reference](../reference/transport.md); the tutorial
[Microservices with transports](../tutorials/microservices-with-transports.md)
walks through a first example.

## Install and load the transport plugin

```sh
npm install seneca-transport
```

```js
const seneca = Seneca().use('seneca-transport')
```

Seneca 4 does not bundle transports; `listen` and `client` fail without
a transport plugin.

## Expose actions over HTTP

```js
seneca.listen({ type: 'web', port: 8260, pin: 'role:shop,cmd:*' })
```

Omit `pin` to expose every action. Shorthand forms: `listen(8260)`,
`listen(8260, '0.0.0.0')`, `listen(8260, '0.0.0.0', '/act')`. Pass a
callback as the last argument to be told when the listener is up.

## Call remote actions

```js
seneca.client({ type: 'web', port: 8260, host: 'shop.internal', pin: 'role:shop,cmd:*' })
```

Messages matching the pin are sent to the remote instance; the reply
arrives as if the action were local. A client without `pin` handles
every message that has no local action.

## Use TCP instead of HTTP

```js
seneca.listen({ type: 'tcp', port: 8261, pin: 'role:shop,cmd:*' })
seneca.client({ type: 'tcp', port: 8261, pin: 'role:shop,cmd:*' })
```

## Connect to several services

Add one client per service, each with its own pin:

```js
seneca
  .client({ port: 8260, pin: 'role:shop,cmd:*' })
  .client({ port: 8270, pin: 'role:tax,cmd:*' })
  .client({ port: 8280, pin: ['role:user,cmd:*', 'role:auth,cmd:*'] })
```

Several pins must be given as an array; `client()` does not split a
single string on `;`.

## Keep some messages local

An action added after the client for a pattern the pin covers becomes
the current handler; the client action becomes its prior. Handle the
local cases and pass the rest on:

```js
seneca.client({ port: 8260, pin: 'role:shop,cmd:*' })

seneca.add('role:shop,cmd:price', function (msg, reply) {
  if ('sample' === msg.item) return reply({ total: 0 })
  this.prior(msg, reply)   // sent to the remote service
})
```

Avoid adding a *more specific* local pattern (for example
`role:shop,cmd:price,item:sample`) under a glob pin: messages with that
`cmd` are routed into the exact branch, and those for other items then
match nothing. Use explicit pins per command, or override the same
pattern as above.

To force a single message to stay local, send it with `local$: true`.
To send messages to the remote side even when a local action exists,
create the client with `override: true`.

## Set defaults for all transports

```js
Seneca({
  transport: {
    port: 9000,
    host: '0.0.0.0',
    web: { timeout: 10000 },
  },
})
```

Scalar keys of `transport` apply to every `listen` and `client`; a
section named after the type (`web`, `tcp`) applies to that type.

## Set timeouts

The instance `timeout` (default 22222 ms) applies to remote calls too;
use `timeout$` on a message for a one-off limit. seneca-transport also
accepts a `timeout` in the client configuration for the HTTP request.

## Use HTTPS

Pass `protocol: 'https'` and the server options to `listen`:

```js
seneca.listen({
  type: 'web',
  port: 8443,
  protocol: 'https',
  serverOptions: { key: Fs.readFileSync('key.pem'), cert: Fs.readFileSync('cert.pem') },
})
```

## Call a service without a Seneca client

The web transport accepts a JSON body at the listen path (default
`/act`):

```sh
curl -s -X POST http://localhost:8260/act -H 'Content-Type: application/json' \
  -d '{"role":"shop","cmd":"list"}'
```

## Errors from remote actions

How an error reply travels depends on the transport. With
seneca-transport 8.3, an error replied by a remote action reaches an
HTTP client as an `Error` with the generic message `Response Error: 500
Internal Server Error` (the meta data's `err.code` is `act_execute`),
and over TCP the error reply is not delivered at all, so the caller
gets an `action_timeout`. The failing action's own error, with its code
and details, is logged on the service side (`act/ERR`), so look there
for the cause, and prefer replying with a result object that describes
the failure (for example `{ ok: false, why: 'unknown_item' }`) when
callers need the detail.

## Check connectivity

The builtin `sys:seneca,cmd:ping` action is available remotely when the
listener's pin includes it (or has no pin):

```js
const info = await client.post('sys:seneca,cmd:ping')
```

`seneca.status().transport.register` lists the listen and client
registrations the instance has made, and `seneca.ping().tr` summarizes
them.

## Shut down

`seneca.close()` runs the transport's close hooks, which release
listening sockets, so a process exits cleanly after closing its
instance. See [Shut down gracefully](shut-down-gracefully.md).

## Other transports

Message queue and pub/sub transports are separate plugins that register
`role:transport,hook:listen,type:<type>` and
`role:transport,hook:client,type:<type>`; pass their `type` in the
configuration. To write one, see
[For transport plugin authors](../reference/transport.md#for-transport-plugin-authors)
and the [message transport protocol](../reference/message-transport-protocol.md).
