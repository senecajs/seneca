# Test-only gubu stand-in

Seneca 4 validates with [shape](https://github.com/rjrodger/shape), which does
not accept shapes built with gubu. The published `seneca-entity` and
`seneca-mem-store`, used by the entity tests, still build their option shapes
with gubu, so they fail to load on Seneca 4.

`register.js` (loaded by `npm test` with `--require`) resolves
`require('gubu')` from those two plugins to `index.js`, which is shape under
gubu's export names. Nothing else is affected, and nothing here is published.

Delete this directory and the `--require` flag in `package.json` once both
plugins depend on shape.
