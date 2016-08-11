

var plugin = function name1( options ) {

  this.add( {foo:'bar'}, function( args, done ){
    done( null, {color: options.color} )
  })
}

var seneca = require('../../..')()

seneca.use( plugin, {color:'pink'} )
seneca.act( {foo:'bar'}, console.log )
