# Validate messages and options

How to declare what a message must contain, and how to validate plugin
and instance options. Validation uses [Shape](https://github.com/rjrodger/shape)
shapes, available as `seneca.valid` (and `Seneca.valid`). Shapes built
with Gubu, Shape's predecessor, are rejected.

## Validate message properties

Add rules to the pattern. A rule is a property whose value is an object,
a type constructor or a Shape builder; scalar values remain pattern
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

## Write a validator plugin

A plugin can validate messages with another library, as @seneca/joi does
with Joi. It returns an `extend.action_modifier` function, which Seneca
calls with the action definition of every action added after the plugin
has loaded. Return it from the plugin's `preload` function instead to
also cover actions added right after `seneca.use`, before the plugin's
definition has run. The modifier sets `actdef.validate`, a
function `(msg, done)` that calls `done(err)` with an error to reject the
message, or `done()` to accept it. It must call `done` before it
returns: Seneca does not wait for a later call.

Seneca compiles the rules of a pattern (its object and function valued
properties) into its own message shape, `actdef.shape`, and validates
with that shape whenever it is present; `actdef.validate` is called only
when there is no shape. So a modifier that takes over the validation of
an action deletes `actdef.shape`:

```js
function myvalidator(options) {
  return {
    extend: {
      action_modifier: function (actdef) {
        const rules = actdef.rules
        if (!uses_my_library(rules)) return // leave the action to Seneca

        delete actdef.shape
        actdef.validate = function (msg, done) {
          const err = check_with_my_library(rules, msg)
          done(err) // an error rejects the message with act_invalid_msg
        }
      },
    },
  }
}
```

Modifiers run on the next tick after `add`, and must not throw: an
exception there is not caught by Seneca and stops the process.

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

Commonly used Shape builders: `Required`, `Skip`, `Default`, `Open`,
`Closed`, `One`, `Some`, `All`, `Any`, `Exact`, `Check`, `Min`, `Max`,
`Len`, `Rename`, `Empty`, `Never`. See the Shape documentation for the
complete list.
