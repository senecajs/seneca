// Tutorial: Getting started, step 3.
const Seneca = require('../../..')

const seneca = Seneca({ log: 'warn' })

seneca.add('role:math,cmd:sum', function (msg, reply) {
  reply({ answer: msg.left + msg.right })
})

// More specific: only when the message has integer:true
seneca.add('role:math,cmd:sum,integer:true', function (msg, reply) {
  reply({ answer: Math.floor(msg.left) + Math.floor(msg.right) })
})

// Seneca.util.print is a ready-made callback that prints the error or the result
seneca.act('role:math,cmd:sum,left:1.5,right:2.5', Seneca.util.print)
// { answer: 4 }

seneca.act('role:math,cmd:sum,left:1.5,right:2.5,integer:true', Seneca.util.print)
// { answer: 3 }
