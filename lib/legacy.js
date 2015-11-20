var _ = require('lodash')
var Eraro = require('eraro')
var Common = require('./common')
var Errors = require('./errors')

var internals = {
  error: Eraro({
    package: 'seneca',
    msgmap: Errors,
    override: true
  })
}

exports.fail = function make_legacy_fail (so) {
  return function () {
    var args = Common.arrayify(arguments)

    var cb = _.isFunction(arguments[arguments.length - 1])
      ? arguments[arguments.length - 1] : null

    if (cb) {
      args.pop()
    }

    if (_.isObject(args[0])) {
      var code = args[0].code
      if (_.isString(code)) {
        args.unshift(code)
      }
    }

    var err = internals.error.apply(null, args)
    err.callpoint = new Error().stack.match(/^.*\n.*\n\s*(.*)/)[1]
    err.seneca = { code: err.code, valmap: err.details }

    this.log.error(err)
    if (so.errhandler) {
      so.errhandler.call(this, err)
    }

    if (cb) {
      cb.call(this, err)
    }

    return err
  }
}
