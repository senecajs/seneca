
var connect       = require('connect')
var connect_query = require('connect-query')
var body_parser   = require('body-parser')

var seneca = require('../..')()
seneca.use( 'sales-tax-plugin', {rate:0.23} )

seneca.act('role:shop,cmd:salestax,net:100',function(err,out){
  if( err) return process.exit(!console.error(err));
  this.log.debug('test',out.total)
})

var app = connect()

app.use( connect_query() )
app.use( body_parser.json() )
app.use( seneca.export('web') )

app.listen(3000)


