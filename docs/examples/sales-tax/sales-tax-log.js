var seneca = require('../../..')()

seneca.use('sales-tax-plugin', {country: 'IE', rate: 0.23})
seneca.use('sales-tax-plugin', {country: 'UK', rate: 0.20})

seneca.ready(function (err) {
  if (err) return process.exit(!console.error(err))

  seneca.act({role: 'shop', cmd: 'salestax', country: 'IE', net: 100})
  seneca.act({role: 'shop', cmd: 'salestax', country: 'UK', net: 200})
  seneca.act({role: 'shop', cmd: 'salestax', country: 'UK', net: 300})
})
