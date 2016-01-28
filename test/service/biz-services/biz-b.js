'use strict'

module.exports = function (args, done) {
  done(null, {d: 'b-' + args.d})
}
module.exports.pattern = 's:b'
