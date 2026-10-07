# Extend actions with priors

How to change the behaviour of an existing action without editing it,
by adding a new action for the same pattern and calling the original as
its *prior*.

## Override a pattern and call the original

```js
seneca.add('role:shop,cmd:price', function (msg, reply) {
  // original implementation
})

// later, in another plugin or file
seneca.add('role:shop,cmd:price', function (msg, reply) {
  this.prior(msg, function (err, result) {
    if (err) return reply(err)
    result.currency = 'EUR'
    reply(result)
  })
})
```

The second `add` becomes the current handler. `this.prior(msg, callback)`
runs the previous one with the same message. With async actions:

```js
seneca.message('role:shop,cmd:price', async function (msg) {
  const result = await this.prior(msg)
  return { ...result, currency: 'EUR' }
})
```

## Modify the message or short-circuit

The prior receives whatever message you pass, so you can adjust it, or
skip the original entirely:

```js
seneca.message('role:shop,cmd:price', async function (msg) {
  if (cache.has(msg.item)) return cache.get(msg.item)
  const result = await this.prior({ ...msg, quantity: Math.max(1, msg.quantity) })
  cache.set(msg.item, result)
  return result
})
```

## Order of priors

Each `add` for a pattern pushes a new action onto the front of the
chain: the action added last runs first, and each `prior` call moves one
step back toward the original. When plugins are involved, the plugin
loaded last gets the message first. `seneca.find(pattern).priorpath`
lists the chain.

## When there is no prior

If the current action has no prior, `this.prior(msg, reply)` replies
with the message's `default$` value, or `null`. Add a pattern first with
no action to create a placeholder that later actions can safely call:

```js
seneca.add('role:shop,cmd:discount')  // placeholder, replies default$ or null
```

## Choose which action becomes the prior

By default the *most specific existing match* becomes the prior, so
adding `role:shop,cmd:price,item:apple` when only `role:shop,cmd:price`
exists makes the general action the prior of the specific one. To only
override exact pattern matches, set the option `strict.add: true` for the
instance, or per pattern:

```js
seneca.add('role:shop,cmd:price,item:apple,strict$:{add:true}', action)
```

## Extend many patterns at once

`seneca.wrap(pin, wrapper)` adds the wrapper as a new action for every
existing pattern matching the pin (globs allowed; `''` for all):

```js
seneca.wrap('role:shop,cmd:*', function (msg, reply) {
  const start = Date.now()
  this.prior(msg, function (err, result) {
    this.log.info({ kind: 'timing', pattern: this.private$.act.def.pattern, ms: Date.now() - start })
    reply(err, result)
  })
})
```

`wrap` only affects patterns that exist when it is called; patterns
added later are not wrapped.

## Keep the original reachable

Overriding is not deleting. The original action remains in the chain
and is called whenever the new action calls `prior`. If you need to
remove behaviour, add an action that does not call `prior`.

## Related

* [Pattern matching](../explanation/pattern-matching.md) explains
  specificity and priors.
* [Plugins and composition](../explanation/plugins-and-composition.md)
  shows how priors let plugins extend each other.
