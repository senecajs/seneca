const Seneca = require('../seneca')


let s0 = Seneca({
  legacy: false,
})
  .test()
  .add({ a: 1 }, function a1(msg, reply) {
    reply({ x: msg.x })
  })
  .ready(function () {

    console.log('AAA')
    
    this.act('a:1,x:2', {direct$:true}, function (err, out) {
      console.log('OUT',out)
    })

    console.log('BBB')
  })
