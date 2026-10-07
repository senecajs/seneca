// Tutorial: Getting started, step 4.
const Seneca = require('../../..')

const seneca = Seneca({ log: 'warn' })

seneca.add({ role: 'math', cmd: 'product' }, function (msg, reply) {
  reply({ answer: msg.left * msg.right })
})

// Pattern as a string, data as an object
seneca.act('role:math,cmd:product', { left: 3, right: 4 }, Seneca.util.print)
// { answer: 12 }

// Everything in one string (Jsonic syntax)
seneca.act('role:math,cmd:product,left:3,right:5', Seneca.util.print)
// { answer: 15 }

// Everything in one object
seneca.act({ role: 'math', cmd: 'product', left: 3, right: 6 }, Seneca.util.print)
// { answer: 18 }
