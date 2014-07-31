

module.exports = function( options ) {
  var seneca = this

  options = seneca.util.deepextend({
    color: 'red',
    box: {
      width:  100,
      height: 200
    }
  },options)


  this.add( {foo:'bar'}, function( args, done ){
    done( null, { color:      options.color, 
                  box_width:  options.box.width,
                  box_height: options.box.height
                } )
  })

  return {name:'foo'}
}

