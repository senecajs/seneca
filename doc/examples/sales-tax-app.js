
var http = require('http')

var seneca = require('../..')()
seneca.use( 'sales-tax-plugin', {country:'IE',rate:0.23} )
seneca.use( 'sales-tax-plugin', {country:'UK',rate:0.20} )

seneca.use('transport')

var server = http.createServer(seneca.service())
server.listen(3000)

seneca.use('admin',{server:server,local:true})




