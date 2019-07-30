const Seneca = require('../../..')
const Loader = require('./subfolder/loader')

var seneca

if(require.main === module) {
  seneca = Seneca().test()
  subfolder(console.log)
}
else {
  seneca = Seneca({internal:{module:Loader.module}}).test()
  // seneca = Seneca()
}

module.exports = subfolder

function subfolder(done) {
   Loader(seneca,done)
}
