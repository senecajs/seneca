const Seneca = require('..')


const s0 = Seneca()
      .ready(()=>console.log('READY'))
      .sub('sys:seneca,on:point', (msg)=>console.log('ONP',msg))
