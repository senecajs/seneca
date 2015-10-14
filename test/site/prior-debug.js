var seneca = require('../..')()

seneca
  .add('a:1', function (msg, respond) {
    respond(null, { a: 1 })
  })

  .add('a:1,b:2', function (msg, respond) {
    this.prior(msg, function (err, out) {
      out.b = 2
      respond(err, out)
    })
  })

  .add('a:1,b:2,c:3', function (msg, respond) {
    this.prior(msg, function (err, out) {
      out.c = 3
      respond(err, out)
    })
  })

  .act('a:1,b:2,c:3', console.log)
