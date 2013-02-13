
var seneca = require('../..')()
seneca.use( 'sales-tax-plugin', {country:'IE',rate:0.23} )
seneca.use( 'sales-tax-plugin', {country:'UK',rate:0.20} )

seneca.act( {cmd:'salestax', country:'IE', net:100})
seneca.act( {cmd:'salestax', country:'UK', net:200})
seneca.act( {cmd:'salestax', country:'UK', net:300})


