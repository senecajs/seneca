'use strict'

module.exports = function (args, done) {
  done(null, {d: 'c-' + args.d})
}
module.exports.pattern = 's:c'
