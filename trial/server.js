

var Seneca = require('..')

function ab(msg, reply) {
  reply({b:msg.b,x:msg.x})
}

Seneca({legacy:{transport:false}})
  .add('a:1,b:1', ab)
  .add('a:1,b:2', ab)
  .add('a:1,b:3', ab)
  .listen()
