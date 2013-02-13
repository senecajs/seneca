
var seneca = require('../..')

// need this to get a reference to seneca.loghandler
seneca = seneca({
  log:{
    map:[
      {plugin:'sales-tax',handler:'print'},
      {level:'all',handler:seneca.loghandler.file('salestax.log')}
    ]
  }
})

seneca.use( 'sales-tax-plugin', {country:'IE',rate:0.23} )
seneca.use( 'sales-tax-plugin', {country:'UK',rate:0.20} )

seneca.act( {cmd:'salestax', country:'IE', net:100})
seneca.act( {cmd:'salestax', country:'UK', net:200})
seneca.act( {cmd:'salestax', country:'UK', net:300})


