require('..')()
  .add('a:1', function a (args) { this.good({x: args.x}) })
  .add('b:1', function b (args, done) {
    this.act('a:1', {x: args.x}, function (err, out) {
      done(err, {y: args.y, x: out.x})
    })
  })
  .add('c:1', function cz (args) { this.good({z: args.z}) })
  .add('c:1', function czz (args, done) {
    this.prior(args, function (e, o) {
      if (e) return done(e)
      o.z++
      done(null, o)
    })
  })
  .repl()
