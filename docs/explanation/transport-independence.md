# Transport independence

Seneca separates *what* a message means from *where* it is handled. This
page explains how `listen` and `client` achieve that and what it implies
for designing services.

## Local first

An instance always tries to handle a message locally. A transport
client is just another action: `seneca.client({ pin: 'role:shop,cmd:*' })`
adds an action for each pin whose implementation sends the message to a
remote instance and waits for the reply. A client without pins adds a
catch-all action, so that anything the local instance cannot handle is
sent away.

Because clients are actions, the usual rules apply:

* A local action added after the client for a pattern the pin covers
  becomes the current handler; the client becomes its prior, so local
  cases can be handled and the rest passed on with `this.prior`.
* A more specific local pattern with an exact value that the pin
  matches by glob captures all messages with that value (see
  [Wildcards](../reference/patterns.md#wildcards)); prefer overriding
  the same pattern or explicit pins.
* The `local$` directive forces a message to stay local; a client
  action passes such messages to its prior.
* `override: true` wraps existing local actions so that the remote side
  handles them instead.

On the receiving side, `seneca.listen({ pin: ... })` accepts messages for
the pins and submits them to the local instance exactly as if they had
been produced by a local `act` call. Replies travel back and are matched
to the waiting message by identifier. The handler code is identical in
both deployments; only the wiring differs.

## Pins describe the topology

A pin is a pattern that selects a set of actions. Listing the pins of a
service documents what it serves; listing the pins of its clients
documents what it depends on. The same plugin can be split across
services by pin without changing its code, and a message can be served
locally during development and remotely in production by changing
configuration only.

## Transports are plugins

Seneca core contains no network code. It defines two hook patterns,
`role:transport,hook:listen,type:<type>` and
`role:transport,hook:client,type:<type>`, and the message serialization
helpers that transport plugins use (`transport/utils`). A transport
plugin such as seneca-transport implements the hooks for HTTP and TCP;
others implement message queues or pub/sub systems. The
[message transport protocol](../reference/message-transport-protocol.md)
specifies the meta data that accompanies messages so that identifiers,
transaction ids and tracing survive the hop.

## What travels

A message is serialized as JSON with a `meta$` property carrying the
message and transaction identifiers, the sync flag, custom meta data
and the parent chain. On arrival the meta data is restored into
directives, `fatal$` is stripped (a remote caller must not be able to
kill a service), and the message is marked `remote$`. Replies carry the
meta data back, including timing, so the caller's trace shows the remote
work. Errors are serialized as plain objects and rebuilt as `Error`
objects on the way back.

## Design consequences

* Keep messages self-describing: they will be read without the code
  that produced them.
* Prefer small, flat messages. Only JSON travels; functions, class
  instances and circular structures do not (entities are the exception,
  handled by the entity plugin).
* Timeouts matter more across the network. Set `timeout` per instance
  or `timeout$` per message with the remote latency in mind.
* Idempotency is available for free: a repeated message identifier
  within the history window returns the recorded result, which clients
  can use when retrying.
* The receiving instance's error handler and logs are where remote
  failures appear first; the caller sees the error object only.
