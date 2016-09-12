var seneca = require('../../..')()

seneca.add({cmd: 'config'}, function (args, callback) {
  var config = {
    rate: 0.23
  }
  var value = config[args.prop]
  callback(null, {value: value})
})

seneca.add({cmd: 'salestax'}, function (args, callback) {
  seneca.act({cmd: 'config', prop: 'rate'}, function (err, result) {
    if (err) return console.error(err)
    var rate = parseFloat(result.value)
    var total = args.net * (1 + rate)
    callback(null, {total: total})
  })
})

seneca.act({cmd: 'salestax', net: 100}, function (err, result) {
  if (err) return console.error(err)
  console.log(result.total)
})
