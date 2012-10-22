
var seneca = require('../..')()

seneca.add( {cmd:'salestax'}, function(args,callback){
  var rate  = 0.23
  var total = args.net * (1+rate)
  callback(null,{total:total})
})

seneca.act( {cmd:'salestax', net:100}, function(err,result){
  console.log( result.total )
})

