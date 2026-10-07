// Tutorial: Microservices with transports. Run first: node shop-service.js
const Seneca = require('../../..') // in your project: require('seneca')

function shop(options) {
  const prices = { apple: 0.5, pear: 0.75, ...options.prices }

  this.add('role:shop,cmd:price', function (msg, reply) {
    const price = prices[msg.item]
    if (null == price) {
      return reply(new Error('Unknown item: ' + msg.item))
    }
    reply({ item: msg.item, quantity: msg.quantity, total: price * msg.quantity })
  })

  this.add('role:shop,cmd:list', function (msg, reply) {
    reply({ items: Object.keys(prices) })
  })
}

Seneca({ tag: 'shop' })
  .use(shop, { prices: { plum: 1.0 } })
  .use('seneca-transport')
  .listen({ type: 'web', port: 8260, pin: 'role:shop,cmd:*' })
  .ready(function () {
    console.log('shop service listening on port 8260 as ' + this.id)
  })
