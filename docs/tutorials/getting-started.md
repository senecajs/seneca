# Getting started

In this tutorial you will write your first Seneca program, learn how
messages find the code that handles them, and see how functionality is
grouped into plugins. It takes about twenty minutes. The finished
programs are in [docs/examples/getting-started](../examples/getting-started/).

## 1. Install

Seneca needs Node.js 22 or later (24 is recommended). In a new
directory:

```sh
npm init -y
npm install seneca
```

## 2. Your first message

Create `first-message.js`:

```js
const Seneca = require('seneca')

const seneca = Seneca({ log: 'warn' })

seneca.add('role:math,cmd:sum', function (msg, reply) {
  reply({ answer: msg.left + msg.right })
})

seneca.act('role:math,cmd:sum,left:1,right:2', function (err, result) {
  if (err) throw err
  console.log(result) // { answer: 3 }
})
```

Run it with `node first-message.js`. It prints `{ answer: 3 }` and
exits.

Three things happened:

* `Seneca({ log: 'warn' })` created an instance. The option keeps the
  log quiet; without it Seneca prints a JSON log line for every
  notable event, starting with a `hello` notice.
* `seneca.add(pattern, action)` registered an *action*: a function that
  handles messages matching the *pattern* `role:math,cmd:sum`.
* `seneca.act(message, callback)` submitted a *message*. Seneca matched
  it against the known patterns, ran the action, and passed the reply
  to the callback as `(err, result)`.

The message is a plain object. The string `'role:math,cmd:sum,left:1,right:2'`
is shorthand for `{ role: 'math', cmd: 'sum', left: 1, right: 2 }`. The
properties `role` and `cmd` matched the pattern; `left` and `right` are
the data the action worked with. There is nothing special about the
names `role` and `cmd`: any properties can form a pattern.

The action replied with `reply({ answer: 3 })`. Replies are objects
(or arrays). To report a failure, reply with an `Error`:
`reply(new Error('bad input'))`.

## 3. More specific patterns win

Add a second action that only applies when the message says
`integer:true`:

```js
seneca.add('role:math,cmd:sum,integer:true', function (msg, reply) {
  reply({ answer: Math.floor(msg.left) + Math.floor(msg.right) })
})

seneca.act('role:math,cmd:sum,left:1.5,right:2.5', Seneca.util.print)
// { answer: 4 }

seneca.act('role:math,cmd:sum,left:1.5,right:2.5,integer:true', Seneca.util.print)
// { answer: 3 }
```

Both patterns match the second message, but the one with more
properties wins. This is how Seneca handles special cases: instead of
an `if` inside the general action, you add a more specific pattern.
Properties the pattern does not mention (`left`, `right`) do not affect
matching.

(`Seneca.util.print` is a ready-made callback that prints the result,
or the error if there is one.)

## 4. Strings and objects

Patterns and messages can be written as strings, objects, or both. The
string form uses [Jsonic](https://github.com/jsonicjs/jsonic), a relaxed
JSON without braces or quotes:

```js
seneca.add({ role: 'math', cmd: 'product' }, function (msg, reply) {
  reply({ answer: msg.left * msg.right })
})

seneca.act('role:math,cmd:product', { left: 3, right: 4 }, Seneca.util.print)
seneca.act('role:math,cmd:product,left:3,right:5', Seneca.util.print)
seneca.act({ role: 'math', cmd: 'product', left: 3, right: 6 }, Seneca.util.print)
// { answer: 12 }
// { answer: 15 }
// { answer: 18 }
```

The common style is a string for the pattern part and an object for
the data part.

## 5. Promises

Callbacks are the basic form; promises are built in too.
`seneca.message` adds an action written as an `async` function, whose
return value is the reply, and `seneca.post` submits a message and
returns a promise:

```js
const Seneca = require('seneca')

async function main() {
  const seneca = Seneca({ log: 'warn' })

  seneca.message('role:math,cmd:sum', async function (msg) {
    return { answer: msg.left + msg.right }
  })

  seneca.message('role:math,cmd:average', async function (msg) {
    const { answer } = await this.post('role:math,cmd:sum', {
      left: msg.left,
      right: msg.right,
    })
    return { answer: answer / 2 }
  })

  await seneca.ready()

  const result = await seneca.post('role:math,cmd:average,left:4,right:8')
  console.log(result) // { answer: 6 }

  await seneca.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
```

Inside an action, `this` is a Seneca instance bound to the current
message, so `this.post(...)` sends a *child message*. Seneca records
the relationship, which you will see later in logs and traces.

## 6. Plugins

A plugin is a function that adds related actions. It receives an
options object, and `this` is the Seneca instance:

```js
const Seneca = require('seneca')

function math(options) {
  this.add('role:math,cmd:sum', function (msg, reply) {
    reply({ answer: msg.left + msg.right })
  })

  this.add('role:math,cmd:product', function (msg, reply) {
    reply({ answer: msg.left * msg.right })
  })
}

function rounding(options) {
  this.add('role:math,cmd:sum', function (msg, reply) {
    this.prior(msg, function (err, result) {
      if (err) return reply(err)
      reply({ answer: Number(result.answer.toFixed(options.precision)) })
    })
  })
}

Seneca({ log: 'warn' })
  .use(math)
  .use(rounding, { precision: 2 })
  .act('role:math,cmd:sum,left:0.1,right:0.2', Seneca.util.print)
// { answer: 0.3 }
```

`seneca.use(plugin, options)` loads a plugin. The plugin's name is the
function's name (`math`, `rounding`).

The `rounding` plugin adds an action for a pattern that already exists.
Seneca does not replace the earlier action: the new one becomes the
current handler and the earlier one becomes its *prior*, which the new
action calls with `this.prior(msg, callback)`. This is how plugins
extend each other without knowing each other's code. Load order matters:
the plugin loaded last gets the message first.

## 7. Ready and close

Plugins may need to do asynchronous work when they load, for example
connecting to a database. `seneca.ready(fn)` runs `fn` once all loading
has finished, and `seneca.close(fn)` shuts the instance down:

```js
function math(options) {
  this.add('role:math,cmd:sum', function (msg, reply) {
    reply({ answer: msg.left + msg.right })
  })

  this.prepare(async function () {
    await new Promise((resolve) => setTimeout(resolve, 100))
    this.log.info('math is ready')
  })
}

const seneca = Seneca({ log: 'warn' }).use(math)

seneca.ready(function () {
  this.act('role:math,cmd:sum,left:1,right:1', function (err, result) {
    console.log(err, result) // null { answer: 2 }

    this.close(function (err) {
      console.log('closed', err || '')
    })
  })
})
```

Messages submitted before `ready` are not lost: they wait in a queue
until loading completes. Both `ready()` and `close()` return promises
when called without a callback, as in step 5.

## 8. Seeing what happens

Start an instance in test mode to get readable logs of every message:

```js
const seneca = Seneca().test('print')
```

Running step 6 this way prints lines such as these (identifiers vary):

```
34/zw/- DEBUG	add/ADD	cmd:sum,role:math
37/zw/- DEBUG	add/ADD	cmd:sum,role:math
40/zw/- DEBUG	act/IN/s	m3/ck	cmd:sum,role:math	{role:'math',cmd:'sum',left:0.1,right:0.2}	rounding/action/11	hhky
41/zw/- DEBUG	act/IN/s	cl/ck	cmd:sum,role:math	{role:'math',cmd:'sum',left:0.1,right:0.2}	math/action/10	hhky/czh0
41/zw/- DEBUG	act/OUT/s	cl/ck	cmd:sum,role:math	{answer:0.30000000000000004}	math/action/10	hhky/czh0
41/zw/- DEBUG	act/OUT/s	m3/ck	cmd:sum,role:math	{answer:0.3}	rounding/action/11	hhky
{ answer: 0.3 }
```

Each line starts with the elapsed milliseconds, two characters of the
instance id and the tag, then the level and the event (`add/ADD` for a
pattern being added, `act/IN` and `act/OUT` for a message entering and
leaving an action; the `/s` means a reply is expected). Action lines
continue with the message id and transaction id (`m3/ck`: two messages
in the same transaction `ck`), the pattern, the data, and the action
that handled it (`plugin/function/number`). You can see the `rounding`
action receive the message first, call its prior in `math`, and reply.

## Where next

* [Microservices with transports](microservices-with-transports.md)
  runs plugins in separate processes that talk over the network.
* [Writing a plugin](writing-a-plugin.md) covers options, defaults,
  initialization, exports and errors.
* The [how-to guides](../how-to/) answer specific questions, and the
  [reference](../reference/) lists every method, option and directive.
