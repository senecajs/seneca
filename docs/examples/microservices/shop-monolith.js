// Tutorial: Microservices with transports. The same plugin, one process.
const Seneca = require('../../..')

function shop(options) {
  const prices = { apple: 0.5, pear: 0.75, ...options.prices }

  this.add('role:shop,cmd:price', function (msg, reply) {
    const price = prices[msg.item]
    if (null == price) {
      return reply(new Error('Unknown item: ' + msg.item))
    }
    reply({ item: msg.item, quantity: msg.quantity, total: price * msg.quantity })
  })
}

Seneca({ log: 'warn' })
  .use(shop)
  .act('role:shop,cmd:price,item:apple,quantity:3', Seneca.util.print)
// { item: 'apple', quantity: 3, total: 1.5 }
