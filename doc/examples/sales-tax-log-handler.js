
var seneca = require('../..')

// need this to get a reference to seneca.loghandler
seneca = seneca({
  log:{
    map:[
      {plugin:'shop',handler:'print'},
      {level:'all',handler:seneca.loghandler.file('shop.log')}
    ]
  }
})

seneca.use( 'sales-tax-plugin', {rate:0.23} )

seneca.ready(function(err){
  if( err ) return process.exit(!console.error(err));

  seneca.act( {role:'shop', cmd:'salestax', net:100})
  seneca.act( {role:'shop', cmd:'salestax', net:200})
  seneca.act( {role:'shop', cmd:'salestax', net:300})
})
