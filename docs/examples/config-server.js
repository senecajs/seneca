var seneca = require('../..')()

seneca.add({cmd: 'config'}, function (args, callback) {
  var config = {
    rate: 0.23
  }
  var value = config[args.prop]
  callback(null, {value: value})
})

seneca.listen()
