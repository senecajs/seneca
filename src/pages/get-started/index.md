---
layout: main.html
---

# Getting Started
Seneca lets you build a [microservice system](http://martinfowler.com/articles/microservices.html) without worrying about how things will fit together in production. You don't need to know where the other services are located, how many of them there are, or what they do. Everything external to your business logic, such as databases, caches, or third party integrations can likewise be hidden behind microservices.

This decoupling makes your system easy to build and change on a continuous basis. It works because Seneca has two core features.

- Transport Independence: you can send messages between services in many ways, all hidden from your business logic.
- Pattern Matching: instead of fragile service discovery, you just let the world know what sort of messages you care about.

Messages are JSON documents, with any internal structure you like. Messages can be sent via HTTP/S, TCP connections, message queues, publish/subscribe services or any mechanism that moves bits around. From your perspective as the writer of a service, you just send messages out into the world. You don't want to know which services get them — that creates fragile coupling.

Then there are the messages you'd like to receive. You specify the property patterns that you care about, and Seneca (with a little configuration help) makes sure that you get any messages matching those patterns, sent by other services. The patterns are very simple, just a list of key-value pairs that the top level properties of the JSON message document must match.

This Getting Started guide will cover Seneca in a broad way, but won't go into too much depth. The [Next Steps](#next-steps) section at the end of this Page is your starting point for more details.


## A Simple Microservice

Let's start with some code. Here's a service that sums two numbers:

```javascript
var seneca = require( 'seneca' )()

seneca.add(
  { role:'math', cmd:'sum' },
  function (msg, respond) {
    var sum = msg.left + msg.right
    respond(null, { answer: sum })
  })
```

To call this service, you write:

```javascript
seneca.act(
  { role:'math', cmd:'sum', left:1, right:2 },
  function (err, result) {
    if (err) return console.error(err)
    console.log(result)
  })
```

For the moment this is all happening in the same process, and there's no network traffic. In-process function calls are a type of message transport too!

The example code to try this out is in [sum.js](https://github.com/senecajs/getting-started/blob/master/sum.js). To run the code, follow these steps:

1. Open a terminal, and `cd` to your projects folder.
2. Run `git clone https://github.com/senecajs/getting-started`.
3. `cd` into the getting-started folder.
4. Run `npm install` to install the required modules, including Seneca.
5. Run `node sum.js`.

This guide assumes you already have [node.js](http://nodejs.org/) installed.

When you run `sum.js`, you get the following output:

```
2015-07-02T12:38:08.788Z    xi94dnm0nrky/1435840688779/64029/-    INFO    hello    Seneca/0.6.2/xi94dnm0nrky/1435840688779/64029/-    
{ answer: 3 }
```

The first line is logging information that Seneca prints to let you know that it has started. The second line is the result produced after the message has been matched and processed.

The `seneca.add` method adds a new action pattern to the Seneca instance. This pattern is matched against any JSON messages that the Seneca instance receives. The action is a function that is executed when a pattern matches a message.

The `seneca.add` method has two parameters:

- `pattern`: the property pattern to match in messages,
- `action`: the function to execute if a message matches.

The action function has two parameters:

- `msg`: the matching inbound message (provided as a plain object),
- `respond`: a callback function that you use to provide a respond to the message.

The respond function is a callback with the standard `error, result` signature. Let's put this all together again:

```javascript
seneca.add(
  {role:'math', cmd:'sum'},
  function( msg, respond ) {
    var sum = msg.left + msg.right
    respond( null, { answer: sum } )
  })
```

In the example code, the action computes the sum of two numbers, provided via the `left` and `right` properties of the message object. Not all messages generate a result, but as this is the most common case, Seneca allows you to provide the result via a callback function.

In summary, the action pattern `role:math, cmd:sum` acts on the message

```JSON
{ "role": "math", "cmd": "sum", "left": 1, "right": 2 }
```

to produce the result:

```JSON
{ "answer": 3 }
```

There is nothing special about the properties `role` and `cmd`. They just happen to be the ones you are using for pattern matching.

The `seneca.act` method submits a message to act on. It takes two parameters:

- `msg`: the message object,
- `response_callback`: a function that receives the message response, if any.

The response callback is a function you provide with the standard `error, result` signature. If there was a problem (say, the message matched no patterns), then the first argument will be an [Error](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error) object. If everything went to plan, the second argument will be the result object. In the example code, these arguments are simply printed to the console:

```js
seneca.act(
  {role:'math', cmd:'sum', left:1, right:2},
  function( err, result ) {
    if( err ) return console.error( err )
    console.log( result )
  })
```

The example code in the sum.js file shows you how to define and call an action pattern inside the same Node.js process. Soon you'll see how to split this code over multiple processes.
