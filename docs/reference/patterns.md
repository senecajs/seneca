# Patterns reference

A *pattern* is a set of property names and values. An action is added
for a pattern, and a message is handled by the action whose pattern it
matches most specifically.

## Writing patterns

Patterns are given as objects or as [Jsonic](https://github.com/jsonicjs/jsonic)
strings. Jsonic is a relaxed JSON: no outer braces, unquoted keys and
simple values, `,` between pairs.

```js
seneca.add({ role: 'shop', cmd: 'get' }, action)
seneca.add('role:shop,cmd:get', action)
```

Both forms can be combined: a string followed by an object, with the
object's properties merged over the string's.

```js
seneca.add('role:shop', { cmd: 'get' }, action)
seneca.act('role:shop,cmd:get', { id: 123 }, callback)
```

Only scalar values (strings, numbers, booleans) are pattern values. A
property whose value is an object or a function is a validation rule
(below), and properties whose names end in `$` are directives
(see [Message directives](message-directives.md)).

### Canonical form

Seneca normalizes a pattern to a string of `key:value` pairs sorted by
key and joined with commas: `{ cmd: 'get', role: 'shop' }` becomes
`cmd:get,role:shop`. Values are compared as strings, so `a:1` and
`{ a: 1 }` are the same pattern, and a message `{ a: '1' }` matches it.
`seneca.util.pattern(obj)` returns the canonical form.

### The empty pattern

`seneca.add('', action)` (or `{}`) adds a catch-all action that handles
any message no other pattern matches.

## Matching

Matching is performed by [patrun](https://github.com/rjrodger/patrun):

1. A pattern matches a message when every property of the pattern is
   present in the message with the same (string) value. Extra message
   properties are ignored.
2. Among matching patterns, the one with the most properties wins.
3. Among matching patterns with the same number of properties, patrun
   walks property names in alphabetical order, so the pattern that fixes
   the alphabetically earlier property wins: for a message `a:1,b:1,c:1`
   with actions `a:1,b:1` and `a:1,c:1`, the `a:1,b:1` action runs.
4. If nothing matches, the catch-all action runs if there is one;
   otherwise the message fails with `act_not_found` (or gets a `default$`
   result, or `{}` when `strict.find` is false).

A new action for a pattern that already exists does not replace the
existing one: it becomes the current action and the existing one becomes
its *prior*, callable with `this.prior(msg, reply)` (see
[Extend actions with priors](../how-to/extend-actions-with-priors.md)).
Which existing action becomes the prior is controlled by `strict.add`.

### Wildcards

Pattern values may contain the glob characters `*` (any characters) and
`?` (one character). A pattern with a glob value matches messages whose
value fits the glob. Exact values are preferred over globs: with actions
`x:1` and `x:*`, a message `x:1` runs the first and `x:2` the second.

A glob pattern and an exact pattern for the same property form two
branches. A message whose value equals an exact pattern value is routed
into that branch; if the rest of the message does not match any pattern
there, the glob pattern is not tried, and the message is unmatched. For
example, with actions `role:shop,cmd:*` and
`role:shop,cmd:price,item:sample`, a message `role:shop,cmd:price,item:apple`
fails with `act_not_found`.

Globs are also used in queries: `seneca.list('role:shop,cmd:*')`,
`seneca.wrap('role:shop,cmd:*', wrapper)` and transport pins such as
`pin: 'role:shop,cmd:*'`. In `wrap`, `d:*` means "the pattern has a `d`
property with any value".

## Pins

A *pin* is a pattern used to select a set of actions, typically for
transports: `pin: 'role:shop,cmd:*'`. Several pins are given as an
array, or as one string separated by `;`: `'role:shop;role:cart'`.
`seneca.util.pins(pin)` returns the array of pattern objects, and
`seneca.util.pincanon(pin)` their canonical string.

## Validation rules

Object and function values in a pattern are compiled into a
[Gubu](https://github.com/rjrodger/gubu) shape that validates the
message before the action runs (when `valid.message` is on):

```js
seneca.add({ role: 'shop', cmd: 'get', id: Number }, action)
seneca.add('role:shop,cmd:put', { item: { name: String, price: Number } }, action)

const { Required, Default } = seneca.valid
seneca.add({ role: 'shop', cmd: 'find', query: Required({}), limit: Default(10) }, action)
```

A failing message gets an `act_invalid_msg` error whose
`details.props` lists the failures. Defaults in the shape are applied to
the message. Rules with a `$_root` property (Joi schemas) are not
compiled; validation of those requires a plugin.

The rules are recorded on the action definition as `rules`. An action
function's `validate` property is also merged into `rules` (for
documentation tools) but is not enforced.

## Inspecting patterns

* `seneca.has(pattern)`: true if an action exists for exactly this
  pattern.
* `seneca.find(pattern, { exact: true })`: the action definition for the
  pattern; without `exact`, the definition that would handle a message
  with these properties.
* `seneca.list(pattern)`: the patterns of all actions that match the
  query pattern (globs allowed); `seneca.list()` lists all patterns.
