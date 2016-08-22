module.exports = function (options) {
  var seneca = this
  var plugin = 'shop'
  var country = options.country || 'IE'
  var rate = options.rate || 0.23

  var calc = function (net) {
    return net * (1 + rate)
  }

  seneca.add({ role: plugin, cmd: 'salestax', country: country }, function (args, callback) {
    var total = calc(parseFloat(args.net, 10))
    seneca.log.debug('apply-tax', args.net, total, rate, country)
    callback(null, { total: total })
  })

  seneca.add({ role: plugin, cmd: 'salestax' }, function (args, callback) {
    var total = calc(parseFloat(args.net, 10))
    seneca.log.debug('apply-tax', args.net, total, rate, country)
    callback(null, { total: total })
  })

  seneca.act({ role: 'web', use: {
    prefix: 'shop/',
    pin: { role: 'shop', cmd: '*' },
    map: {
      salestax: { GET: true }
    }
  }})

  return {
    name: plugin
  }
}
