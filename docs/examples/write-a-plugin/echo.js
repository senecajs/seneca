

var seneca = require('../../..')()

seneca.use( 'seneca-echo' )
seneca.act( {role:'echo', foo:'bar'}, console.log )
