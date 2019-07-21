

var Seneca = require('..')

function ab(msg, reply) {
  reply({b:msg.b,x:msg.x})
}

var si = Seneca()
    .test()
    .add('a:1,b:1', ab)
    .add('a:1,b:2', ab)

si
  .act('a:1,b:1,x:1',si.util.print)
  .act('a:1,b:2,x:2',si.util.print)

  .ready(function() {
    function ac(msg, reply) {
      reply({c:msg.b,x:msg.x})
    }
    
    si.wrap('a:1',ac)

    si
      .act('a:1,b:1,x:3',si.util.print)
      .act('a:1,b:2,x:4',si.util.print)
  })
