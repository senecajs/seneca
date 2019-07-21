

var Seneca = require('..')

function ab(msg, reply) {
  reply({b:msg.b,x:msg.x,y:1})
}

Seneca({legacy:{transport:false}})
    .add('a:1,b:1', ab)
    .add('a:1,b:2', ab)
    .client({pin:'a:1',override:true})
    .ready( function() {
      this
        .act('a:1,b:1,x:1',this.util.print)
        .act('a:1,b:2,x:2',this.util.print)
        .act('a:1,b:3,x:3',this.util.print)
    })
