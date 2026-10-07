// Tutorial: Microservices with transports. Run second: node shop-client.js
const Seneca = require('../../..')

async function main() {
  const seneca = Seneca({ tag: 'client', log: 'warn' })
    .use('seneca-transport')
    .client({ type: 'web', port: 8260, pin: 'role:shop,cmd:*' })

  // Handle one case locally; everything else goes to the service through the prior
  seneca.add('role:shop,cmd:price', function (msg, reply) {
    if ('sample' === msg.item) {
      return reply({ item: 'sample', quantity: msg.quantity, total: 0 })
    }
    this.prior(msg, reply)
  })

  await seneca.ready()

  console.log(await seneca.post('role:shop,cmd:list'))
  console.log(await seneca.post('role:shop,cmd:price,item:apple,quantity:3'))
  console.log(await seneca.post('role:shop,cmd:price,item:sample,quantity:3'))

  await seneca.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
