// Tutorial: Getting started, step 5.
const Seneca = require('../../..')

async function main() {
  const seneca = Seneca({ log: 'warn' })

  seneca.message('role:math,cmd:sum', async function (msg) {
    return { answer: msg.left + msg.right }
  })

  seneca.message('role:math,cmd:average', async function (msg) {
    const { answer } = await this.post('role:math,cmd:sum', {
      left: msg.left,
      right: msg.right,
    })
    return { answer: answer / 2 }
  })

  await seneca.ready()

  const result = await seneca.post('role:math,cmd:average,left:4,right:8')
  console.log(result) // { answer: 6 }

  await seneca.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
