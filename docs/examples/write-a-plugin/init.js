
var seneca = require('../../..')()

var plugin = function ( options ) {

  seneca.add( {init:'pluginName'}, function( args, done ) {
    // do stuff, e.g.
    console.log('connecting to db...')
    setTimeout(function(){
      console.log('connected!')
      done()
    }, 1000)
  })

  this.add( {foo:'bar'}, function( args, done ) {
    done( null, {color: options.color} )
  })

  return 'pluginName'
}

seneca.use( plugin, {color:'pink'} )

seneca.act( {foo:'bar'}, console.log )
