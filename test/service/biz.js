module.exports = function () {
  this.add('s:a', function (args, done) { done(null, {d: 'a-' + args.d}) })
  this.add('s:b', function (args, done) { done(null, {d: 'b-' + args.d}) })
  this.add('s:c', function (args, done) { done(null, {d: 'c-' + args.d}) })
}
