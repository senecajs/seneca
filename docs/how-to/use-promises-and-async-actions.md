# Use promises and async actions

How to work with Seneca using `async`/`await` instead of callbacks.

## Define actions as async functions

```js
seneca.message('role:shop,cmd:price', async function (msg, meta) {
  const rate = await this.post('role:tax,cmd:rate', { country: msg.country })
  return { total: msg.net * (1 + rate.rate) }
})
```

The returned value is the reply; a thrown error (or rejected promise) is
an error reply. `this` is the action's Seneca delegate, as for callback
actions.

## Send messages

```js
const result = await seneca.post('role:shop,cmd:price,item:apple,quantity:2')
```

`post` rejects with the error the action produced. The meta data of the
reply is not available in this form; use `act` with a callback when you
need `meta`.

## Wait for startup and shutdown

```js
const seneca = Seneca().use(shop).use(tax)
await seneca.ready()
...
await seneca.close()
```

`ready()` resolves with the instance once every plugin has loaded.

## Call the prior action

```js
seneca.message('role:shop,cmd:price', async function (msg) {
  const result = await this.prior(msg)
  return { ...result, currency: 'EUR' }
})
```

## Mix callbacks and promises

Callback actions and async actions can call each other freely; a
callback action can `post`, and an async action can `act` with a
callback. Only one style should be used within a single action: either
return/throw, or call `reply`.

## Run an action synchronously

`seneca.direct(msg)` runs the matching action on the current stack and
returns the action's return value (not the value given to `reply`, so
write such actions to `return` their result):

```js
seneca.add('role:util,cmd:slug', function (msg) {
  return { slug: msg.text.toLowerCase().replace(/\s+/g, '-') }
})

const { slug } = seneca.direct('role:util,cmd:slug', { text: 'Hello World' })
```

Child messages submitted by a direct action are still asynchronous.

## Error handling

```js
try {
  await seneca.post('role:shop,cmd:price,item:kiwi')
} catch (err) {
  if ('unknown_item' === err.code) ...
}
```

Unhandled rejections from fire-and-forget `post` calls are reported by
Node.js; either `await` them or attach a `catch`. See
[Handle errors](handle-errors.md).

## Timeouts

A `post` rejects with `action_timeout` when the action does not reply
within `timeout` milliseconds; set `timeout$` on the message for a
different limit.
