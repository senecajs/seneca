var Assert = require('assert')

module.exports = bar
module.exports.defaults = {
  a: 1,
  b: Number,
}

function bar(opts) {
  Assert(opts.a === 1)
  Assert(opts.b === 2)
}
