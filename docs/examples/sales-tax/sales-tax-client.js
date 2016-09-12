var seneca = require('../../..')()

seneca.add({cmd: 'salestax'}, function (args, callback) {
  seneca.act({cmd: 'config', prop: 'rate'}, function (err, result) {
    if (err) return console.error(err)
    var rate = parseFloat(result.value)
    var total = args.net * (1 + rate)
    callback(null, {total: total})
  })
})

seneca.client()

seneca.ready(function () {
  seneca.add({cmd: 'sales-tax', net: 100}, function (err, result) {
    if (err) return console.error(err)
    console.log(result.total)
    seneca.close()
  })
})
