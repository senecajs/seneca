# Transport reference

Seneca core contains the plumbing for sending messages between
instances; the actual network protocols are provided by transport
plugins such as [seneca-transport](https://github.com/senecajs/seneca-transport)
(HTTP and TCP). This page covers the core API; the wire format is in
[Message transport protocol](message-transport-protocol.md).

## `seneca.listen(config..., [callback])`

Receive messages. Arguments are one of:

| Form | Meaning |
| ---- | ------- |
| `listen()` | Defaults. |
| `listen({ ... })` | Configuration object. |
| `listen(port)` | Port only. |
| `listen(port, host)` | |
| `listen(port, host, path)` | |

A trailing function is called with `(err, result)` when the listener is
ready. `listen` returns the instance; a listen failure is fatal
(`transport_listen`).

## `seneca.client(config...)`

Send messages. Takes the same argument forms as `listen` (without the
callback) and returns the instance. A client failure is fatal
(`transport_client`); a client hook that replies with nothing is fatal
(`transport_client_null`).

## Configuration resolution

The configuration object is completed in this order:

1. Scalar values of `options.transport` (`port`, `host`, `path`,
   `protocol` by default) fill in missing keys.
2. `type` defaults to `'web'`.
3. The section `options.transport[type]` (for example
   `options.transport.web`) supplies further defaults; for `web` and
   `tcp` its `port`, `host` and `path` fill in missing values.

Common configuration keys:

| Key | Meaning |
| --- | ------- |
| `type` | Transport type, matched against `role:transport,hook:*,type:<type>` actions provided by transport plugins. |
| `port`, `host`, `path`, `protocol` | Network location. |
| `pin`, `pins` | Patterns handled by this listener or client (see [Pins](patterns.md#pins)). A client without pins is a catch-all client for messages with no local action. |
| `id` | Client identifier; defaults to the canonical form of the configuration. |
| `override` | Client only: when true, existing local actions matching the pins are wrapped so that messages go to the client. |
| `makehandle` | Client only: function `(config) => handle` used by transport plugins to intercept later `add` calls for the client's patterns. |

Transport plugins define further keys (for example `timeout`,
`serverOptions`).

## How clients route messages

For each pin, `client()` adds an action marked `client$: true` with
`strict$: { add: true }`. When a message matches:

* with `local$: true`, the message is passed to the prior action (the
  local implementation, if any);
* otherwise it is sent through the transport client's `send(msg, reply,
  meta)` function;
* if the transport client is not ready yet, a `no-transport-client`
  error is logged.

A local `seneca.add` for the same pattern made after `client()` takes
precedence (it becomes the current action and the client action its
prior). Replies arriving from the remote side are matched to the waiting
message by id; `seneca.reply({ meta, err, out })` is the API transports
use to deliver them.

## Registrations

Each successful `listen` and `client` call is recorded in
`seneca.status().transport.register` as `{ when, config, err, res }` and
summarized in `seneca.ping().tr`.

## For transport plugin authors

A transport plugin adds two actions per transport type:

```js
seneca.add('role:transport,hook:listen,type:mytype', function (msg, reply) {
  // msg contains the configuration; start listening, then reply()
})

seneca.add('role:transport,hook:client,type:mytype', function (msg, reply) {
  // reply with a client object
  reply({ send: function (msg, reply, meta) { /* deliver msg, call reply(err, out, meta) */ } })
})
```

The export `seneca.export('transport/utils')` provides helpers
(seneca-transport 8 replaces this export with its own):

| Function | Purpose |
| -------- | ------- |
| `externalize_msg(seneca, msg, meta)` | Prepare an outbound message: attaches `meta$`; errors become plain objects. |
| `externalize_reply(seneca, err, out, meta)` | Prepare an outbound reply: attaches `meta$`, marks errors (`meta$.error`) and empty replies (`meta.empty`). |
| `internalize_msg(seneca, msg)` | Prepare an inbound message: moves `meta$` into `id$`, `sync$`, `custom$`, `explain$` and `parents$`, removes `fatal$`, sets `remote$`, converts entities. |
| `internalize_reply(seneca, data)` | Prepare an inbound reply: returns `{ err, out, meta }`, rebuilding `Error` objects. |
| `stringifyJSON(obj)`, `parseJSON(text)` | Safe JSON encoding (circular references) and decoding (errors are returned, not thrown). |
| `close(seneca, closer)` | Register a close hook on `sys:seneca,cmd:close`; `closer(done)` is called when the instance closes. |
| `info()` | `{ local, remote }` maps of pattern to action id, telling local actions from client actions. |

Inbound messages must not carry `fatal$`; `internalize_msg` removes it.
