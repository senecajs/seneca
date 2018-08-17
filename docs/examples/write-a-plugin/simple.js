

var plugin = function( options ) {

  this.add( {foo:'bar'}, function( args, done ){
    done( null, {color: options.color} )
  })

}


var Seneca = require('../../..')

Seneca()
  .use( plugin, {color:'pink'} )
  .act( {foo:'bar'}, Seneca.util.print )
