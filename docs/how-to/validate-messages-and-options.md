# Validate messages and options

How to declare what a message must contain, and how to validate plugin
and instance options. Validation uses [Gubu](https://github.com/rjrodger/gubu)
shapes, available as `seneca.valid` (and `Seneca.valid`).

## Validate message properties

Add rules to the pattern. A rule is a property whose value is an object,
a type constructor or a Gubu builder; scalar values remain pattern
matching values:

```js
seneca.add({ role: 'shop', cmd: 'price', item: String, quantity: Number }, action)
```

Or keep the pattern as a string and give the rules separately:

```js
seneca.add('role:shop,cmd:price', { item: String, quantity: Number }, action)
```

A message that fails validation gets an `act_invalid_msg` error before
the action runs; `err.details.props` lists each problem:

```js
[{ path: 'quantity', what: 'type', type: 'number', value: 'x' }]
```

## Required, optional and default values

```js
const { Required, Skip, Default, Open, Closed } = seneca.valid

seneca.add('role:shop,cmd:order', {
  item: Required(String),        // must be present
  quantity: Default(1),          // number, 1 when missing
  note: Skip(String),            // optional
  options: Open({ gift: false }) // object; unknown keys allowed
}, action)
```

Defaults are written into the message the action receives. Nested
objects work: `{ customer: { id: Required(String), name: String } }`.

Rules are validated when the message arrives, so they also protect
actions exposed over a transport.

## Validate inside the action instead

Use `this.valid` to build a shape and apply it:

```js
seneca.add('role:shop,cmd:price', function (msg, reply) {
  const shape = this.valid({ item: String, quantity: Default(1) })
  const data = shape(this.util.clean(msg))  // throws on failure
  ...
})
```

## Turn validation off

```js
Seneca({ valid: { message: false } })   // no message validation
Seneca({ valid: { plugin: false } })    // no plugin option validation
Seneca({ valid: { option: false } })    // no instance option validation
Seneca({ valid: { active: false } })    // none at all
```

## Validate plugin options

Give the plugin a `defaults` property. It supplies default values and
validates the options passed by `seneca.use` and `options.plugin`:

```js
function shop(options) { ... }

shop.defaults = {
  currency: 'EUR',
  prices: {},
  retries: Number,
}
```

For builders, use a function that receives `valid`:

```js
shop.defaults = ({ valid }) => ({
  currency: 'EUR',
  prices: valid.Open({}),
  load: valid.Skip(Function),
})
```

Invalid options fail at load time with `invalid_plugin_option`, which is
fatal, so a misconfigured service does not start.

## Instance options

The instance options are validated against the reference shape (see
[Options](../reference/options.md)); unknown keys and wrong types are
`invalid_options` errors at construction.

## Builders

Commonly used Gubu builders: `Required`, `Skip`, `Default`, `Open`,
`Closed`, `One`, `Some`, `All`, `Any`, `Exact`, `Check`, `Min`, `Max`,
`Len`, `Rename`, `Empty`, `Never`. See the Gubu documentation for the
complete list.
