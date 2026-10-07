# Error codes reference

Errors created by Seneca are `Error` objects with these properties:

| Property | Meaning |
| -------- | ------- |
| `code` | The error code from the table below. |
| `message` | `seneca: ` followed by the message template with its `<%=name%>` placeholders filled from `details`. |
| `details` | The values given when the error was created, plus `callpoint` in some cases. |
| `seneca` | `true`. |
| `package` | `'seneca'`. |
| `callpoint` | Location in the calling code. |
| `meta$` | Present on the error passed to the global error handler: the message meta data, with `meta$.err` describing the `act_execute` failure (`pattern`, `message`, `callpoint`) and `meta$.data` holding the original message. It is removed before the error reaches the `act` callback. |

Plugins define their own codes with the `errors` property of the
definition function; `this.fail(code, details)` and
`this.error(code, details)` inside the plugin use them.

An error thrown or replied by an action is delivered to the caller as
is: the `act` callback receives the original error object (whose
`code` is the plugin's or action's own, or undefined for a plain
`Error`), and its third argument is the message meta data, where
`meta.err` is the `act_execute` description and `meta.data` the
original message. A rejected `post` promise carries only the error.

## Codes

| Code | Raised when |
| ---- | ----------- |
| `act_not_found` | No action matches the message and no `default$` was given. |
| `act_default_bad` | No action matches and `default$` is not an object or array. |
| `act_execute` | An action threw or replied with an error (recorded in `err.meta$.err`; the error handler sees the original error). |
| `act_callback` | The callback given to `act` threw. |
| `act_invalid_msg` | The message failed the action's validation rules; `details.props` lists the failures. |
| `act_invalid_args` | Legacy variant of `act_invalid_msg`. |
| `act_loop` | Reserved. |
| `act_no_args` | `act` was called without a pattern. |
| `act_string_args_syntax` | The message string given to `act` is not valid Jsonic. |
| `act_if_expects_boolean` | `act_if` was called without a boolean first argument. |
| `action_timeout` | The action did not reply within the timeout; `details` has `timeout`, `start`, `end`, `pattern` and `message`. |
| `add_string_pattern_syntax` | The pattern string given to `add`, `sub` or `fix` is not valid Jsonic. |
| `add_pattern_object_expected` | `add` was called without a pattern. |
| `add_pattern_object_expected_after_string_pattern` | Unexpected argument after a pattern string. |
| `add_action_function_expected` | The action argument of `add` is not a function. |
| `add_action_metadata_not_an_object` | The action definition argument of `add` is not an object. |
| `add_empty_pattern` | The pattern given to `add` is empty. |
| `bad_jsonic` | A Jsonic string could not be parsed. |
| `bad_logspec` | The `log` option has an unsupported type. |
| `bad_logspec_string` | The `log` option string is not a level, abbreviation, number or logger name. |
| `bad_plugin_name` | The plugin name is not alphanumeric (`/^[a-zA-Z@][a-zA-Z0-9.~_\-/]*$/`) or longer than 1024 characters. |
| `bad_plugin_tag` | The plugin tag is not alphanumeric (`/^[a-zA-Z0-9.~_-]+$/`) or too long. |
| `closed` | A message was submitted to a closed instance. |
| `export_not_found` | `seneca.export(key)` found nothing and `strict.exports` is true. |
| `fail_cond_must_be_bool` | `seneca.fail(cond, code, details)` was given a non boolean condition. |
| `fail_wrong_number_of_args` | `seneca.fail` was called with more than three arguments. |
| `invalid_options` | The options failed validation. |
| `invalid_plugin_option` | Plugin options failed validation against the plugin's `defaults`. |
| `inverted_file_name` | A file `options.seneca.js` exists; the supported name is `seneca.options.js`. |
| `maxparents` | The chain of parent messages exceeds `limits.maxparents` (usually an action calling itself). |
| `missing_plugin_name` | `use` was given a plugin without a name. |
| `no_client` | Reserved. |
| `no_error_code` | `seneca.error` or `seneca.fail` was called without a code. |
| `no_options` | `seneca.options()` was given null or undefined. |
| `no_prior_action` | `seneca.prior` was called outside an action. |
| `no_transport_client` | Reserved (transports log `no-transport-client` instead). |
| `plugin_define_failed` | The plugin definition function threw. Fatal. |
| `plugin_init` | The plugin init action replied with an error. Fatal. |
| `plugin_init_timeout` | Defined for a plugin init action that does not reply within the timeout, but not produced: the completion code compares the code against `action-timeout` (hyphen) while the actual code is `action_timeout`, so a timed-out initialization is reported as a fatal `action_timeout` error (the message text also starts with the unfilled placeholder `undefined`). |
| `plugin_required` | `seneca.depends` found a missing plugin. Fatal. |
| `ready_failed` | A function given to `seneca.ready` threw. Fatal unless an error handler is set. |
| `require_default_options` | `seneca.options.js` exists but could not be loaded. |
| `require_options` | The `.js` options file given with `from` exists but failed to load (for example a syntax error). A missing `.js` file is ignored silently and the defaults are used; a missing `.json` file throws the file system `ENOENT` error. |
| `result_not_objarr` | An action replied with a value that is not an object or array and `strict.result` is true. |
| `store_cmd_missing` | Reserved for entity stores. |
| `sub_inward_action_failed` | A subscription function for inbound messages threw. |
| `sub_outward_action_failed` | A subscription function for outbound results threw. |
| `transport_client` | `seneca.client` failed. Fatal. |
| `transport_client_null` | The transport client hook replied with nothing. Fatal. |
| `transport_listen` | `seneca.listen` failed. Fatal. |
| `unknown_message_reply` | Reserved. |
| `unsupported_legacy_plugin` | The plugin definition function has the Seneca 2 signature `(options, register)`. Fatal. |
| `use_no_args` | `seneca.use` was called without arguments. |
| `test_msg`, `test_args`, `test_prop` | Used by the test suite. |

Plugin loading errors reported by the `use-plugin` module keep their own
codes, for example `plugin_not_found` (the named plugin module could not
be found) and `plugin_no_name`.

Fatal errors call `seneca.die`, which logs a `fatal` entry, calls the
error handler, closes the instance and exits the process with code 1 (or
2 if closing takes longer than `death_delay`). With `debug.undead` the
process keeps running.
