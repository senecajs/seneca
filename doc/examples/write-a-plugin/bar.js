

module.exports = function( options ) {
  

  this.add( {foo:'bar', zed:options.zed}, function( args, done ){
    console.log(this)

    done( null, {color: options.color} )
  })

}

