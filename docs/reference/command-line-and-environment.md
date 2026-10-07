# Command line arguments and environment variables

Seneca reads a small set of process arguments and environment variables
when an instance is created. They are merged into the options with the
highest precedence (see [Option sources](#option-sources)).

## Command line arguments

Arguments are parsed with [minimist](https://github.com/minimistjs/minimist),
so `--seneca.a.b=c` and `--seneca.a.b c` both set `a.b`. Values `true`
and `false` are converted to booleans.

| Argument | Effect |
| -------- | ------ |
| `--seneca.options=<jsonic>` | Options in [Jsonic](https://github.com/jsonicjs/jsonic) syntax, for example `--seneca.options=timeout:5000,tag:web`. |
| `--seneca.options.<key>=<value>` | Set a single option, for example `--seneca.options.timeout=5000`. |
| `--seneca.options.from=<path>` | Load an options file (`.js` or `.json`); other `--seneca.options.*` values override its contents. |
| `--seneca.options=print` | Print the resolved options at startup (sets `debug.print.options`). |
| `--seneca.print.options` | Print the resolved options at startup. |
| `--seneca.tag=<tag>` | Set the instance tag. |
| `--seneca.log=<spec>` | Logging specification: a level (`--seneca.log=warn`), an object (`--seneca.log=level:warn`), or a logger name (`--seneca.log=flat`). See [Logging](logging.md). |
| `--seneca.log.<level>` | Set the log level, for example `--seneca.log.warn` or `--seneca.log.level.warn`. Abbreviations work too: `--seneca.log.quiet`, `--seneca.log.silent`, `--seneca.log.any`, `--seneca.log.all`, `--seneca.log.print`, `--seneca.log.test`, `--seneca.log.standard`. |
| `--seneca.test` | Start in test mode (`seneca.test()`): readable logs, callpoints. |
| `--seneca.quiet` | Start in quiet mode (`seneca.quiet()`): no log output. |

The parsed `--seneca.*` arguments are available as `seneca.argv`.

Arguments are read from `process.argv`; the option `debug.argv` provides
an array to use instead (the first two entries are skipped, as with
`process.argv`), which is how tests exercise argument handling.

## Environment variables

| Variable | Effect |
| -------- | ------ |
| `SENECA_OPTIONS` | Options in Jsonic syntax, for example `SENECA_OPTIONS='timeout:5000,log:warn'`. |
| `SENECA_TEST` | `true` starts in test mode. |
| `SENECA_QUIET` | `true` starts in quiet mode. |

Variables are read from `process.env`; the option `debug.env` provides an
object to use instead.

## Options files

* `./seneca.options.js` in the directory of the module that created the
  instance is loaded automatically when it exists. It must export an
  options object.
* `./options.seneca.js` is rejected at startup (`inverted_file_name`), to
  catch the common transposition.
* Any file can be loaded with the `from` option, `Seneca('path')`, or
  `--seneca.options.from=path`. A `.json` file is parsed as Jsonic (so
  comments and unquoted keys are allowed); a `.js` file is required as a
  module. A bare file name is resolved against the current working
  directory.

## Option sources

Values are combined in this order; later sources override earlier ones:

1. Defaults (see [Options](options.md)).
2. `./seneca.options.js`.
3. Options set previously with `seneca.options()` (when reloading).
4. The file named by `from`.
5. The object passed to `Seneca(...)`.
6. `legacy: false` adjustments.
7. Environment variables.
8. Command line arguments.

Options passed to `Seneca(a, b)` are deep merged (`b` over `a`) before
step 5.
