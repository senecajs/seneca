var version = process.argv[2]

var Seneca = require(version === 'old' ? '../../seneca-main' : '..')

Seneca({
  legacy: {
    transport: 'old' === version 
  }
})
  .add('a:1', function (msg, reply) {
    reply({x: msg.x})
  })
  .listen()
