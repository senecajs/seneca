# Module exports, instance properties and utilities

## The module

```js
const Seneca = require('seneca')
```

| Export | Purpose |
| ------ | ------- |
| `Seneca(options?, moreOptions?)` | Create an instance. `moreOptions` is deep merged over `options`. A string is an options file path: `Seneca('./conf.js')` is `Seneca({ from: './conf.js' })`. See [Options](options.md). |
| `Seneca.use(...)` | Create an instance and call `use` on it; returns the instance. |
| `Seneca.test(...)` | Create an instance and call `test` on it. |
| `Seneca.quiet(...)` | Create an instance and call `quiet` on it. |
| `Seneca.util` | Utility functions (below); also available as `seneca.util`. |
| `Seneca.valid` | The [Shape](https://github.com/rjrodger/shape) builder (`Required`, `Default`, `Skip`, `Open`, ...); also `seneca.valid`. |
| `Seneca.Seneca` | The instance constructor (prototype), for extension. |
| `Seneca.test$` | Internals exposed for Seneca's own tests. |

See [TypeScript](#typescript) for the types.

## Instance properties

| Property | Meaning |
| -------- | ------- |
| `id` | Instance identifier: `<random>/<start time>/<pid>/<version>/<tag>`, or the `id$` option, or `<random>/<tag>` with `debug.short_logs` (and in test mode when a tag is set: `<4 chars>/<tag>`). |
| `tag` | The instance tag (`'-'` when none). |
| `fullname` | `Seneca/<id>`; also the result of `toString()`. |
| `version` | Seneca version. |
| `start_time` | Creation time in milliseconds. |
| `root` | The root instance (for delegates). |
| `did` | Delegate identifier (delegates only). |
| `fixedargs` | Properties merged into every message submitted through this instance or delegate. |
| `fixedmeta` | Meta data fixed for messages submitted through this delegate (`custom`, `gate`, `fatal`, `local`, `direct`). |
| `context` | Free form object for contextual data; copied into delegates. |
| `flags.closed` | True once `close()` has run. |
| `order` | The Ordu pipelines: `order.add`, `order.inward`, `order.outward`, `order.plugin`. |
| `argv` | The parsed `--seneca.*` command line arguments. |
| `log` | Logging function and level methods (see [Logging](logging.md)). |
| `die(err)` | Trigger a fatal error. |
| `idgen()` | Generate a random identifier of `idlen` characters. |
| `isSeneca` | `true` (prototype property). |
| `private$` | Internal state. Not part of the API. |
| `plugin`, `shared` | Inside a plugin or its actions: the plugin record and the plugin's shared object. |

Instances are event emitters (see [Events](events.md)) and serialize to
`{ isSeneca, id, did, fixedargs, fixedmeta, start_time, version }` with
`JSON.stringify` and `util.inspect`.

## `Seneca.util`

| Function | Purpose |
| -------- | ------- |
| `pattern(obj)` | Canonical pattern string of an object (`$` keys, object and function values omitted; keys sorted). A string is returned unchanged. |
| `pincanon(pin)` | Canonical string of a pin (string, object or array; arrays are sorted and joined with `;`). |
| `pins(pin)` | Array of pattern objects from a pin (strings may contain several patterns separated by `;`). |
| `clean(obj)` | Shallow copy without properties whose names end in `$`. |
| `deep(...objs)` | Deep merge, later arguments override earlier ones (`lodash.defaultsdeep` in reverse); returns a new object. `deepextend` is a deprecated alias. |
| `error(code, details)` | Create a Seneca error (see [Error codes](error-codes.md)). |
| `print(err, result)` | Callback for `act` that prints the error or the result; `seneca.act('a:1', Seneca.util.print)`. |
| `resolve_option(value, options)` | Return `value(options)` when `value` is a function, otherwise `value`. |
| `router()` | A new Patrun router. |
| `flatten(list, prop)` | Legacy list flattening. Deprecated; removed in Seneca 5. |
| `Jsonic`, `Patrun`, `Gex`, `Shape`, `Nid`, `Eraro` | The underlying libraries: Jsonic string parsing, pattern routing, glob matching, shape validation, id generation, error construction. |

`seneca.util.Jsonic('a:1,b:x')` parses a Jsonic string;
`seneca.util.Jsonic.stringify(obj)` produces one.

## TypeScript

The package includes its declarations (`seneca.d.ts`). The module
exports the factory as `module.exports`, and the declarations use
`export =` to match:

```ts
import Seneca from 'seneca' // ES modules, or CommonJS with esModuleInterop
import Seneca = require('seneca') // CommonJS without esModuleInterop

const seneca: Seneca.Instance = Seneca({ timeout: 2222 })
```

The `Seneca` namespace exports the public types: `Instance`, `Options`,
`Msg`, `Pattern`, `Result`, `Meta`, `Reply`, `ActionFunc`,
`MessageFunc`, `ActCallback`, `SubFunc`, `ActDef`, `Plugin`,
`PluginDefine`, `PluginDesc`, `PluginRecord`, `Logger` and `Util`. They
can also be imported by name: `import type { Instance } from 'seneca'`.

`this` is a `Seneca.Instance` inside actions, callbacks and plugin
definitions. Deprecated methods and options are marked `@deprecated`.

Plugins that add members to instances, for example with
`seneca.decorate`, declare them by augmenting `Instance`:

```ts
declare module 'seneca' {
  interface Instance {
    make$(name: string): Entity
  }
}
```
