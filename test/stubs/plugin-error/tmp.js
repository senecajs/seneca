'use strict'

module.exports = function tmp (options) {
  this.add({ role: 'tmp', cmd: 'query' }, function (args, done) {
    if (args.test === 'true') {
      return done(new Error('Error was created!!'))
    }

    return done(null, { message: 'no errors created.' })
  })
}
