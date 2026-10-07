# Writing a plugin

In this tutorial you will build a complete plugin: options with
defaults and validation, asynchronous initialization, exports, plugin
specific errors, and a test. The finished files are in
[docs/examples/plugin](../examples/plugin/).

You should have completed [Getting started](getting-started.md).

## 1. The plugin function

A plugin is a function that receives options and adds actions to
`this`. Create `tax.js`:

```js
function tax(options) {
  const seneca = this

  seneca.add('role:tax,cmd:rate', function (msg, reply) {
    reply({ country: msg.country, rate: options.rates[msg.country] })
  })
}

module.exports = tax
```

and use it:

```js
const Seneca = require('seneca')
const tax = require('./tax')

Seneca({ log: 'warn' })
  .use(tax, { rates: { EU: 0.2 } })
  .act('role:tax,cmd:rate,country:EU', Seneca.util.print)
// { country: 'EU', rate: 0.2 }
```

The function's name, `tax`, is the plugin's name. It appears in logs
and in the identifiers of the plugin's actions (`tax/action/3`).

## 2. Defaults and validation

Users of the plugin should not have to supply every option, and
mistakes should be caught early. Attach a `defaults` object to the
function:

```js
tax.defaults = ({ valid }) => ({
  rates: valid.Open({ EU: 0.2 }),
  precision: 2,
  load: valid.Skip(Function),
})
```

`defaults` is also a validation shape, using
[Gubu](https://github.com/rjrodger/gubu) (available as `seneca.valid`
and passed to the function as `valid`):

* `precision: 2` means "a number, default 2".
* `valid.Open({ EU: 0.2 })` means "an object with at least `EU`,
  default 0.2, and any other keys" (`Open` allows keys the shape does
  not list).
* `valid.Skip(Function)` means "optional, and a function if present".

A `use` call with `{ precision: 'two' }` now fails at startup with an
`invalid_plugin_option` error that names the property. Plugin loading
errors are fatal by default: a service with a misconfigured plugin
should not start.

Options can also come from the instance options, under `plugin.tax`,
which is how deployments configure plugins without touching code:

```js
Seneca({ plugin: { tax: { rates: { US: 0.07 } } } }).use(tax)
```

## 3. Child messages and promises

Actions can send messages to other actions, including the plugin's own.
Add an action that computes a total, written as an async function with
`seneca.message`:

```js
seneca.message('role:tax,cmd:total', async function (msg) {
  const { rate } = await this.post('role:tax,cmd:rate', { country: msg.country })
  const total = msg.net * (1 + rate)
  return { net: msg.net, country: msg.country, total: round(total, options.precision) }
})
```

`this.post` inside an action records the new message as a child of the
current one, so logs and traces show the relationship.

## 4. Errors with meaning

Replying with `new Error('...')` works, but callers can only inspect the
text. Give the plugin its own error codes:

```js
tax.errors = {
  unknown_country: 'No tax rate is known for country <%=country%>.',
}
```

and use them inside actions with `seneca.error(code, details)` (to
reply) or `seneca.fail(code, details)` (to throw):

```js
seneca.add('role:tax,cmd:rate', function (msg, reply) {
  const rate = rates[msg.country]
  if (null == rate) {
    return reply(seneca.error('unknown_country', { country: msg.country }))
  }
  reply({ country: msg.country, rate })
})
```

The caller receives an `Error` with `code: 'unknown_country'` and
`message: 'seneca: No tax rate is known for country XX.'`. The
`<%=country%>` placeholder is filled from the details object.

## 5. Asynchronous initialization

Plugins often need to load data or open connections before they can
serve messages. `seneca.prepare(asyncFn)` registers initialization work
that runs after the definition function and before the plugin is
considered loaded (so before `seneca.ready` fires and before the next
plugin loads):

```js
const rates = { ...options.rates }

seneca.prepare(async function () {
  if (options.load) {
    Object.assign(rates, await options.load())
  }
})
```

If initialization throws, the error is fatal (`plugin_init`), and so is
not finishing within the instance timeout (`plugin_init_timeout`). The
callback form `seneca.init(function (done) { ... done() })` does the same
job for callback style code.

## 6. Exports

A plugin can share values that are not messages, such as the live
`rates` object, by returning them as exports:

```js
return {
  exports: { rates },
}
```

Other code reads them with `seneca.export('tax/rates')`. Keep exports
for plumbing (connections, helpers, configuration); business operations
belong in messages, which can be moved across processes.

## 7. The finished plugin

```js
function tax(options) {
  const seneca = this
  const rates = { ...options.rates }

  seneca.add('role:tax,cmd:rate', function (msg, reply) {
    const rate = rates[msg.country]
    if (null == rate) {
      return reply(seneca.error('unknown_country', { country: msg.country }))
    }
    reply({ country: msg.country, rate })
  })

  seneca.message('role:tax,cmd:total', async function (msg) {
    const { rate } = await this.post('role:tax,cmd:rate', { country: msg.country })
    const total = msg.net * (1 + rate)
    return { net: msg.net, country: msg.country, total: round(total, options.precision) }
  })

  seneca.prepare(async function () {
    if (options.load) {
      Object.assign(rates, await options.load())
    }
  })

  return {
    exports: { rates },
  }
}

tax.defaults = ({ valid }) => ({
  rates: valid.Open({ EU: 0.2 }),
  precision: 2,
  load: valid.Skip(Function),
})

tax.errors = {
  unknown_country: 'No tax rate is known for country <%=country%>.',
}

function round(value, precision) {
  const factor = Math.pow(10, precision)
  return Math.round(value * factor) / factor
}

module.exports = tax
```

Using it:

```js
const Seneca = require('seneca')
const tax = require('./tax')

async function main() {
  const seneca = Seneca({ log: 'warn' }).use(tax, {
    rates: { US: 0.07 },
    load: async () => ({ IE: 0.23 }),
  })

  await seneca.ready()

  console.log(await seneca.post('role:tax,cmd:rate,country:EU'))
  // { country: 'EU', rate: 0.2 }
  console.log(await seneca.post('role:tax,cmd:total,country:IE,net:100'))
  // { net: 100, country: 'IE', total: 123 }

  try {
    await seneca.post('role:tax,cmd:rate,country:XX')
  } catch (err) {
    console.log(err.code, '-', err.message)
    // unknown_country - seneca: No tax rate is known for country XX.
  }

  console.log('exported rates:', seneca.export('tax/rates'))
  // exported rates: { EU: 0.2, US: 0.07, IE: 0.23 }

  await seneca.close()
}

main()
```

## 8. Testing the plugin

Seneca's test mode gives readable logs and routes errors to your test
framework. With the Node.js test runner, create `tax.test.js`:

```js
const { test } = require('node:test')
const assert = require('node:assert/strict')

const Seneca = require('seneca')
const tax = require('./tax')

test('rate and total', async () => {
  const seneca = Seneca().test().use(tax, { rates: { US: 0.07 } })
  await seneca.ready()

  assert.deepEqual(await seneca.post('role:tax,cmd:rate,country:US'), {
    country: 'US',
    rate: 0.07,
  })
  assert.deepEqual(await seneca.post('role:tax,cmd:total,country:EU,net:100'), {
    net: 100,
    country: 'EU',
    total: 120,
  })

  await seneca.close()
})

test('unknown country', async () => {
  const seneca = Seneca().test().quiet().use(tax)
  await seneca.ready()

  await assert.rejects(seneca.post('role:tax,cmd:rate,country:XX'), (err) => {
    assert.equal(err.code, 'unknown_country')
    assert.match(err.message, /country XX/)
    return true
  })

  await seneca.close()
})

test('invalid options are rejected', async () => {
  const seneca = Seneca({ log: 'silent', debug: { undead: true } })
  const failed = new Promise((resolve) => seneca.error((err) => { resolve(err) }))

  seneca.use(tax, { precision: 'two' })

  const err = await failed
  assert.equal(err.code, 'invalid_plugin_option')
})
```

Run it with `node --test`. Notes:

* `Seneca().test()` enables test mode: readable logs at level `warn`
  and callpoints in errors. `.quiet()` silences the expected error log
  in the second test.
* The third test asserts a *fatal* error. `debug.undead` keeps the
  process alive, and `seneca.error(fn)` receives the error.
* Always `close()` instances you create, so that the test process can
  exit.

## 9. Publishing

Conventions for plugins published to npm:

* Name the package `seneca-<name>` or `@seneca/<name>`; users can then
  load it with `seneca.use('<name>')`.
* Export the plugin function as the module's main export, with
  `defaults` and `errors` attached.
* Use a `role:<name>` (or `sys:<name>`) property in your patterns so
  that they do not collide with other plugins.
* Document the patterns the plugin handles and the exports it provides.

## Where next

* [Plugin definition reference](../reference/plugins.md) specifies
  everything a plugin can do, including tags for loading a plugin
  several times, `preload`, `destroy` and `depends`.
* [Manage plugins](../how-to/manage-plugins.md) covers dependencies,
  tags, ignoring plugins and load order in applications.
* [Plugins and composition](../explanation/plugins-and-composition.md)
  explains the design.
