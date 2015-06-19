

# Seneca message transport protocol

The protocol is a request/response model. However some requests do not
require responses, so the protocol also supports actor or pub/sub message flows.

The protocol is transport independent and simply assumes that JSON
documents can be delivered whole and as discrete individual documents.

# Request Document

This has the form:

```js
{
  v:      // seneca version of client
  id:     // seneca action identifier, an opaque string,
  kind:   // fixed string value `"act"`,
  res:    // _true_ if a response is expected, _false_ otherwise,
  act:    // JSON payload, no properties may contain a `$` character,
  origin: // seneca instance identifier of originating seneca process,
  track:  // array of previously visited seneca instances,
  time: {
    client_sent: //local date/time of client seneca (Date.now value), on request sent
  }
}
```


# Response Document

This has the form:

```js
{
  v:      // seneca version of listener
  id:     // seneca action identifier, an opaque string,
  kind:   // fixed string value `"res"`,
  act:    // JSON request payload, no properties may contain a `$` character,
  res:    // JSON response payload, no properties may contain a `$` character,
  accept: // seneca instance identifier of the accepting seneca process
  origin: // seneca instance identifier of originating seneca process (copied from request),
  track:  // array of previously visited seneca instances, appending this one
  time: {
    client_sent: // local date/time of client seneca (Date.now value), on request sent
    listen_recv: // local date/time of listening seneca (Date.now value), on request received
    listen_sent: // local date/time of listening seneca (Date.now value), on response sent
  },
  error: { // only present if there is an error
    message: // error message
    // other fields, optional
  }
}
```

