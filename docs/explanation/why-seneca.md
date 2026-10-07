# Why Seneca

Seneca is a toolkit for writing microservices and for organizing the
business logic of an application. Its central idea is that an
application can be described as *stuff that happens*: a set of
messages, each handled by some piece of code, rather than as a set of
objects, data models or module dependencies.

## Messages, not method calls

In most codebases, a feature is a function that other code calls by
name. The caller must know where the function lives, what it is
called, and how to get hold of it. Seneca replaces this with a message:
a plain JSON-like object such as

```js
{ role: 'shop', cmd: 'price', item: 'apple' }
```

The caller does not name a function. It describes what should happen,
and Seneca finds the code that handles it by *pattern matching* on the
message's properties (see [Pattern matching](pattern-matching.md)).

This decoupling is the source of the three properties Seneca is built
around:

* **Who** provides the functionality does not matter. Any code that
  adds an action for the pattern can handle the message.
* **Where** it lives does not matter. A message can be handled in the
  same process, or sent to another process by a transport, without
  changing the caller or the handler (see
  [Transport independence](transport-independence.md)).
* **What** it depends on does not matter to callers. Handlers can be
  replaced, extended or specialized without the caller knowing.

## Specialization instead of branching

Business requirements rarely form a tidy hierarchy. A sales tax
calculation may have one rule in general, another for a country, and
another for a product category in that country. With pattern matching,
each case is a separate action with a more specific pattern:

```js
seneca.add('cmd:salestax', general)
seneca.add('cmd:salestax,country:US', byState)
seneca.add('cmd:salestax,country:IE', byCategory)
```

The most specific matching pattern wins, so the special cases live in
their own well-defined places instead of as branches inside one
function, and new cases are added without touching existing code.

## Composition with plugins

Related actions are grouped into plugins: functions that add a set of
actions to an instance. Plugins are the unit of reuse and of
deployment: the same plugin can be loaded into a single process during
development and spread across several processes in production. Plugins
can also *extend* each other, because adding an action for an existing
pattern does not replace the existing action; it becomes a prior that
the new action can call. See [Plugins and composition](plugins-and-composition.md).

## Programmer anarchy

Small, independent pieces of functionality that communicate by messages
can be built, deployed and replaced independently, by different people,
at different times, using different techniques. Seneca's job is to make
the messaging, matching, composition and transport concerns disappear
so that this way of working is practical: a service is some actions and
a transport configuration, and nothing else.

## What Seneca is not

Seneca does not prescribe a wire protocol, a database, a web framework
or a deployment platform. Those are provided by plugins, chosen per
project. The core is the pattern matcher, the message pipeline, the
plugin system and the transport plumbing described in this
documentation.
