var connect = require('connect')
var connect_query = require('connect-query')
var body_parser = require('body-parser')

var seneca = require('../..')()

seneca.use('sales-tax-plugin', {country: 'IE', rate: 0.23})
seneca.use('sales-tax-plugin', {country: 'UK', rate: 0.20})
seneca.use('sales-tax-plugin', {country: '*', rate: 0.25})

var app = connect()

app.use(connect_query())
app.use(body_parser.json())
app.use(seneca.export('web'))

app.listen(3000)

// Uncomment these two lines to use the admin console
// seneca.use('data-editor')
// seneca.use('admin', {server: app, local: true})
