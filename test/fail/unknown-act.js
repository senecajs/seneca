var seneca = require('../..')()

seneca.act({a: 1}, function (err) {
  console.log(err)
})
