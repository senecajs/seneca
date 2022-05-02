const Seneca = require('..')


// const s0 = Seneca()
//       .ready(()=>console.log('READY'))
//       .sub('sys:seneca,on:point', (msg)=>console.log('ONP',msg))


const s0 = Seneca().test().add('a:1',(msg,reply)=>reply({x:msg.x}))
s0.act('a:1,x:1',s0.util.print)

async function run() {
  console.log(await s0.post('a:1,x:2'))
}

run()
