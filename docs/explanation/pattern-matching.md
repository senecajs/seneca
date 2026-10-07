# Pattern matching

Pattern matching is how Seneca decides which action handles a message.
This page explains the model and its consequences; the precise rules
are in the [Patterns reference](../reference/patterns.md).

## Patterns as sets of properties

A pattern is a set of property name and value pairs: `role:shop,cmd:get`.
A message matches a pattern when it has all of the pattern's properties
with the same values. Properties the pattern does not mention are
ignored, so a pattern is a *filter*, not a schema: `role:shop,cmd:get`
matches `{ role: 'shop', cmd: 'get', id: 1 }` as well as
`{ role: 'shop', cmd: 'get', id: 2, verbose: true }`.

Because matching looks only at the listed properties, the extra
properties are the message's *data*, and the matched properties are its
*type*. The same object carries both; there is no envelope.

## Specificity

When several patterns match a message, the one with the most properties
wins. This is what lets a general action coexist with specialized ones:

```js
seneca.add('cmd:salestax', general)                 // 1 property
seneca.add('cmd:salestax,country:US', byState)      // 2 properties
seneca.add('cmd:salestax,country:US,state:NY', ny)  // 3 properties
```

A message `cmd:salestax,country:US,state:NY,net:100` matches all three;
the third runs. A message for Texas matches the first two; the second
runs. A message without a country runs the first.

Specificity is counted, not ordered: it does not matter in which order
the actions were added, or which properties they use. When two matching
patterns have the same number of properties, the tie is resolved
deterministically by property name order (see the reference), but code
that relies on this is usually better expressed with an extra property.

## Values are strings

Pattern values are compared as strings. `cmd:1` and `{ cmd: 1 }` are the
same pattern, and a message `{ cmd: '1' }` matches it. Only scalar
values (strings, numbers, booleans) take part in matching; an object or
function value in a pattern is a validation rule for the matching
message, not a match criterion. Glob values (`cmd:*`) match any value,
with exact values taking precedence.

## No match

A message that matches nothing is an error (`act_not_found`), unless a
default result is supplied (`default$`), the instance is configured to
reply with an empty object (`strict.find: false`), or a catch-all action
(the empty pattern) exists. Transport clients without pins are
catch-all actions: anything the local instance cannot handle is sent to
the remote side.

## Overriding and priors

Adding an action for a pattern that already has one does not replace
it. The new action becomes current, and the old one becomes its
*prior*, which the new action may call with `this.prior(msg, reply)`.
Priors form a chain in the order the actions were added, so the last
plugin loaded gets the first say. This is the mechanism for extending
behaviour (validation, caching, auditing, feature flags) without
editing the original code; see
[Extend actions with priors](../how-to/extend-actions-with-priors.md).

The option `strict.add` decides which existing action becomes the prior
of a new one: only an exact pattern match (strict), or the most specific
existing match (the default, so that `cmd:salestax,country:US` has
`cmd:salestax` as its prior).

## Why this works well for services

* A service exposes a set of patterns, not an API of named functions.
  Adding a pattern is backwards compatible by construction.
* Callers can send a message without knowing whether it will be handled
  locally, remotely, or by a chain of plugins.
* Business rules map directly onto patterns. Reading the list of
  patterns (`seneca.list()`) describes what a service does.
* Test doubles are trivial: add a more specific pattern, or a pattern
  with the same properties, in the test.
