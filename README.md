![Seneca](http://senecajs.org/files/assets/seneca-logo.png)
> A Node.js toolkit for Micro-Service Architectures

# seneca
[![npm version][npm-badge]][npm-url] 
[![Build Status][travis-badge]][travis-url]
[![Coverage Status][coveralls-badge]][coveralls-url]
[![Gitter][gitter-badge]][gitter-url]

## About Seneca
_Seneca_ is a toolkit for organizing the business logic of your app. You can break down your app into "stuff that happens", rather than focusing on data models or managing dependencies.

_Seneca_ provides a toolkit for writing micro-services in Node.js.

_Seneca_ provides:

- __pattern matching:__ a wonderfully flexible way to handle business requirements

- __transport independence:__ how messages get to the right server is not something you should have to worry about

- __maturity:__ 5 years in production (before we called it _micro-services_), but was once taken out by [lightning][]

- __plus:__ a deep and wide ecosystem of [plugins][]

Use this module to define commands that work by taking in some JSON, and, optionally, returning some JSON.
The command to run is selected by pattern-matching on the the input JSON.
There are built-in and optional sets of commands that help you build Minimum Viable Products:
data storage, user management, distributed logic, caching, logging, etc.
And you can define your own product by breaking it into a set of commands - "stuff that happens".

That's pretty much it. ;)

## About Seneca Support

- __Node:__ 0.10, 0.12, 4, 5

Seneca's source can be read in an annotated fashion by,

- viewing [online](http://senecajs.org/annotations/seneca.html).
- running `npm run annotate`

The annotated source can be found locally at [./doc/seneca.html]().

If you're using this module, and need help, you can:

- Post a [github issue][],
- Tweet to [@senecajs][],
- Ask on the [Gitter][gitter-url].

If you are new to Seneca in general, please take a look at [senecajs.org][]. We have everything from
tutorials to sample apps to help get you up and running quickly.

## Install
To install, simply use npm.

```
npm install seneca
```

## Test
To run tests, simply use npm:

```
npm run test
```


## Why we built this?

So that it doesn't matter,

   * __who__ _provides_ the functionality,
   * __where__ it _lives_ (on the network),
   * __what__ it _depends_ on,
   * it's __easy__ to _define blocks of functionality_ (plugins!).

So long as _some_ command can handle a given JSON document, you're good.

Here's an example:

```javascript
var seneca = require('seneca')()

seneca.add({ cmd: 'salestax' }, function (args, callback) {
  var rate  = 0.23
  var total = args.net * (1 + rate)
  callback(null, { total: total })
})

seneca.act({ cmd: 'salestax', net: 100 }, function (err, result) {
  console.log(result.total)
})
```

In this code, whenever seneca sees the pattern
`{cmd:'salestax'}`, it executes the function associated
with this pattern, which calculates sales tax. Yah!

The `seneca.add` method adds a new pattern, and the function to execute whenever that pattern occurs.

The `seneca.act` method accepts an object, and runs the command, if any, that matches.

Where does the sales tax rate come from? Let's try it again:

```javascript
seneca.add({ cmd: 'config' }, function (args, callback) {
  var config = {
    rate: 0.23
  }
  var value = config[args.prop]
  callback(null, { value: value })
})

seneca.add({ cmd: 'salestax' }, function (args, callback) {
  seneca.act({ cmd: 'config', prop: 'rate' }, function (err, result) {
    var rate  = parseFloat(result.value)
    var total = args.net * (1 + rate)
    callback(null, { total: total })
  })
})

seneca.act({ cmd: 'salestax', net: 100 }, function (err, result) {
  console.log(result.total)
})
```

The `config` command provides you with your configuration. This is
cool because it doesn't matter _where_ it gets the configuration from
- hard-coded, file system, database, network service, whatever. Did
you have to define an abstraction API to make this work? Nope.

There's a little but too much verbosity here, don't you think? Let's fix that:


```javascript
seneca.act('cmd:salestax,net:100', function (err, result) {
  console.log(result.total)
})
```

Instead of providing an object, you can provide a string using an
[abbreviated form of JSON](//github.com/rjrodger/jsonic). In fact, you
can provide both:

```javascript
seneca.act('cmd:salestax', { net: 100 }, function (err, result) {
  console.log(result.total)
})
```

This is a _very convenient way of combining a pattern and parameter data_.

### Programmer Anarchy

The way to build Node.js systems, is to build lots of little
processes. Here's a great talk explaining why you should do this:
[Programmer Anarchy](http://vimeo.com/43690647).

Seneca makes this really easy. Let's put configuration out on the
network into its own process:

```javascript
seneca.add({ cmd: 'config' }, function (args, callback) {
  var config = {
    rate: 0.23
  }
  var value = config[args.prop]
  callback(null, { value: value })
})

seneca.listen()
```

The `listen`` method starts a web server that listens for JSON
messages. When these arrive, they are submitted to the local Seneca
instance, and executed as actions in the normal way.  The result is
then returned to the client as the response to the HTTP
request. Seneca can also listen for actions via a message bus.

Your implementation of the configuration code _stays the same_.

The client code looks like this:


```javascript
seneca.add({ cmd: 'salestax' }, function (args, callback) {
  seneca.act({cmd: 'config', prop: 'rate' }, function (err, result) {
    var rate  = parseFloat(result.value)
    var total = args.net * (1 + rate)
    callback(null, { total: total })
  })
})

seneca.client()

seneca.act('cmd:salestax,net:100', function (err, result) {
  console.log(result.total)
})
```

On the client-side, calling `seneca.client()` means that Seneca will
send any actions it cannot match locally out over the network. In this
case, the configuration server will match the `cmd:config` pattern and
return the configuratin data.

Again, notice that your sales tax code _does not change_. It does not
need to know where the configuration comes from, who provides it, or
how.

You can do this with every command.

### Keeping the Business Happy

The thing about business requirements is that they have no respect for
common sense, logic or orderly structure. The real world is messy.

In our example, let's say some countries have single sales tax rate,
and others have a variable rate, which depends either on locality, or product category.

Here's the code. We'll rip out the configuration code for this example.

```javascript
// fixed rate
seneca.add({ cmd: 'salestax' }, function (args, callback) {
  var rate  = 0.23
  var total = args.net * (1 + rate)
  callback(null, { total: total })
})


// local rates
seneca.add({ cmd: 'salestax', country: 'US' }, function (args, callback) {
  var state = {
    'NY': 0.04,
    'CA': 0.0625
    // ...
  }
  var rate = state[args.state]
  var total = args.net * (1 + rate)
  callback(null, { total: total })
})


// categories
seneca.add({ cmd: 'salestax', country: 'IE' }, function (args, callback) {
  var category = {
    'top': 0.23,
    'reduced': 0.135
    // ...
  }
  var rate = category[args.category]
  var total = args.net * (1 + rate)
  callback(null, { total: total })
})


seneca.act('cmd:salestax,net:100,country:DE', function (err, result) {
  console.log('DE: ' + result.total)
})

seneca.act('cmd:salestax,net:100,country:US,state:NY', function (err, result) {
  console.log('US,NY: ' + result.total)
})

seneca.act('cmd:salestax,net:100,country:IE,category:reduced', function (err, result) {
  console.log('IE: ' + result.total)
})

```

In this case, you provide different implementations for different
patterns. This lets you isolate complexity into well-defined
places. It also means you can deal with special cases very easily.


## Examples

For more examples of Seneca in action, take a look at:

   * [seneca-examples](//github.com/senecajs/seneca-examples)
   * [nodezoo.com](//nodezoo.com/#q=seneca)
   * [Well!](//github.com/nearform/well)


## Contributing
The [Senecajs org][] __encourages open participation__. If you feel you can help in any way, be it with
bug reporting, documentation, examples, extra testing, or new features feel free to [create an issue][github issue],
or better yet, [submit a pull request][github pull request].

We have 2 main forms of documention for getting started with contributing:
  - [Our very brief, and to the point, contributing.md](./CONTRIBUTING.md)
  - [Our much more comprehensive contributing documentation.][contributing]

## License
Copyright Richard Rodger and other contributors 2015, Licensed under [MIT][].

[travis-badge]: https://travis-ci.org/senecajs/seneca.svg
[travis-url]: https://travis-ci.org/senecajs/seneca
[coveralls-badge]: https://coveralls.io/repos/senecajs/seneca/badge.svg?branch=master&service=github
[coveralls-url]: https://coveralls.io/github/senecajs/seneca?branch=master
[gitter-badge]: https://badges.gitter.im/Join%20Chat.svg
[gitter-url]: https://gitter.im/senecajs/seneca
[npm-badge]: https://badge.fury.io/js/seneca.svg
[npm-url]: https://badge.fury.io/js/seneca

[MIT]: ./LICENSE
[Senecajs org]: https://github.com/senecajs/
[senecajs.org]: http://senecajs.org/
[github issue]: https://github.com/senecajs/seneca/issues
[github pull request]: https://github.com/senecajs/seneca/pulls
[@senecajs]: http://twitter.com/senecajs
[lightning]: http://aws.amazon.com/message/67457/
[plugins]: https://github.com/search?utf8=%E2%9C%93&q=seneca&type=Repositories&ref=searchresults
[contributing]: http://senecajs.org/contribute/
