'use strict'

module.exports = function api (options) {
  this.add({ role: 'api', cmd: 'tmpQuery' }, function (args, done) {
    this.act(({ role: 'tmp', cmd: 'query', test: args.test }), function (err, res) {
      if (err) {
        return done(null, { message: 'error caught!' })
      }

      return done(null, res)
    })
  })
}
