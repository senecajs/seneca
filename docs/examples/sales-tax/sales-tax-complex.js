var seneca = require('../../..')()

// fixed rate
seneca.add({cmd: 'salestax'}, function (args, callback) {
  var rate = 0.23
  var total = args.net * (1 + rate)
  callback(null, {total: total})
})

// local rates
seneca.add({cmd: 'salestax', country: 'US'}, function (args, callback) {
  var state = {
    'NY': 0.04,
    'CA': 0.0625
  // ...
  }
  var rate = state[args.state]
  var total = args.net * (1 + rate)
  callback(null, {total: total})
})

// categories
seneca.add({cmd: 'salestax', country: 'IE'}, function (args, callback) {
  var category = {
    'top': 0.23,
    'reduced': 0.135
  // ...
  }
  var rate = category[args.category]
  var total = args.net * (1 + rate)
  callback(null, {total: total})
})

seneca.act('cmd:salestax,net:100,country:DE', function (err, result) {
  if (err) return console.error(err)
  console.log('DE: ' + result.total)
})

seneca.act('cmd:salestax,net:100,country:US,state:NY', function (err, result) {
  if (err) return console.error(err)
  console.log('US,NY: ' + result.total)
})

seneca.act('cmd:salestax,net:100,country:IE,category:reduced', function (err, result) {
  if (err) return console.error(err)
  console.log('IE: ' + result.total)
})
