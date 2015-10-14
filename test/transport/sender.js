var seneca = require('../..')

var si = seneca()

si.use('transport', {
  pins: [{ role: 'echo' }]
})

var args = {role: 'echo', foo: 111}

console.log('SENDING: ' + JSON.stringify(args))
si.act(args, function (err, res) {
  if (err) { console.log(err) }
  console.log('SENDER ECHO: ' + JSON.stringify(res))
})
