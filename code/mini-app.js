var seneca = require('seneca')()
seneca.use( 'mini', {say:'hello'} )
seneca.act( {foo:'bar'}, function( err, out ){
  console.log( out.say )
})
