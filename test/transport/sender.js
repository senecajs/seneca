
var seneca = require('../..')

var si = seneca()


si.use('transport',{
  pins: [{ role:'echo' }] 
})



si.act({role:'echo',foo:111},function(err,res){
  if( err ) { console.log(err) }
  console.log('SENDER ECHO: '+JSON.stringify(res))
})

