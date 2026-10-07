// Tutorial: Writing a plugin. Using the plugin.
const Seneca = require('../../..') // in your project: require('seneca')
const tax = require('./tax')

async function main() {
  const seneca = Seneca({ log: 'warn' }).use(tax, {
    rates: { US: 0.07 },
    load: async () => ({ IE: 0.23 }),
  })

  await seneca.ready()

  console.log(await seneca.post('role:tax,cmd:rate,country:EU'))
  console.log(await seneca.post('role:tax,cmd:total,country:IE,net:100'))

  try {
    await seneca.post('role:tax,cmd:rate,country:XX')
  } catch (err) {
    console.log(err.code, '-', err.message)
  }

  console.log('exported rates:', seneca.export('tax/rates'))

  await seneca.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
