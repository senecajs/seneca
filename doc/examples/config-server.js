
var seneca = require('../..')()

seneca.add( {cmd:'config'}, function(args,callback){
  var config = {
    rate: 0.23
  }
  var value = config[args.prop]
  callback(null,{value:value})
})


seneca.use('transport')

var connect = require('connect')
var app = connect()
  .use( connect.json() )
  .use( seneca.service() )
  .listen(10171)

