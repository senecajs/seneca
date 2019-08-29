

var Seneca = require('..')

function ab(msg, reply) {
  reply({b:msg.b,x:msg.x})
}

var si = Seneca()

si
    .use(function a2() {
      this
        .add('a:2,b:1', ab)
        .add('a:2,b:2', ab)
    })

    .add('a:1,b:1', ab)
    .add('a:1,b:2', ab)

    .act('a:1,b:1,x:1')
    .act('a:1,b:2,x:2')
    .act('a:2,b:1,x:1')
    .act('a:2,b:2,x:2')


