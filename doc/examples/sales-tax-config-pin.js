
var seneca = require('../..')()

seneca.add( {cmd:'config'}, function(args,callback){
  var config = {
    rate: 0.23
  }
  var value = config[args.prop]
  callback(null,{value:value})
})

seneca.add( {cmd:'salestax'}, function(args,callback){
  seneca.act( {cmd:'config', prop:'rate'}, function(err,result){
    var rate  = parseFloat(result.value)
    var total = args.net * (1+rate)
    callback(null,{total:total})
  })
})


var shop = seneca.pin({cmd:'*'})

shop.salestax({net:100}, function(err,result){
  console.log( result.total )
})



