# Message transport protocol

What travels between Seneca instances when a transport plugin carries a
message and its reply. The core transport API is described in
[Transport](transport.md); this page describes the data.

Two formats exist:

* the envelope used by [seneca-transport](https://github.com/senecajs/seneca-transport)
  8, the standard HTTP and TCP transport, which has its own serialization
  code and does not use the core helpers;
* the format produced by Seneca core's `transport/utils` helpers
  (`externalize_msg`, `externalize_reply`, `internalize_msg`,
  `internalize_reply`), available to transport plugins that choose to
  use them.

A transport plugin must produce and consume the format its own listener
and client agree on; nothing in Seneca core inspects the wire format.

## The seneca-transport 8 envelope

### Request

The client sends a JSON object:

```js
{
  id: 'z6wlh2q8xy6c/3tw2v5d9l0ab',   // message id: mi/tx
  kind: 'act',
  origin: '0qr9.../1791398793297/307/4.0.0/client',  // client instance id
  track: ['0qr9.../1791398793297/307/4.0.0/client'], // instance ids visited so far
  time: { client_sent: 1791398793577 },
  act: { role: 'shop', cmd: 'price', item: 'apple', quantity: 3 },  // the message, without $ properties
  sync: true,                                        // a reply is expected
  msg$: {                                            // protocol design fields (see below)
    vin: 1, sid: '<origin>', out: true,
    mid: 'z6wlh2q8xy6c', cid: '3tw2v5d9l0ab', snc: true,
    pat: 'cmd:price,role:shop',
  },
}
```

`act` is the message with all `$` properties removed, plus `custom$`
when the message carries custom meta data (`meta.custom`), so that it
reaches the remote action's `meta.custom`.

### Response

The listener replies with:

```js
{
  id: 'z6wlh2q8xy6c/3tw2v5d9l0ab',   // same id as the request
  kind: 'res',
  origin: '<client instance id>',   // the request's origin
  accept: '<listener instance id>', // the instance that handled it
  track: [...],                     // the request's track
  time: { client_sent: 1791398793577, listen_recv: 1791398793580, listen_sent: 1791398793582 },
  sync: true,
  res: { item: 'apple', quantity: 3, total: 1.5 },  // the result, or null
  error: { message: '...', name: 'Error', code: '...', ... },  // only when the action failed
  input: { ... },                   // the request's act, only with error
}
```

An error is serialized as a plain object: `message`, `name` and the
error's own enumerable properties (such as `code` and `details`).

### Identifiers and transactions

`id` has the form `mi/tx` (see [Message directives](message-directives.md)).
The listener sets the transaction id of its handling delegate from the
request's `tx`, so child messages on the remote side share the
transaction, and submits the message with `id$` set to the request id.
`origin` is checked on responses so that a reply is only accepted by the
instance that sent the request; `track` is used to reject messages that
loop back to an instance they have already visited (`message_loop`) or
that an instance sent itself (`own_message`).

### HTTP (type `web`)

The client posts the `act` object as the JSON body to
`<protocol>://<host>:<port><path>` (default path `/act`) with the rest of
the envelope in headers:

| Header | Content |
| ------ | ------- |
| `Content-Type`, `Accept` | `application/json` |
| `seneca-id` | the request `id` |
| `seneca-kind` | `req` |
| `seneca-origin` | the client instance id |
| `seneca-track` | the `track` array as JSON |
| `seneca-time-client-sent` | `time.client_sent` |

A request without a `seneca-id` header is accepted as a plain message:
the listener generates an id and uses the `User-Agent` header as the
origin. This is what makes `curl` requests work.

The response body is the result as JSON (`null` when the action replied
with nothing). The headers `seneca-id`, `seneca-kind: res`,
`seneca-origin`, `seneca-accept`, `seneca-track`,
`seneca-time-client-sent`, `seneca-time-listen-recv` and
`seneca-time-listen-sent` carry the rest of the envelope. When the action
failed, the status is the error's `statusCode` or 500 and the body is the
serialized error. A Seneca client then reports the HTTP client library's
error (`Response Error: 500 Internal Server Error`) rather than the
serialized error in the body.

### TCP (type `tcp`)

Each request and each response is one complete envelope object encoded
as a line of newline delimited JSON (`ndjson`) on the connection.

### The `msg$` block

The request envelope contains a `msg$` object with the fields of the
original protocol design: `vin` (protocol version, 1), `sid` (sender
instance id), `out` (true for an outbound request), `mid` and `cid`
(message and correlation identifiers, the `mi` and `tx` parts of `id`),
`snc` (synchronous) and `pat` (the pattern on the sending instance). The
seneca-transport 8 listener does not read this block; the fields it uses
are the top level `id`, `kind`, `origin`, `track`, `time`, `act` and
`sync`. The remaining parts of that design (per hop timing in a `trk`
array, a return path `rtn`, custom data `ctm`, a response `meta$` with
`rid`, `res`, `trk` and `usr`, and multiple responses to one message) were
never implemented in Seneca 4 transports and should not be relied on.

## The core helper format

Seneca core offers serialization helpers through the
`transport/utils` export (seneca-transport 8 replaces this export with
its own object, so load order matters if both are needed). A transport
built on them exchanges the message or reply object with the meta data
attached as `meta$`:

```js
// externalize_msg(seneca, msg, meta): outbound message
{ role: 'shop', cmd: 'price', item: 'apple', meta$: { id, mi, tx, pattern, action, sync, custom, parents, ... } }

// externalize_reply(seneca, err, out, meta): outbound reply
{ item: 'apple', total: 1.5, meta$: { id, mi, tx, ..., error: false } }
{ message: 'Unknown item', code: 'unknown_item', meta$: { ..., error: true } }   // an error, as a plain object
{ meta$: { ..., empty: true } }                                                   // a reply with no data
```

`meta$` is the message's [meta data object](message-directives.md#the-meta-data-object);
`error: true` marks an error reply and `empty: true` a reply without data.
On receipt, `internalize_msg` moves `meta$.id`, `meta$.sync`,
`meta$.custom`, `meta$.explain` and `meta$.parents` into the directives
`id$`, `sync$`, `custom$`, `explain$` and `parents$`, removes `fatal$`,
and sets `remote$: true`; `internalize_reply` returns `{ err, out, meta }`,
rebuilding an `Error` when `meta$.error` is set. Both convert objects
marked `entity$` into entities when the entity plugin is loaded.
