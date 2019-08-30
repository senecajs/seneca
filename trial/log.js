

var Seneca = require('..')

function ab(msg, reply) {
  var x = msg.x
  var y = 0
  if(2===x) {
    this.log.info('ab-x', x)
  }
  else if(3===x) {
    this.act('c:1',{x:x},function(err, out) {
      reply(err || {b:msg.b,x:x,y:out.y})
    })
    return
  }

  reply({b:msg.b,x:x,y:y})
}

function c(msg, reply) {
  reply({y:1})
}

function d(msg, reply) {
  throw new Error('foo')
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

  .add('c:1', c)
  .act('a:1,b:1,x:3')


  .add('d:1', d)
  .act('d:1')

  .log.info('info-zero', {zero:0})

  .listen(9000)
  .client(9000)
  .use('repl')
