
function zed( options ) {
  console.log( this.context.name, this.context.tag, options )
}

var seneca = require('../../../lib/seneca.js')()

seneca.use( zed )
