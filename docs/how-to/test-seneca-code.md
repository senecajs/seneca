# Test Seneca code

How to write unit tests for actions and plugins with the Node.js test
runner (the same approach works with any test framework).

## Create a test instance

```js
const { test } = require('node:test')
const assert = require('node:assert/strict')
const Seneca = require('seneca')

test('price', async () => {
  const seneca = Seneca().test().use(shop)
  await seneca.ready()

  const result = await seneca.post('role:shop,cmd:price,item:apple,quantity:2')
  assert.deepEqual(result, { item: 'apple', quantity: 2, total: 1 })

  await seneca.close()
})
```

`seneca.test()` enables test mode: a readable log format at level
`warn`, calling code locations in log entries and errors, and the
caller's location attached to every message. Pass `'print'` to see every
message (`seneca.test('print')`). `Seneca.test()` is shorthand for
`Seneca().test()`.

Close every instance you create so that the test process exits; test
instances hold no sockets, but a plugin may.

## Fail the test on unexpected errors

With callback style tests, pass the completion callback to `test`:

```js
test('price', (t, done) => {
  const seneca = Seneca().test(done).use(shop)

  seneca.act('role:shop,cmd:price,item:apple,quantity:2', function (err, result) {
    assert.equal(err, null)
    assert.equal(result.total, 1)
    seneca.close(done)
  })
})
```

The callback becomes the error handler, so an error anywhere in the
instance (an action, a plugin, a timeout) fails the test with that
error. Note that an error handler that returns a truthy value suppresses
the action callback; a plain `done` returns nothing.

## Silence expected errors

When a test exercises an error path, the `error` level entries clutter
the output. Turn logging off for that instance:

```js
const seneca = Seneca().test().quiet()
```

## Replace dependencies

Actions are the unit of substitution. To isolate the code under test,
add a more specific or identical pattern that replies with canned data:

```js
const seneca = Seneca().test().use(shop).use(tax)

// stub the tax lookup used by shop
seneca.add('role:tax,cmd:rate', function (msg, reply) {
  reply({ country: msg.country, rate: 0.1 })
})
```

An action added after a plugin becomes the current handler for its
pattern; the plugin's action is its prior. To call the real one for
some cases, use `this.prior(msg, reply)` in the stub.

## Test fatal behaviour

Plugin failures are fatal and would exit the process. Keep it alive and
capture the error:

```js
test('bad options', async () => {
  const seneca = Seneca({ log: 'silent', debug: { undead: true } })
  const failed = new Promise((resolve) => seneca.error((err) => { resolve(err) }))

  seneca.use(shop, { prices: 'not an object' })

  const err = await failed
  assert.equal(err.code, 'invalid_plugin_option')
})
```

To assert on the exit code instead, replace `system.exit`.

## Control time

Set short timeouts so that timeout paths run quickly:

```js
const seneca = Seneca({ timeout: 100 }).test().quiet()
seneca.add('a:1', (msg, reply) => { /* never replies */ })
await assert.rejects(seneca.post('a:1'), { code: 'action_timeout' })
```

Give slow tests more room with the test runner's own timeout option,
not Seneca's.

## Test command line and environment handling

The options `debug.argv` and `debug.env` replace `process.argv` and
`process.env`:

```js
const seneca = Seneca({
  debug: {
    argv: ['node', 'script', '--seneca.log=warn', '--seneca.tag=t0'],
    env: { SENECA_OPTIONS: 'timeout:777' },
  },
})
assert.equal(seneca.options().timeout, 777)
```

## Inspect what happened

* `seneca.on('log', fn)` receives every log entry, including `act/IN`,
  `act/OUT` and `act/ERR`, which is a convenient way to assert that an
  action ran.
* `seneca.explain(true)` before the calls and `seneca.explain(false)`
  after returns a detailed record of every message (see
  [Debug and inspect](debug-and-inspect.md)).
* `seneca.list()` and `seneca.find(pattern)` check that a plugin added
  the expected patterns.

## Run Seneca's own tests

The Seneca repository uses `node --test`:

```sh
npm test                      # all tests, with coverage
npm run test-some -- close    # tests whose names match
```
