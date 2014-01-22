
var seneca = require('../..')()

seneca.add( {cmd:'salestax'}, function(args,callback){
  seneca.act( {cmd:'config', prop:'rate'}, function(err,result){
    var rate  = parseFloat(result.value)
    var total = args.net * (1+rate)
    callback(null,{total:total})
  })
})

seneca.client()

var shop = seneca.pin({cmd:'*'})

shop.salestax({net:100}, function(err,result){
  console.log( result.total )
})

