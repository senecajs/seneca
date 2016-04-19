

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


# Request Document Meta Data

```js
{
  meta$:
  {
    act:  // fixed value of true,
    mid:  // Seneca message identifier, an opaque string,
    cid:  // Seneca correlation identifier, an opaque string,
    snc:  // true if synchronous (expecting response), false if asynchronous
    trk:  [ // array of previously visited seneca instances including timing,
      {
        sid: // Seneca instance identifier of sender
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
to the tracking array.

The return path is a HTTP end point, by default, and is optional. The
`urn` is the full adress of the end point, suitable for use in a HTTP
client. Transports may define additional return path meta data (for
example, response topic name on a message queue).

The `tms` array contains entries in UTC milliseconds, recording local
send and recieve times.

# Response Document Meta Data

This has the form:

```js
{
  meta$:
  {
    res:  // fixed value of true,
    mid:  // Seneca message identifier, as per inbound message
    cid:  // Seneca correlation identifier, as per inbound message
    trk:  [ // array of previously visited seneca instances including timing,
      {
        sid: // Seneca instance identifier of sender
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


# Example Flow

Services: A, B

## A -> B

Raw message data: `{ a: 1 }`
Raw response data: `{ x: 1 }`

Request:

```js
{
  a: 1,
  meta$:
  {
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
    res:  true,
    mid:  'm01',
    cid:  'c01',
    trk:  [ 
      {
        sid: 'A'
        mid: 'm01'
        tms: [ 1461023850000, // time message sent
               1461023850200, // time message received
               1461023850250  // time response sent
             ]
      }
    ],
    rtn:  {
      urn: 'http://192.168.0.1/rtn'
    }
  }
```



