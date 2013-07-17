var seneca = require('seneca')()

seneca.add( {foo:'bar'}, function( args, done ){
  done( null, { zoo:args.zoo } )
})

seneca.act( {foo:'bar', zoo:'qaz'}, function( err, out ){
  // prints 'qaz'
  console.log( out.zoo )
})
