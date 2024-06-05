const Seneca = require('../seneca')

run()

async function run() {
  let s0 = Seneca({
    legacy: false,
  })
      .test()
      .add({ a: 1 }, function a1(msg, reply) {
        reply({ x: msg.x })
      })
      .act('a:1,x:1', Seneca.util.print)
  console.log('AAA', s0.root.private$.cleared, s0.root.private$.ge.isclear())
  
  const r0 = await s0.ready()
  console.log('r0', r0)
  console.log('BBB', s0.root.private$.cleared, s0.root.private$.ge.isclear())
}

