var seneca = require('../../..')()

seneca.act({cmd: 'salestax', net: 100}, function (err, result) {
  if (err) return console.error(err)
  console.log(result.total)
})
