module.exports = function(seneca,done) {
  seneca
    .use('./subfolder/sf0')
    .ready(function() {
      done(this.export('sf0'))
    })
}

module.exports.module = module
