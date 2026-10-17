// A plugin written against the public types.

import Seneca from 'seneca'

const shop: Seneca.PluginDefine = function shop(options: { currency: string }) {
  const seneca: Seneca.Instance = this
  seneca.message('role:shop,cmd:price', async function (msg) {
    return { total: msg.price * 1.2, currency: options.currency }
  })
  this.prepare(async function () {})
  this.destroy(async function () {})
}

const desc: Seneca.PluginDesc = {
  name: 'shop',
  define: shop,
  defaults: ({ valid }) => ({ currency: valid.Default('EUR', String) }),
}

Seneca().use(desc, { currency: 'USD' }).use(shop).use('seneca-transport')

// @ts-expect-error: a plugin is a name, a function or a description
Seneca().use(42)
