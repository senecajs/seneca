// Tutorial: Getting started, step 6.
const Seneca = require('../../..')

function math(options) {
  this.add('role:math,cmd:sum', function (msg, reply) {
    reply({ answer: msg.left + msg.right })
  })

  this.add('role:math,cmd:product', function (msg, reply) {
    reply({ answer: msg.left * msg.right })
  })
}

// Extends math: rounds every answer to the configured precision
function rounding(options) {
  this.add('role:math,cmd:sum', function (msg, reply) {
    this.prior(msg, function (err, result) {
      if (err) return reply(err)
      reply({ answer: Number(result.answer.toFixed(options.precision)) })
    })
  })
}

Seneca({ log: 'warn' })
  .use(math)
  .use(rounding, { precision: 2 })
  .act('role:math,cmd:sum,left:0.1,right:0.2', Seneca.util.print)
// { answer: 0.3 }
