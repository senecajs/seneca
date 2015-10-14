var nid = require('nid')

exports.random = function (args, done) {
  var len = args.len || 8
  done(null, {id: ('' + (Math.pow(10, len) * Math.abs(Math.random()))).substring(0, len)})
}

exports.nid = function (args, done) {
  done(null, {id: nid(args.len || 8)})
}
