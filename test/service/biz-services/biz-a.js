module.exports = function( args, done ) {
  done(null,{d:'a-'+args.d})
}
module.exports.pattern = 's:a'
