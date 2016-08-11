

var seneca = require('../../..')()

seneca.use( './foo.js', {color:'pink'} )

seneca.act( {foo:'bar'}, console.log )
