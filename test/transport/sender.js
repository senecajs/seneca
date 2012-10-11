
var seneca = require('../../lib/seneca');

var si = seneca({})

si.use('transport',{
  pins: [
    { on:'echo' },
  }] 
})



si.act({on:'echo',foo:111},function(err,res){
  console.log('SENDER ECHO: '+err+JSON.stringify(res))
})

