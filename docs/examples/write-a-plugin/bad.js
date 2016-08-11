
function bad( options ) {
  
  this.log.info( 'would you like a cup of tea?' )

  this.log.error( 'something is almost, but not quite, correct' )

  
  this.add('role:bad, err:exception', function(args,done) {
    throw new Error('will it be my friend?')
  })

  this.add('role:bad, err:action', function(args,done) {
    done( new Error('not again...') )
  })

  this.add('role:bad, cmd:normal', function(args,done) {
    this.log.info( 'everything is cool and froody', options.color )
    done()
  })

}

var seneca = require('../../../lib/seneca.js')()

seneca.use( bad, {color:'intelligent blue'} )

seneca.act( 'role:bad, err:exception, improbability:infinite' )
//seneca.act( 'role:bad, err:action, question:meaning' )
//seneca.act( 'role:bad, cmd:normal, answer:42' )
