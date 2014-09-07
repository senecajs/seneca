

module.exports = function( options ) {

  this.add( {foo:'bar'}, function( args, done ){
    done( null, {color: options.color} )
  })

}

