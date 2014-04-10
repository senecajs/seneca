
var connect = require('connect')

var seneca = require('../..')()
seneca.use( 'sales-tax-plugin', {rate:0.23} )

seneca.ready(function(err){
  if( err ) return process.exit(!console.error(err));

  seneca.act('role:shop,cmd:salestax,net:100',function(err,out){
    if( err) return process.exit(!console.error(err));
    this.log.debug('test',out.total)
  })

  var app = connect()

  app.use( connect.query() )
  app.use( connect.json() )
  app.use( seneca.export('web') )

  app.listen(3000)
})

