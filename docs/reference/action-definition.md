# Action definition reference

`seneca.add` creates an *action definition* for each pattern. It is
returned by `seneca.find(pattern)` and passed to delegate hooks and
action modifiers.

| Field | Meaning |
| ----- | ------- |
| `id` | Unique identifier: `<plugin fullname>/<action name>/<counter>`, for example `root$/action/3` or `shop$eu/get_price/12`. |
| `name` | Name of the action function, or `action` for anonymous functions. |
| `func` | The action function. |
| `pattern` | Canonical pattern string, for example `cmd:get,role:shop`. |
| `msgcanon` | Canonical pattern as an object. |
| `raw` | The pattern as given to `add`, including directives and rules. |
| `plugin` | `{ name, tag, fullname }` of the defining plugin; `root$` for actions added outside plugins. |
| `plugin_name`, `plugin_tag`, `plugin_fullname` | The same values as separate fields. |
| `priordef` | The action definition this one overrides (its prior), if any. |
| `priorpath` | Identifiers of the prior chain, separated by `;`. |
| `fixed` | Properties merged into every message (`fixed$`). |
| `custom` | Values merged into `meta.custom` (`custom$`). |
| `rules` | Validation rules taken from object and function valued pattern properties, and from the action function's `validate` property. |
| `shape` | Compiled [Shape](https://github.com/rjrodger/shape) shape used to validate messages, present when the pattern had rules. |
| `validate` | Function `(msg, done)` that validates messages when there is no `shape`; set by validator plugins from an action modifier. It calls `done` before it returns; `done(err)` with an error rejects the message with `act_invalid_msg`. |
| `sub` | True for subscription actions (`sub$`). |
| `client` | True for transport client actions (`client$`). |
| `client_pattern` | For client actions, the pattern the client was registered with. |
| `deprecate` | Deprecation notice (`deprecate$`). |
| `callpoint` | Where `add` was called, when `debug.callpoint` is on. |
| `handle` | Function taking over later `add` calls for the same pattern (used by transport clients with `makehandle`). |

Any other properties of the action definition object given as the last
argument of `seneca.add(pattern, action, actdef)` are kept, for example
`desc` for documentation tools.

Action modifiers (`seneca.private$.action_modifiers`) run on the next
tick after `add`, which is how an action function's `validate` property
can be defined after the `add` call and still be recorded in `rules`.

Message validation uses `shape` when it is present, and `validate` only
when there is no `shape`. A validator plugin that sets `validate` for an
action whose pattern has rules also deletes `shape`, see
[Write a validator plugin](../how-to/validate-messages-and-options.md#write-a-validator-plugin).
