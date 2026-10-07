// Tutorial: Getting started, step 2.
const Seneca = require('../../..') // in your project: require('seneca')

const seneca = Seneca({ log: 'warn' })

seneca.add('role:math,cmd:sum', function (msg, reply) {
  reply({ answer: msg.left + msg.right })
})

seneca.act('role:math,cmd:sum,left:1,right:2', function (err, result) {
  if (err) throw err
  console.log(result) // { answer: 3 }
})
