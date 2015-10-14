var client = require('../..')().client()

client.act({role: 'echo', foo: 1}, function (err, out) { console.log(err); console.dir(out) })
