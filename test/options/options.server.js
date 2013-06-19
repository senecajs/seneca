var connect = require('connect')

var app = connect()
app.use(function(req,res,next){
  res.writeHead(200)
  res.end(JSON.stringify({"web":{"test":"web"}}))
})
app.listen(62626)
console.log('ready')

setTimeout(process.exit,3000)
