![Logo][]
> A Node.js toolkit for Microservice architectures

| ![Voxgig](https://www.voxgig.com/res/img/vgt01r.png) | This open source module is sponsored and supported by [Voxgig](https://www.voxgig.com). |
|---|---|

# seneca

[![npm version](https://img.shields.io/npm/v/seneca.svg)](https://npmjs.com/package/seneca)
[![NpmFigs][BadgeNpmFigs]][Npm]
[![build](https://github.com/senecajs/seneca/actions/workflows/build.yml/badge.svg)](https://github.com/senecajs/seneca/actions/workflows/build.yml)
[![Coveralls][BadgeCoveralls]][Coveralls]
[![Known Vulnerabilities](https://snyk.io/test/github/senecajs/seneca/badge.svg)](https://snyk.io/test/github/senecajs/seneca)
[![DeepScan][BadgeDeepScan]][DeepScan]
[![CodeClimate][BadgeCodeClimate]][CodeClimate]

- __Lead Maintainer:__ [Richard Rodger][Lead]
- __Sponsor:__ [voxgig][Sponsor]

Seneca is a toolkit for writing microservices and organizing the
business logic of your application. You describe what your system does
as *messages*, and write *actions* that handle them. Which action runs
is decided by pattern matching on the message, so the code that handles
a message, and the process it runs in, can change without changing the
code that sends it.

Seneca provides:

- __pattern matching:__ messages are plain objects, routed to the most
  specific matching action; special cases are new patterns, not branches
- __composition:__ functionality is grouped into plugins that can extend
  each other by overriding patterns and calling the prior action
- __transport independence:__ the same actions run in one process or
  across many, connected by transport plugins
- __maturity:__ in production since 2010, with a deep and wide ecosystem
  of [plugins][]
- __a book:__ a guide to designing microservice architectures: [taomicro][]

## Install

```sh
npm install seneca
```

Seneca 4 requires Node.js 22 or later; Node.js 24 is the default version
used for development, continuous integration and releases (see `.nvmrc`).

Network transports are plugins. For HTTP and TCP install
[seneca-transport](https://github.com/senecajs/seneca-transport) as well.

## Example

```js
const Seneca = require('seneca')

const seneca = Seneca({ log: 'warn' })

// An action for a pattern: any message with role:math and cmd:sum
seneca.add('role:math,cmd:sum', function (msg, reply) {
  reply({ answer: msg.left + msg.right })
})

// A more specific pattern handles a special case
seneca.add('role:math,cmd:sum,integer:true', function (msg, reply) {
  reply({ answer: Math.floor(msg.left) + Math.floor(msg.right) })
})

seneca.act('role:math,cmd:sum,left:1.5,right:2.5', Seneca.util.print)
// { answer: 4 }

seneca.act('role:math,cmd:sum,left:1.5,right:2.5,integer:true', Seneca.util.print)
// { answer: 3 }
```

Promises are built in (`seneca.message` and `seneca.post`), and the same
actions can be served over the network:

```js
Seneca().use(math).use('seneca-transport').listen({ port: 8260, pin: 'role:math,cmd:*' })

const result = await Seneca().use('seneca-transport').client({ port: 8260, pin: 'role:math,cmd:*' })
  .post('role:math,cmd:sum,left:1,right:2')
```

## Documentation

The documentation lives in [docs/](https://github.com/senecajs/seneca/blob/master/docs/README.md)
and is organized in four sections:

- __[Tutorials](docs/README.md#tutorials)__: start with
  [Getting started](docs/tutorials/getting-started.md), then
  [Microservices with transports](docs/tutorials/microservices-with-transports.md)
  and [Writing a plugin](docs/tutorials/writing-a-plugin.md).
- __[How-to guides](docs/README.md#how-to-guides)__: configuring options
  and logging, handling errors, testing, priors, transports, plugins,
  debugging, graceful shutdown, running in production, migrating from
  Seneca 3.
- __[Reference](docs/README.md#reference)__: the
  [instance API](docs/reference/api.md), [options](docs/reference/options.md),
  [patterns](docs/reference/patterns.md),
  [message directives](docs/reference/message-directives.md),
  [plugin definition](docs/reference/plugins.md),
  [logging](docs/reference/logging.md), [error codes](docs/reference/error-codes.md),
  [transport](docs/reference/transport.md) and more, with a
  [feature index](docs/reference/feature-index.md).
- __[Explanation](docs/README.md#explanation)__: [why Seneca](docs/explanation/why-seneca.md),
  [pattern matching](docs/explanation/pattern-matching.md),
  [message lifecycle](docs/explanation/message-lifecycle.md),
  [plugins and composition](docs/explanation/plugins-and-composition.md),
  [transport independence](docs/explanation/transport-independence.md)
  and [the error model](docs/explanation/error-model.md).

Changes between versions are listed in [CHANGES.md](CHANGES.md);
[Migrate from Seneca 3](docs/how-to/migrate-from-seneca-3.md) covers
upgrading.

## Running

```sh
node service.js                   # JSON logs at level info, for log collectors
node service.js --seneca.test     # readable logs with full detail, for development
node service.js --seneca.log=warn # quieter
```

See [Command line and environment](docs/reference/command-line-and-environment.md).

## Support

If you're using this module and need help, you can:

- Post a [github issue][Issue]
- Tweet to [@senecajs][Tweet]
- Ask on the [Gitter][Gitter]

## Contributing

The [Senecajs org][Org] encourages participation. If you feel you can help in any way, be
it with bug reporting, documentation, examples, extra testing, or new features feel free
to [create an issue][Issue], or better yet, [submit a Pull Request][Pull]. For more
information on contribution please see our [Contributing][Contrib] guide.

### Test

The tests use the Node.js built-in test runner (`node:test`) and need
Node.js 22 or later (24 is the default). To run them locally, with a
coverage summary:

```sh
npm test
```

To run only the tests whose names match a pattern:

```sh
npm run test-some -- close
```

To write an lcov coverage report to `coverage/lcov.info`:

```sh
npm run coverage
```

Maintainers: see [Create a release](docs/how-to/create-a-release.md).

## Background

Seneca is sponsored and supported by [Voxgig](https://www.voxgig.com/).

Copyright (c) 2010-2026 Richard Rodger and other contributors;
Licensed under [MIT][Lic].

[BadgeNpmFigs]: https://img.shields.io/npm/dm/seneca.svg?maxAge=2592000
[BadgeCoveralls]: https://coveralls.io/repos/senecajs/seneca/badge.svg?branch=master&service=github
[BadgeDeepScan]: https://deepscan.io/api/teams/5016/projects/6816/branches/59148/badge/grade.svg
[BadgeCodeClimate]: https://api.codeclimate.com/v1/badges/3a95be9ab6432c620bea/maintainability
[CoC]: http://senecajs.org/code-of-conduct
[Contrib]: http://senecajs.org/contribute
[Coveralls]: https://coveralls.io/github/senecajs/seneca?branch=master
[DeepScan]: https://deepscan.io/dashboard#view=project&tid=5016&pid=6816&bid=59148
[CodeClimate]: https://codeclimate.com/github/senecajs/seneca/maintainability
[Gitter]: https://gitter.im/senecajs/seneca
[Issue]: https://github.com/senecajs/seneca/issues/new
[Lead]: https://github.com/rjrodger
[Lic]: ./LICENSE
[Logo]: http://senecajs.org/files/assets/seneca-logo.jpg
[Npm]: https://www.npmjs.com/package/seneca
[Org]: http://senecajs.org/
[Pull]: https://github.com/senecajs/seneca/pulls
[Sponsor]: http://www.voxgig.com
[Tweet]: https://twitter.com/senecajs
[Plugins]: https://github.com/search?utf8=%E2%9C%93&q=seneca&type=Repositories&ref=searchresults
[taomicro]: https://bitly.com/rrtaomicro
