require('../..')()
  .add( { generate:'id'},
        function( args, done ) {
          done( null, ''+Math.random() )
        })
  .listen()
