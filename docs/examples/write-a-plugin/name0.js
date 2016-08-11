

var plugin = function( options ) {

  this.add( {foo:'bar'}, function( args, done ){
    done( null, {color: options.color} )
  })

  return 'name0'
}

var seneca = require('../../..')()

seneca.use( plugin, {color:'pink'} )
seneca.act( {foo:'bar'}, console.log )
