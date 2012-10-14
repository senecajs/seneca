var seneca = require('../..')()

seneca.add({role:'math', cmd:'product'}, function(args,callback) {
  var product = args.left * args.right
  callback(null,{answer:product})
})

seneca.use('transport')

var connect = require('connect')
var app = connect()
  .use( connect.json() )
  .use( seneca.service() )
  .listen(10171)