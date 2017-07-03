var Seneca = require('../../../')

var color = process.argv[2] || 'red'

Seneca({tag: 'client'})
  // .test('print')

  .client({pin: {cmd: 'convert'}, port: 9090})

  .ready(function () {
    console.log('seneca instance '+this.id)

    var msg = {cmd: 'convert', color: color} 
    console.log('sending:', msg)

    this.act(msg, function (err, out) {
      console.log('response:', err || out)
    })
  })

