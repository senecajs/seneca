module.exports = function( options ) {
  this.add( 'foo:1,cmd:a', function(args,done){
    done(null,{bar:args.bar})
  })
}
