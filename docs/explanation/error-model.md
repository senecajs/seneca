# The error model

Seneca distinguishes three kinds of failure and treats each differently.
Knowing which kind a failure is tells you where it will show up and how
to handle it.

## Action errors

An action fails when it throws, replies with an `Error`, or does not
reply within its timeout. This is the ordinary, expected kind of
failure: a lookup that finds nothing, invalid input, a remote service
that is down.

Action errors travel back to the caller like results: the `act`
callback receives the error as its first argument (and the meta data as
its third, with `meta.err` describing the failure), and a `post` promise
rejects with it. The error object is the one the action produced, so
plugins can define their own codes and messages (`this.fail(code,
details)` with a plugin `errors` map) and callers can switch on
`err.code`.

Action errors are also logged at level `error` (`act/ERR` entries),
emitted as `act-err` events, and passed to the global error handler if
one is set. The error handler may claim an error by returning a truthy
value, in which case the caller's callback is not called. This lets a
test fail fast on unexpected errors, and lets an application centralize
error reporting, but it is easy to misuse: a handler that returns a
value by accident silently swallows replies.

Related failures handled the same way: no action matched
(`act_not_found`), validation failed (`act_invalid_msg`), the result was
not an object (`result_not_objarr`), the instance is closed (`closed`),
the parent chain is too deep (`maxparents`).

## Fatal errors

Some failures mean the process cannot do its job: a plugin failed to
define or initialize, a dependency is missing, a `ready` function threw,
a transport could not start, or a message carried `fatal$` and failed.
These call `seneca.die`, which:

1. logs a `fatal` entry and prints a report (in test mode) with the
   error, the instance, the details, the stack and the process
   information;
2. calls the error handler;
3. sends `sys:seneca,info:fatal` and closes the instance, so that
   transports release their ports and plugins run their shutdown
   stages;
4. exits the process with code 1 once closing is done, or with code 2
   if closing takes longer than `death_delay`.

A failing plugin is fatal on purpose. A service that starts without one
of its plugins would accept messages it cannot handle correctly; it is
better for the process to stop and for a supervisor to restart or
report it.

For tests, `debug.undead` turns fatal errors into ordinary calls of the
error handler, so that fatal paths can be asserted without the process
exiting. Seneca releases the plugin definition gate in that case, so
later plugins and messages still proceed.

## Callback errors

If the caller's own callback throws, the failure belongs to the caller,
not the action. Seneca logs it, emits `act-err` with kind `callback`,
wraps it as `act_callback`, and passes it to the error handler. It is
not sent back into the action.

## Where to handle what

| Failure | Handle it with |
| ------- | -------------- |
| Expected business failures | Reply with an error carrying a `code`; callers inspect `err.code`. |
| Unexpected action failures | A global error handler (`seneca.error(fn)`) that reports, plus the `act/ERR` logs. |
| Misconfiguration, missing plugins | Let them be fatal; fix the configuration. Use `debug.undead` only in tests. |
| Slow dependencies | `timeout` and `timeout$`; the caller gets `action_timeout`. |
| Invalid messages | Validation rules in the pattern; the caller gets `act_invalid_msg` with the failing properties. |

See the how-to guide [Handle errors](../how-to/handle-errors.md) and the
[Error codes reference](../reference/error-codes.md).
