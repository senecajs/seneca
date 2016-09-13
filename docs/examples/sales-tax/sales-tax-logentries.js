var Logentries = require('node-logentries')

var log = Logentries.logger({
  token: 'YOUR_TOKEN',

  // redefine log levels to match the ones seneca uses
  levels: {debug: 0, info: 1, warn: 2, error: 3, fatal: 4}
})

var seneca = require('../..')({
  log: {
    map: [
      {level: 'all', handler: function () {
        log.log(arguments[1], Array.prototype.join.call(arguments, '\t'))
      }}
    ]
  }
})

seneca.use('sales-tax-plugin', {rate: 0.23})

seneca.ready(function (err) {
  if (err) return process.exit(!console.error(err))

  seneca.act({role: 'shop', cmd: 'salestax', net: 100})
  seneca.act({role: 'shop', cmd: 'salestax', net: 200})
  seneca.act({role: 'shop', cmd: 'salestax', net: 300})
})
