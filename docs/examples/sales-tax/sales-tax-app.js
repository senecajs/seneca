var Connect = require('connect')
var Connect_query = require('connect-query')
var Body_parser = require('body-parser')

var seneca = require('../../..')()

seneca.use('sales-tax-plugin', {country: 'IE', rate: 0.23})
seneca.use('sales-tax-plugin', {country: 'UK', rate: 0.20})
seneca.use('sales-tax-plugin', {country: '*', rate: 0.25})

seneca.ready(function () {
  var app = Connect()
  app.use(Connect_query())
  app.use(Body_parser.json())

  app.use(function(req, res) {
    seneca.act(
      {
        role: 'shop',
        cmd: 'salestax',
        country: req.query.country,
        net: req.query.net
      },
      function(err, out) {
        res.end(JSON.stringify(err || out))
      }
    )
  })
  
  app.listen(3000)
})
