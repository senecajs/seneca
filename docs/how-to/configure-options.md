# Configure options

How to set Seneca options from code, files, the environment and the
command line, and how to read them back. The full list of options is in
the [Options reference](../reference/options.md).

## Set options in code

```js
const seneca = Seneca({
  tag: 'orders',
  timeout: 5000,
  log: 'warn',
  plugin: {
    tax: { rates: { EU: 0.2 } },
  },
})
```

Two objects are deep merged, the second over the first, which is useful
for a base configuration plus overrides:

```js
const seneca = Seneca(baseOptions, { tag: 'orders-test', log: 'silent' })
```

## Keep options in a file

Seneca loads `./seneca.options.js` automatically when it exists next to
the module that creates the instance (the file must export an object):

```js
// seneca.options.js
module.exports = {
  timeout: 5000,
  plugin: {
    tax: { rates: { EU: 0.2 } },
  },
}
```

Any other file can be named explicitly. A `.json` file is parsed as
Jsonic (comments and unquoted keys are allowed); a `.js` file is
required:

```js
const seneca = Seneca('./config/production.js')
// equivalent to
const seneca = Seneca({ from: './config/production.js' })
```

Options given in code override the file's values.

## Override from the environment

```sh
SENECA_OPTIONS='timeout:10000,log:info' node service.js
SENECA_TEST=true node service.js
SENECA_QUIET=true node service.js
```

`SENECA_OPTIONS` is a Jsonic string; nested keys work:
`SENECA_OPTIONS='plugin:{tax:{rates:{EU:0.21}}}'`.

## Override from the command line

```sh
node service.js --seneca.options=timeout:10000
node service.js --seneca.options.timeout=10000 --seneca.tag=blue
node service.js --seneca.options.from=./config/staging.js
node service.js --seneca.log=warn
```

Command line arguments have the highest precedence. The complete list is
in [Command line and environment](../reference/command-line-and-environment.md).

## Precedence

From lowest to highest: defaults, `seneca.options.js`, the `from`
file, the object passed to `Seneca()`, environment variables, command
line arguments. See [Option sources](../reference/command-line-and-environment.md#option-sources).

## Configure plugins

Plugin options come from three places, later ones winning:

1. The plugin's own `defaults`.
2. The instance option `plugin.<name>` (or `plugin['<name>$<tag>']` for a
   tagged plugin), which can be set from any of the sources above.
3. The second argument of `seneca.use(plugin, options)`.

```js
Seneca({ plugin: { tax: { precision: 3 } } }).use('tax', { rates: { US: 0.07 } })
```

After loading, `seneca.options().plugin.tax` holds the resolved options.
See [Plugin option resolution](../reference/plugins.md#option-resolution).

## Read and change options at runtime

```js
const opts = seneca.options()          // the resolved options object
console.log(opts.timeout)

seneca.options({ timeout: 8000 })      // deep merge, returns the options
seneca.options({ log: 'debug' }, true) // returns the instance for chaining
```

Changing `log` rebuilds the logger; changing `tag` updates the instance
identifier. Other changes take effect for later messages that read them
(for example `timeout` for messages submitted afterwards).

Options are also available to other processes and plugins through the
builtin action `sys:seneca,get:options` (ask for a section with `base`,
since scalar values cannot be returned under `strict.result`).

## Print the resolved options

```sh
node service.js --seneca.print.options
```

prints the options before plugins load and each plugin's options as it
loads. The option `debug.print.options: true` does the same from code.

## Validation

Options are validated against the reference shape. A misspelled key or
a wrong type fails at startup with an `invalid_options` error that names
the property. To accept arbitrary keys for your own use, put them under
`plugin.<name>` or in `internal`.
