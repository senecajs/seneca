
function zed( options ) {
  console.log( this.options() )
}

var seneca = require('../../../lib/seneca.js')()

seneca.use( zed )
