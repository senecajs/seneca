// Tutorial: Getting started, step 7.
const Seneca = require('../../..')

function math(options) {
  this.add('role:math,cmd:sum', function (msg, reply) {
    reply({ answer: msg.left + msg.right })
  })

  // Initialization runs before the next plugin loads and before ready()
  this.prepare(async function () {
    await new Promise((resolve) => setTimeout(resolve, 100))
    this.log.info('math is ready')
  })
}

const seneca = Seneca({ log: 'warn' }).use(math)

seneca.ready(function () {
  // this === seneca; every plugin has finished loading
  this.act('role:math,cmd:sum,left:1,right:1', function (err, result) {
    console.log(err, result) // null { answer: 2 }

    this.close(function (err) {
      console.log('closed', err || '')
    })
  })
})
