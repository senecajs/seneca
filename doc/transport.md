

# Seneca message transport protocol

The protocol is a request/response model. However some requests do not
require responses, so the protocol also supports actor or pub/sub message flows.

The protocol is transport independent and simply assumes that JSON
documents can be delivered whole and as discrete individual documents.

The JSON document can contain any data. The property `meta$` is
reserved for Seneca meta data, but is not required. Seneca will
construct meta data with default values if `meta$` is not
present. This provides for the use case of simple manual HTTP
interactions with tools like `curl`.

The term _message_ refers to a single instance of outbound request
JSON data transmitted between two specific service instances. The term
message does *not* refer to a message flow over multiple services, *nor*
to the optional JSON data response. The concept of the message
response should be considered subsumed within the concept of a
message, as a convenience of the protocol. If responses are to stand
in their own right as separate messages, then an asynchronous message
flow should be used.


# Request Document Meta Data

```js
{
  meta$:
  {
    sid:  // Seneca instance identifier of sender of this message
    act:  // fixed value of true,
    mid:  // Seneca message identifier, an opaque string,
    cid:  // Seneca correlation identifier, an opaque string,
    snc:  // true if synchronous (expecting response), false if asynchronous
    trk:  [ // array of previously visited seneca instances including timing,
      {
        sid: // Seneca instance identifier of sender (not always redundant!)
        mid: // Seneca message identifier of inbound message
        tms: [
          // local (sender instance) UTC milliseconds sent
        ]
      }
    ],
    rtn:  { // return path description
      urn: // full network address for http response, optional
    }
    usr: { // user data, use this for your own meta data, optional
      ...
    }
  }
}
```

## Notes

The full message identifier has the form _mid_/_cid_. The correlation
identifier is retained across service instances and action calls so
that the entire causal chain of a message flow can be traced.

The Seneca instance identifier is an opaque string. In debugging mode
it may be extremely short. By convention, as a debugging aid, and not
to be considered normative, the full instance identifier has internal
structure:

`12-random-chars-from-[0-9a-z]` / `UTC-absolute-milliseconds` / `network-address` / `local-process-number` / `user-tag` 

The `trk` array provides a history of the message flow through
services. When an inbound message causes further outbound messages,
the Seneca instance where the new outbound messages orginate is added
to the tracking array. Each entry in `trk` represents exactly one
outbound request (the message), and at most one response.

The return path is a HTTP end point, by default, and is optional. The
`urn` is the full adress of the end point, suitable for use in a HTTP
client. Transports may define additional return path meta data (for
example, response topic name on a message queue).

The `tms` array contains entries in UTC milliseconds, recording local
send and receive times. Seneca instances should complete these arrays
as much as possible. In particular, on receipt of responses, the final
receive time should always be added so that it is available to
plugins.


# Response Document Meta Data

This has the form:

```js
{
  meta$:
  {
    rid:  // Seneca instance identifier of sender of this response, not the sender of the request
    res:  // fixed value of true,
    mid:  // Seneca message identifier, as per inbound message
    cid:  // Seneca correlation identifier, as per inbound message
    trk:  [ // array of previously visited seneca instances including timing,
      {
        sid: // Seneca instance identifier of sender
        rid: // Seneca instance identifier of receiver
        mid: // Seneca message identifier of inbound message
        tms: [
          // local (sender instance) UTC milliseconds sent,
          // local (receiver instance) UTC milliseconds received
          // local (receiver instance) UTC milliseconds response sent
        ]
      }
    ],
    usr: { // user data, use this for your own meta data, optional
      ...
    }
  }
}
```

## Notes

The `trk` array includes as the last entry the Seneca instance that
finally acted on the message.

There may be multiple responses to a given outbound message. By
default only the first is provided to the response callback. to
recieve all responses, use the `meta$: { multiple: true }` option when
submitting the message. The repsonse callback will be called once for
each message, up to some limit in time or message volume.

The additional entries to the `tms` array can be used to measure local
processing time. Seneca does not assume remote clocks are synchronized
within some range; all times are locally valid only.


# Example Flows

Services: A, B

## A -> B; Synchronous

  * Raw message data: `{ a: 1 }`
  * Raw response data: `{ x: 1 }`

Request:

```js
{
  a: 1,
  meta$:
  {
    sid: 'A',
    act:  true,
    mid:  'm01',
    cid:  'c01',
    snc:  true,
    trk:  [ 
      {
        sid: 'A'
        mid: 'm01'
        tms: [ 1461023850000 ]
      }
    ],
    rtn:  {
      urn: 'http://192.168.0.1/rtn'
    }
  }
```

Response:

```js
{
  x: 1,
  meta$:
  {
    rid: 'B',  // NOTE: the Seneca id of the receiver
    res:  true,
    mid:  'm01',
    cid:  'c01',
    trk:  [ 
      {
        sid: 'A'
        rid: 'B',
        mid: 'm01'
        tms: [ 1461023850000, // time message sent
               1461023850200, // time message received
               1461023850250  // time response sent
             ]
      }
    ]
  }
```


## A -> B, C; Asynchronous

  * Raw message data: `{ a: 2 }`
  * No response.

Sent Request (at A):

```js
{
  a: 2,
  meta$:
  {
    sid: 'A',
    act:  true,
    mid:  'm02',
    cid:  'c02',
    snc:  false,
    trk:  [ 
      {
        sid: 'A',
        mid: 'm02'
        tms: [ 1461023851000 ]
      }
    ]
  }
```

Received Request (at B):

```js
{
  a: 2,
  meta$:
  {
    sid: 'A',
    act:  true,
    mid:  'm02',
    cid:  'c02',
    snc:  false,
    trk:  [ 
      {
        sid: 'A',
        rid: 'B',
        mid: 'm02'
        tms: [ 1461023851000,
               1461023851200,
             ]
      }
    ]
  }
```



## A -> B -> C; Chained synchronous

### A -> B; Synchronous

  * A raw message data: `{ a: 3 }`
  * B raw message data: `{ b: 1 }`
  * Waits for response from B -> C interaction
  * C raw response data: `{ y: 1 }`
  * B raw response data: `{ x: 2 }`
  * A is hosted on 192.168.0.1
  * B is hosted on 192.168.0.2

Request A -> B:

```js
{
  a: 3,
  meta$:
  {
    sid: 'A',
    act:  true,
    mid:  'm03',
    cid:  'c03',
    snc:  true,
    trk:  [ 
      {
        sid: 'A'
        mid: 'm03'
        tms: [ 1461023852000 ] // time sent by A
      }
    ],
    rtn:  {
      urn: 'http://192.168.0.1/rtn' // A
    }
  }
```

Request B -> C:

```js
{
  b: 1,
  meta$:
  {
    sid: 'B',  // NOTE: sending from B here
    act:  true,
    mid:  'm04', // NOTE: new message id
    cid:  'c03',  // NOTE: same as A -> B
    snc:  true,
    trk:  [ 
      {
        sid: 'A'
        rid: 'B',
        mid: 'm03'
        tms: [ 1461023852000,
               1461023852200, // time received by B
             ]
      },
      {
        sid: 'B'
        mid: 'm04'
        tms: [ 1461023852300 ] // time sent by B
      }
    ],
    rtn:  {
      urn: 'http://192.168.0.2/rtn' // B
    }
  }
```

Response to B -> C:

```js
{
  y: 1,
  meta$:
  {
    rid:  'C', // NOTE: responding from C
    res:  true,
    mid:  'm04',
    cid:  'c03',
    trk:  [ 
      {
        sid: 'A'
        rid: 'B',
        mid: 'm03'
        tms: [ 1461023852000,
               1461023852200,
             ]
      },
      {
        sid: 'B'
        rid: 'C',
        mid: 'm04'
        tms: [ 1461023852300,
               1461023852500, // time received by C
               1461023852600  // time sent from C
             ]
      }
    ]
  }
```


Response to A -> B:

```js
{
  y: 1,
  meta$:
  {
    rid:  'B', // NOTE: responding from B
    res:  true,
    mid:  'm03', // NOTE: back to working on m03 (presumably uses data from m04 response)
    cid:  'c03',
    trk:  [ 
      {
        sid: 'A'
        rid: 'B',
        mid: 'm03'
        tms: [ 1461023852000,
               1461023852200,
               1461023852800  // time m03 response sent by B
             ]
      },
      {
        sid: 'B'
        rid: 'C',
        mid: 'm04'
        tms: [ 1461023852300,
               1461023852500, 
               1461023852600,
               1461023852700, // time m04 response received by B
             ]
      }
    ]
  }
```


