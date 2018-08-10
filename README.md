![Logo][]
> A Node.js toolkit for Microservice architectures

# seneca
[![Npm][BadgeNpm]][Npm]
[![NpmFigs][BadgeNpmFigs]][Npm]
[![Travis][BadgeTravis]][Travis]
[![Coveralls][BadgeCoveralls]][Coveralls]
[![Gitter][BadgeGitter]][Gitter]

- __Lead Maintainer:__ [Richard Rodger][Lead]
- __Sponsor:__ [voxgig][Sponsor]
- __Node:__ 4.x, 6.x, 8.x, 10.x

Seneca is a toolkit for writing microservices and organizing the
business logic of your app. You can break down your app into "stuff
that happens", rather than focusing on data models or managing
dependencies.

Seneca provides,

- __pattern matching:__ a wonderfully flexible way to handle business requirements

- __transport independence:__ how messages get to the right server is not something you
should have to worry about

- __maturity:__ 8 years in production (before we called it _microservices_), but was
once taken out by [lightning][]

- __plus:__ a deep and wide ecosystem of [plugins][]

- __book:__ a guide to designing microservice architectures: [taomicro][]

Use this module to define commands that work by taking in some JSON,
and, optionally, returning some JSON. The command to run is selected
by pattern-matching on the the input JSON. There are built-in and
optional sets of commands that help you build Minimum Viable Products:
data storage, user management, distributed logic, caching, logging,
etc. And you can define your own product by breaking it into a set of
commands - "stuff that happens".  That's pretty much it.

If you're using this module, and need help, you can:

- Post a [github issue][Issue],
- Tweet to [@senecajs][Tweet],
- Ask on the [Gitter][Gitter].

If you are new to Seneca in general, please take a look at [senecajs.org][Org]. We have
everything from tutorials to sample apps to help get you up and running quickly.

Seneca's source can be read in an annotated fashion by running `npm run annotate`. An
annotated version of each file will be generated in `./docs/`.

## Install
To install via npm,

```
npm install seneca
```

## Quick Example

```js
'use strict'

var Seneca = require('seneca')


// Functionality in seneca is composed into simple
// plugins that can be loaded into seneca instances.


function rejector () {
  this.add('cmd:run', (msg, done) => {
    return done(null, {tag: 'rejector'})
  })
}

function approver () {
  this.add('cmd:run', (msg, done) => {
    return done(null, {tag: 'approver'})
  })
}

function local () {
  this.add('cmd:run', function (msg, done) {
    this.prior(msg, (err, reply) => {
      return done(null, {tag: reply ? reply.tag : 'local'})
    })
  })
}


// Services can listen for messages using a variety of
// transports. In process and http are included by default.


Seneca()
  .use(approver)
  .listen({type: 'http', port: '8260', pin: 'cmd:*'})

Seneca()
  .use(rejector)
  .listen(8270)


// Load order is important, messages can be routed
// to other services or handled locally. Pins are
// basically filters over messages


function handler (err, reply) {
  console.log(err, reply)
}

Seneca()
  .use(local)
  .act('cmd:run', handler)

Seneca()
  .client({port: 8270, pin: 'cmd:run'})
  .client({port: 8260, pin: 'cmd:run'})
  .use(local)
  .act('cmd:run', handler)

Seneca()
  .client({port: 8260, pin: 'cmd:run'})
  .client({port: 8270, pin: 'cmd:run'})
  .use(local)
  .act('cmd:run', handler)


// Output
// null { tag: 'local' }
// null { tag: 'approver' }
// null { tag: 'rejector' }
```


## Running

To run normally, say in a container, use

```sh
$ node microservice.js
```

(where `microservice.js` is a script file that uses Seneca).
Logs are output in JSON format so you can send them to a logging service.

To run in test mode, with human-readable, full debug logs, use:

```
$ node microservice.js --seneca.test
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

seneca.add({cmd: 'salestax'}, function (msg, done) {
  var rate  = 0.23
  var total = msg.net * (1 + rate)
  done(null, {total: total})
})

seneca.act({cmd: 'salestax', net: 100}, function (err, result) {
  console.log(result.total)
})
```

In this code, whenever seneca sees the pattern `{cmd:'salestax'}`, it executes the
function associated with this pattern, which calculates sales tax. There is nothing
special about the property `cmd` . It is simply the property we want to pattern match.
You could look for `foo` for all seneca cares! Yah!

The `seneca.add` method adds a new pattern, and the function to execute whenever that
pattern occurs.

The `seneca.act` method accepts an object, and runs the command, if any, that matches.

Where does the sales tax rate come from? Let's try it again:

```js
seneca.add({cmd: 'config'}, function (msg, done) {
  var config = {rate: 0.23}
  var value = config[msg.prop]
  done(null, {value: value})
})

seneca.add({cmd: 'salestax'}, function (msg, done) {
  seneca.act({cmd: 'config', prop: 'rate'}, function (err, result) {
    var rate  = parseFloat(result.value)
    var total = msg.net * (1 + rate)
    done(null, {total: total})
  })
})

seneca.act({cmd: 'salestax', net: 100}, function (err, result) {
  console.log(result.total)
})
```

The `config` command provides you with your configuration. This is cool because it
doesn't matter _where_ it gets the configuration from - hard-coded, file system,
database, network service, whatever. Did you have to define an abstraction API to make
this work? Nope.

There's a little but too much verbosity here, don't you think? Let's fix that:


```javascript
seneca.act('cmd:salestax,net:100', function (err, result) {
  console.log(result.total)
})
```

Instead of providing an object, you can provide a string using an
[abbreviated form][Jsonic] of JSON. In fact, you
can provide both:

```javascript
seneca.act('cmd:salestax', {net: 100}, function (err, result) {
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
seneca.add({cmd: 'config'}, function (msg, done) {
  var config = {rate: 0.23}
  var value = config[msg.prop]
  done(null, { value: value })
})

seneca.listen()
```

The `listen` method starts a web server that listens for JSON
messages. When these arrive, they are submitted to the local Seneca
instance, and executed as actions in the normal way.  The result is
then returned to the client as the response to the HTTP
request. Seneca can also listen for actions via a message bus.

Your implementation of the configuration code _stays the same_.

The client code looks like this:


```javascript
seneca.add({cmd: 'salestax'}, function (msg, done) {
  seneca.act({cmd: 'config', prop: 'rate' }, function (err, result) {
    var rate  = parseFloat(result.value)
    var total = msg.net * (1 + rate)
    done(null, { total: total })
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
return the configuration data.

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
seneca.add({cmd: 'salestax'}, function (msg, done) {
  var rate  = 0.23
  var total = msg.net * (1 + rate)
  done(null, { total: total })
})


// local rates
seneca.add({cmd: 'salestax', country: 'US'}, function (msg, done) {
  var state = {
    'NY': 0.04,
    'CA': 0.0625
    // ...
  }
  var rate = state[msg.state]
  var total = msg.net * (1 + rate)
  done(null, {total: total})
})


// categories
seneca.add({ cmd: 'salestax', country: 'IE' }, function (msg, done) {
  var category = {
    'top': 0.23,
    'reduced': 0.135
    // ...
  }
  var rate = category[msg.category]
  var total = msg.net * (1 + rate)
  done(null, { total: total })
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

In this case, you provide different implementations for different patterns. This lets you
isolate complexity into well-defined places. It also means you can deal with special
cases very easily.

## Contributing

The [Senecajs org][Org] encourages participation. If you feel you can help in any way, be
it with bug reporting, documentation, examples, extra testing, or new features feel free
to [create an issue][Issue], or better yet, [submit a Pull Request][Pull]. For more
information on contribution please see our [Contributing][Contrib] guide.


### Test
To run tests locally,

```
npm run test
```

To obtain a coverage report,

```
npm run coverage; open docs/coverage.html
```



## License
Copyright (c) 2010-2018 Richard Rodger and other contributors;
Licensed under __[MIT][Lic]__.



[BadgeCoveralls]: https://coveralls.io/repos/senecajs/seneca/badge.svg?branch=master&service=github
[BadgeNpm]: https://badge.fury.io/js/seneca.svg
[BadgeGitter]: https://badges.gitter.im/senecajs/seneca.svg
[BadgeNpmFigs]: https://img.shields.io/npm/dm/seneca.svg?maxAge=2592000
[BadgeTravis]: https://travis-ci.org/senecajs/seneca.svg?branch=master
[CoC]: http://senecajs.org/code-of-conduct
[Contrib]: http://senecajs.org/contribute
[Coveralls]: https://coveralls.io/github/senecajs/seneca?branch=master
[Gitter]: https://gitter.im/senecajs/seneca
[Issue]: https://github.com/senecajs/seneca/issues/new
[Lead]: https://github.com/rjrodger
[Lic]: ./LICENSE
[Logo]: http://senecajs.org/files/assets/seneca-logo.jpg
[Npm]: https://www.npmjs.com/package/seneca
[Org]: http://senecajs.org/
[Pull]: https://github.com/senecajs/seneca/pulls
[Sponsor]: http://www.voxgig.com
[Travis]: https://travis-ci.org/senecajs/seneca?branch=master
[Tweet]: https://twitter.com/senecajs



[Jsonic]: https//github.com/rjrodger/jsonic
[Lightning]: http://aws.amazon.com/message/67457/
[Plugins]: https://github.com/search?utf8=%E2%9C%93&q=seneca&type=Repositories&ref=searchresults
[taomicro]: https://bitly.com/rrtaomicro

