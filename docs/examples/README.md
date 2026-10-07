# Examples

Runnable programs that accompany the [tutorials](../tutorials/). Each
file requires Seneca from this repository (`require('../../..')`); in
your own project use `require('seneca')` instead.

| Directory | Tutorial |
| --------- | -------- |
| `getting-started/` | [Getting started](../tutorials/getting-started.md) |
| `microservices/` | [Microservices with transports](../tutorials/microservices-with-transports.md) (needs `seneca-transport`, a development dependency of this repository, so `npm install` provides it) |
| `plugin/` | [Writing a plugin](../tutorials/writing-a-plugin.md) |

Run an example with Node.js 22 or later, for example:

```sh
node docs/examples/getting-started/01-first-message.js
```
